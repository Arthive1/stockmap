import FinanceDataReader as fdr
df = fdr.DataReader('AAPL', '2023-01-01')
print(df.head())
