import yahooquery as yq
import pandas as pd

tickers = ['AAPL', 'MSFT', '005930.KS']
t = yq.Ticker(tickers)
h1 = t.history(period="1y", interval="1d")

for ticker in tickers:
    try:
        df = h1.loc[ticker]
        print(f"Ticker: {ticker}, Length: {len(df)}")
        if len(df) > 50:
            df['MA20'] = df['close'].rolling(window=20).mean()
            df['MA50'] = df['close'].rolling(window=50).mean()
            
            ma_20_last = df['MA20'].iloc[-1]
            ma_20_prev = df['MA20'].iloc[-2]
            
            print(f"  MA20 Last: {ma_20_last}")
            print(f"  MA20 Prev: {ma_20_prev}")
            print(f"  Close Last: {df['close'].iloc[-1]}")
    except Exception as e:
        print(f"Error for {ticker}: {e}")
