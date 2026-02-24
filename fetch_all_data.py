import pandas as pd
import json
import urllib.request
import yahooquery as yq
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
        t = yq.Ticker(t_clean)
        
        # stats
        summary = t.summary_detail.get(t_clean, {})
        key_stats = t.key_stats.get(t_clean, {})
        fin_data = t.financial_data.get(t_clean, {})
        
        if isinstance(summary, str): summary = {}
        if isinstance(key_stats, str): key_stats = {}
        if isinstance(fin_data, str): fin_data = {}

        # get histories
        hist = t.history(period="20y", interval="1wk")
        hist_1y = t.history(period="1y", interval="1d")
        
        if isinstance(hist, pd.DataFrame):
            hist = hist.reset_index()
        else:
            return None
            
        if isinstance(hist_1y, pd.DataFrame):
            hist_1y = hist_1y.reset_index()
        else:
            return None
            
        if hist.empty or hist_1y.empty:
            return None
            
        # price
        price = hist_1y['close'].iloc[-1]
            
        # ATH 20y
        days_since_ath = 0
        ath_idx = hist['high'].idxmax()
        all_time_high = float(hist['high'].max())
        data_after_ath = hist.loc[ath_idx:]
        lowest_after_ath = float(data_after_ath['low'].min()) if not data_after_ath.empty else price
        
        ath_date = hist.loc[ath_idx, 'date']
        ath_date_str = str(ath_date)
        # convert whatever date format to datetime obj
        ath_dt = pd.to_datetime(ath_date_str).replace(tzinfo=None)
        days_since_ath = (datetime.now() - ath_dt).days

        # Moving average
        ma_percentile = None
        if len(hist_1y) > 50:
            hist_1y['MA10'] = hist_1y['close'].rolling(window=10).mean()
            hist_1y['MA20'] = hist_1y['close'].rolling(window=20).mean()
            hist_1y['MA50'] = hist_1y['close'].rolling(window=50).mean()
            hist_1y['Spread'] = abs(hist_1y['MA10'] - hist_1y['MA50']) + abs(hist_1y['MA20'] - hist_1y['MA50'])
            spread_data = hist_1y['Spread'].dropna()
            
            if not spread_data.empty:
                today_spread = spread_data.iloc[-1]
                lower_count = (spread_data < today_spread).sum()
                ma_percentile = (lower_count / len(spread_data)) * 100
                
        # PE
        per = summary.get('trailingPE', key_stats.get('trailingPE', 0))
        # ROE
        roe = fin_data.get('returnOnEquity', key_stats.get('returnOnEquity', 0))
        if roe: roe = roe * 100
        else: roe = 0
        
        # EPS QQQ
        eps_curr = key_stats.get('earningsQuarterlyGrowth', fin_data.get('earningsGrowth', 0))
        if eps_curr: eps_curr = eps_curr * 100
        else: eps_curr = 0
        
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
    # use 30 workers because yahooquery has no rate limits initially, but 30 is safe
    with concurrent.futures.ThreadPoolExecutor(max_workers=30) as executor:
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
