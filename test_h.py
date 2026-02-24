import yahooquery as yq
import pandas as pd

t = yq.Ticker(['AAPL', 'MSFT'])
h1 = t.history(period="1y", interval="1d")
print("Multiple tickers")
print(h1.loc['AAPL'].head(2))

t2 = yq.Ticker(['AAPL'])
h2 = t2.history(period="1y", interval="1d")
print("\nSingle ticker:")
print(h2.loc['AAPL'].head(2))

