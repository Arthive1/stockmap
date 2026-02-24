import pandas as pd
import json
import urllib.request
import yahooquery as yq
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

def process_market(name, items):
    result = []
    print(f"[{name}] Fetching data from Yahoo Finance for {len(items)} companies using batch requests...")
    
    chunk_size = 50
    for i in range(0, len(items), chunk_size):
        chunk = items[i:i + chunk_size]
        
        tickers = []
        ticker_to_item = {}
        for item in chunk:
            t_clean = str(item[0]).replace('.', '-')
            if t_clean.endswith('-KS'):
                t_clean = t_clean.replace('-KS', '.KS')
            tickers.append(t_clean)
            ticker_to_item[t_clean] = item
            
        t = yq.Ticker(tickers)
        
        try:
            summary = t.summary_detail
            key_stats = t.key_stats
            fin_data = t.financial_data
            h1 = t.history(period="1y", interval="1d")
            h20 = t.history(period="20y", interval="1wk")
        except Exception as e:
            print(f"Error fetching chunk {i}: {e}")
            continue

        for ticker in tickers:
            item = ticker_to_item[ticker]
            name_str = item[1]
            sector_str = item[2]
            
            s = summary.get(ticker, {}) if isinstance(summary, dict) else {}
            ks = key_stats.get(ticker, {}) if isinstance(key_stats, dict) else {}
            fd = fin_data.get(ticker, {}) if isinstance(fin_data, dict) else {}
            
            if isinstance(s, str): s = {}
            if isinstance(ks, str): ks = {}
            if isinstance(fd, str): fd = {}

            hist_1y_df = None
            hist_20y_df = None
            
            try:
                if isinstance(h1, pd.DataFrame) and ticker in h1.index.get_level_values(0):
                    hist_1y_df = h1.loc[ticker]
            except Exception:
                pass
                
            try:
                if isinstance(h20, pd.DataFrame) and ticker in h20.index.get_level_values(0):
                    hist_20y_df = h20.loc[ticker]
            except Exception:
                pass
                
            if hist_1y_df is None or hist_1y_df.empty or hist_20y_df is None or hist_20y_df.empty:
                continue
                
            # price
            price = hist_1y_df['close'].iloc[-1]
                
            # ATH 20y
            days_since_ath = 0
            if 'high' in hist_20y_df.columns:
                ath_idx = hist_20y_df['high'].idxmax()
                all_time_high = float(hist_20y_df['high'].max())
                data_after_ath = hist_20y_df.loc[ath_idx:]
                lowest_after_ath = float(data_after_ath['low'].min()) if not data_after_ath.empty else price
                
                if isinstance(ath_idx, pd.Timestamp):
                    ath_dt = ath_idx.tz_localize(None) if ath_idx.tzinfo else ath_idx
                else:
                    ath_dt = pd.to_datetime(str(ath_idx)).replace(tzinfo=None)
                days_since_ath = (datetime.now() - ath_dt).days
            else:
                all_time_high = price
                lowest_after_ath = price

            # Moving average
            ma_percentile = None
            if len(hist_1y_df) > 50:
                hist_1y_df = hist_1y_df.copy()
                hist_1y_df['MA10'] = hist_1y_df['close'].rolling(window=10).mean()
                hist_1y_df['MA20'] = hist_1y_df['close'].rolling(window=20).mean()
                hist_1y_df['MA50'] = hist_1y_df['close'].rolling(window=50).mean()
                hist_1y_df['Spread'] = abs(hist_1y_df['MA10'] - hist_1y_df['MA50']) + abs(hist_1y_df['MA20'] - hist_1y_df['MA50'])
                spread_data = hist_1y_df['Spread'].dropna()
                
                if not spread_data.empty:
                    today_spread = spread_data.iloc[-1]
                    lower_count = (spread_data < today_spread).sum()
                    ma_percentile = (lower_count / len(spread_data)) * 100
                    
            # PE
            per = s.get('trailingPE', ks.get('trailingPE'))
            if per is None or per == 0:
                per = s.get('forwardPE', ks.get('forwardPE', 0))
            if per is None: per = 0
            
            # ROE
            roe = fd.get('returnOnEquity', ks.get('returnOnEquity', 0))
            if roe is None: roe = 0
            if roe: roe = roe * 100
            else: roe = 0
            
            # EPS QQQ
            eps_curr = ks.get('earningsQuarterlyGrowth', fd.get('earningsGrowth', 0))
            if eps_curr is None: eps_curr = 0
            if eps_curr: eps_curr = eps_curr * 100
            else: eps_curr = 0
            
            correction_ratio = round((all_time_high - lowest_after_ath) / all_time_high, 3) if all_time_high and all_time_high > 0 else 0
            price_to_ath = round(price / all_time_high, 3) if all_time_high and all_time_high > 0 else 0
            
            result.append({
                "ticker": ticker,
                "name": name_str,
                "industry": sector_str,
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
            })
            
        print(f"[{name}] Processed up to {min(i + chunk_size, len(items))}/{len(items)}")
                
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

print("Successfully created market_data.js with batch loading logic.")
