import yfinance as yf
data = yf.download('AAPL', period='1d')
print(data)
