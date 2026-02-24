import FinanceDataReader as fdr
import yahooquery as yq
import concurrent.futures
import time

df = fdr.StockListing('NASDAQ')
tickers = df['Symbol'].tolist()
print("Total NASDAQ tickers:", len(tickers))

results = []
chunk_size = 500
chunks = [tickers[i:i+chunk_size] for i in range(0, len(tickers), chunk_size)]

for i, chunk in enumerate(chunks):
    t = yq.Ticker(chunk)
    sd = t.summary_detail
    for tk in chunk:
        try:
            d = sd.get(tk, {})
            if isinstance(d, dict):
                mc = d.get('marketCap', 0)
                if mc:
                    # also save name and industry, but let's just save mc first
                    results.append({'ticker': tk, 'marketCap': mc})
        except:
            pass
    print(f"Done chunk {i+1}/{len(chunks)}")

results.sort(key=lambda x: x['marketCap'], reverse=True)
print("Top 10 NASDAQ:", [r['ticker'] for r in results[:10]])
