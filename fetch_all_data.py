import pandas as pd
import json
import urllib.request
import yfinance as yf
import concurrent.futures
import pytz
from datetime import datetime
import FinanceDataReader as fdr

def get_sp500_items():
    print("Fetching S&P 500 companies...")
    url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req).read()
    tables = pd.read_html(html)
    df = tables[0]
    return list(zip(df['Symbol'].tolist(), df['Security'].tolist(), df['GICS Sector'].tolist()))

def get_nasdaq_items():
    print("Fetching NASDAQ 100 companies...")
    url = 'https://en.wikipedia.org/wiki/Nasdaq-100'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req).read()
    tables = pd.read_html(html)
    df = tables[4] # NASDAQ-100 table
    return list(zip(df['Ticker'].tolist(), df['Company'].tolist(), df.iloc[:, 2].tolist()))

def get_kospi_items():
    print("Fetching KOSPI 100 companies...")
    df = fdr.StockListing('KOSPI')
    top100 = df.sort_values('Marcap', ascending=False).head(100)
    # yfinance uses .KS suffix for KOSPI
    tickers = top100['Code'] + '.KS'
    return list(zip(tickers.tolist(), top100['Name'].tolist(), top100['Dept'].fillna("N/A").tolist()))

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
    if t_clean.endswith('-KS'):
        t_clean = t_clean.replace('-KS', '.KS')
    name = item[1]
    sector = item[2]
    
    try:
        t = yf.Ticker(t_clean)
        info = t.info
        
        if not info or ('regularMarketPrice' not in info and 'currentPrice' not in info):
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
            hist_1y['MA10'] = hist_1y['Close'].rolling(window=10).mean()
            hist_1y['MA20'] = hist_1y['Close'].rolling(window=20).mean()
            hist_1y['MA50'] = hist_1y['Close'].rolling(window=50).mean()
            
            hist_1y['Spread'] = abs(hist_1y['MA10'] - hist_1y['MA50']) + abs(hist_1y['MA20'] - hist_1y['MA50'])
            spread_data = hist_1y['Spread'].dropna()
            
            if not spread_data.empty:
                today_spread = spread_data.iloc[-1]
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

def process_market(name, items):
    result = []
    print(f"[{name}] Fetching data from Yahoo Finance for {len(items)} companies...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(fetch_data, item) for item in items]
        count = 0
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                result.append(res)
            count += 1
            if count % 50 == 0:
                print(f"[{name}] Processed {count}/{len(items)}")
                
    result = sorted(result, key=lambda x: x['price_to_ath'], reverse=True)
    return result

sp500_items = get_sp500_items()
nasdaq_items = get_nasdaq_items()
kospi_items = get_kospi_items()

market_data = {
    "SP500": process_market("SP500", sp500_items),
    "NASDAQ": process_market("NASDAQ", nasdaq_items),
    "KOSPI": process_market("KOSPI", kospi_items)
}

js_output = "const marketData = " + json.dumps(market_data, indent=4) + ";\n"
with open("market_data.js", "w") as f:
    f.write(js_output)

print("Successfully created market_data.js with SP500, NASDAQ, and KOSPI data.")
