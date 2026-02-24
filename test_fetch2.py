import yfinance as yf
t = yf.Ticker('AAPL')
info = t.info
print('AAPL info keys:', info.keys() if info else 'None')
print('currentPrice' in info if info else False)

t = yf.Ticker('005930.KS')
info = t.info
print('Samsung info keys:', info.keys() if info else 'None')
print('currentPrice' in info if info else False)
