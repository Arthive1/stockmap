import yfinance as yf
import time

print("Testing yfinance single requests with delay:")
for ticker in ['AAPL', 'MSFT', '005930.KS']:
    time.sleep(2)
    t = yf.Ticker(ticker)
    info = t.info
    print(ticker, "price:", info.get('currentPrice'), "eps:", info.get('earningsQuarterlyGrowth'))

