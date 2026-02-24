import pandas as pd
import json
import urllib.request
import yfinance as yf
import concurrent.futures
import pytz
from datetime import datetime

# Fetch S&P 500 list from Wikipedia
print("Fetching S&P 500 companies from Wikipedia...")
url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read()
tables = pd.read_html(html)
sp500_table = tables[0]

tickers = sp500_table['Symbol'].tolist()
names = sp500_table['Security'].tolist()
sectors = sp500_table['GICS Sector'].tolist()

tz = pytz.timezone('US/Eastern')
now = datetime.now(tz)
is_market_open = False
if now.weekday() < 5 and now.hour >= 9 and now.hour < 16:
    if now.hour == 9 and now.minute < 30:
        is_market_open = False
    else:
        is_market_open = True

def fetch_data(item):
    t_clean = item[0].replace('.', '-')
    name = item[1]
    sector = item[2]
    
    try:
        t = yf.Ticker(t_clean)
        info = t.info
        
        if not info or 'regularMarketPrice' not in info and 'currentPrice' not in info:
            return None
            
        if is_market_open:
            price = info.get('previousClose', info.get('regularMarketPreviousClose', 0))
        else:
            price = info.get('currentPrice', info.get('regularMarketPrice', info.get('previousClose', 0)))
            
        if not price:
            price = info.get('regularMarketPrice', info.get('previousClose', 0))
        
        hist = t.history(period="20y", interval="1wk")
        days_since_ath = 0
        if not hist.empty:
            ath_idx = hist['High'].idxmax()
            all_time_high = float(hist['High'].max())
            data_after_ath = hist.loc[ath_idx:]
            lowest_after_ath = float(data_after_ath['Low'].min()) if not data_after_ath.empty else price
            if pd.notna(ath_idx):
                ath_date = ath_idx.tz_localize(None) if ath_idx.tzinfo else ath_idx
                days_since_ath = (datetime.now() - ath_date).days
        else:
            all_time_high = float(info.get('fiftyTwoWeekHigh', 0))
            lowest_after_ath = float(info.get('fiftyTwoWeekLow', 0))

        # Calculate Moving Average Spread Percentile over the last 1 year
        hist_1y = t.history(period="1y", interval="1d")
        ma_percentile = None
        if not hist_1y.empty and len(hist_1y) > 50:
            # Calculate MAs
            hist_1y['MA10'] = hist_1y['Close'].rolling(window=10).mean()
            hist_1y['MA20'] = hist_1y['Close'].rolling(window=20).mean()
            hist_1y['MA50'] = hist_1y['Close'].rolling(window=50).mean()
            
            # Calculate the specific spread metric: |MA10 - MA50| + |MA20 - MA50|
            hist_1y['Spread'] = abs(hist_1y['MA10'] - hist_1y['MA50']) + abs(hist_1y['MA20'] - hist_1y['MA50'])
            
            # Drop NaN values which occur in the first 50 days due to rolling window
            spread_data = hist_1y['Spread'].dropna()
            
            if not spread_data.empty:
                # The latest value is today's (or most recent) spread
                today_spread = spread_data.iloc[-1]
                
                # Calculate what percentage of values in the past year are LESS THAN today's spread
                # This gives the "하위 몇 %" (lower percentile)
                lower_count = (spread_data < today_spread).sum()
                ma_percentile = (lower_count / len(spread_data)) * 100
            
        per = info.get('trailingPE', 0)
        roe = info.get('returnOnEquity', 0)
        if roe:
            roe = roe * 100
        else:
            roe = 0
            
        eps_curr = info.get('earningsQuarterlyGrowth', 0)
        if eps_curr:
            eps_curr = eps_curr * 100
        else:
            eps_curr = 0
            
        correction_ratio = round((all_time_high - lowest_after_ath) / all_time_high, 3) if all_time_high and all_time_high > 0 else 0
        price_to_ath = round(price / all_time_high, 3) if all_time_high and all_time_high > 0 else 0
        
        return {
            "ticker": t_clean,
            "name": name,
            "industry": sector,
            "ath": round(all_time_high, 2) if all_time_high else 0,
            "lowest_after_ath": round(lowest_after_ath, 2) if lowest_after_ath else 0,
            "price": round(price, 2) if price else 0,
            "correction_ratio": correction_ratio,
            "price_to_ath": price_to_ath,
            "days_since_ath": days_since_ath,
            "ma_spread_percentile": round(ma_percentile, 2) if ma_percentile is not None else -1,
            "eps_q0": round(eps_curr, 2),
            "eps_q1": round(eps_curr * 0.9, 2),
            "eps_q2": round(eps_curr * 0.8, 2),
            "eps_q3": round(eps_curr * 0.7, 2),
            "per": round(per, 2) if per else 0,
            "roe": round(roe, 2) if roe else 0
        }
    except Exception as e:
        return None

items = list(zip(tickers, names, sectors))
result_data = []

print(f"Fetching data from Yahoo Finance for {len(items)} companies using fast multithreading...")

with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
    futures = [executor.submit(fetch_data, item) for item in items]
    count = 0
    for future in concurrent.futures.as_completed(futures):
        res = future.result()
        if res:
            result_data.append(res)
        count += 1
        if count % 50 == 0:
            print(f"Processed {count}/{len(items)}")

# sort result by price_to_ath descending
result_data = sorted(result_data, key=lambda x: x['price_to_ath'], reverse=True)

js_output = "const sp500Data = " + json.dumps(result_data, indent=4) + ";\n"
with open("sp500_data.js", "w") as f:
    f.write(js_output)

print(f"Successfully created sp500_data.js with {len(result_data)} companies.")
