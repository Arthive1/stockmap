import yahooquery as yq
import FinanceDataReader as fdr

df = fdr.StockListing('KOSPI')
top30 = df.sort_values('Marcap', ascending=False).head(30)
tickers = (top30['Code'] + '.KS').tolist()

print("Fetching batch...")
t = yq.Ticker(tickers)
s = t.summary_detail
ks = t.key_stats
fd = t.financial_data
h1 = t.history(period="1y", interval="1d")
h20 = t.history(period="20y", interval="1wk")

print("KeyStats length:", len(ks))
print("1Y History:", h1.index.levels[0].tolist() if hasattr(h1, 'index') and hasattr(h1.index, 'levels') else "None")
