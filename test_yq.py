import yahooquery as yq
import pandas as pd
from datetime import datetime

t_clean = '005930.KS'
t = yq.Ticker(t_clean)
summary = t.summary_detail.get(t_clean, {})
key_stats = t.key_stats.get(t_clean, {})
fin_data = t.financial_data.get(t_clean, {})

print("Summary keys:", summary.keys())
print("Price:", summary.get('previousClose'))

hist = t.history(period="1y", interval="1d")
if isinstance(hist, pd.DataFrame):
    hist = hist.reset_index()
    print(hist.head())
    print("Columns:", hist.columns)

