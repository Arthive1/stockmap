import yahooquery as yq
import pandas as pd
import json

tickers = ['AAPL', 'MSFT', '005930.KS']
t = yq.Ticker(tickers)
h1 = t.history(period="1y", interval="1d")

for ticker in tickers:
    try:
        df = h1.loc[ticker]
        print(f"--- {ticker} ---")
        if len(df) > 50:
            df = df.copy()
            df['MA20'] = df['close'].rolling(window=20).mean()
            df['MA50'] = df['close'].rolling(window=50).mean()
            
            price = df['close'].iloc[-1]
            ma_20 = df['MA20'].iloc[-1]
            ma_50 = df['MA50'].iloc[-1]
            
            print(f"Price: {price}")
            print(f"MA20: {ma_20}")
            print(f"MA50: {ma_50}")
            
            ma_20_spread = (price - ma_20) / ma_20 if ma_20 > 0 else None
            ma_50_spread = (price - ma_50) / ma_50 if ma_50 > 0 else None
            
            print(f"MA20 Spread: {ma_20_spread}")
            print(f"MA50 Spread: {ma_50_spread}")
    except Exception as e:
        print(f"Error for {ticker}: {e}")
