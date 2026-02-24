import yfinance as yf
from fetch_all_data import fetch_data

print("Testing NASDAQ AAPL")
print(fetch_data(('AAPL', 'Apple', 'Tech')))
print("Testing KOSPI Samsung")
print(fetch_data(('005930.KS', 'Samsung', 'Tech')))
