import yahooquery as yq
import json

t = yq.Ticker('005930.KS')
d1 = t.summary_detail.get('005930.KS', {})
d2 = t.key_stats.get('005930.KS', {})
d3 = t.financial_data.get('005930.KS', {})

if isinstance(d1, str): d1 = {}
if isinstance(d2, str): d2 = {}
if isinstance(d3, str): d3 = {}

print("Samsung summary_detail:", [k for k in d1.keys() if 'eps' in k.lower() or 'earn' in k.lower() or 'growth' in k.lower()])
print("Samsung key_stats:", [k for k in d2.keys() if 'eps' in k.lower() or 'earn' in k.lower() or 'growth' in k.lower()])
print("Samsung financial_data:", [k for k in d3.keys() if 'eps' in k.lower() or 'earn' in k.lower() or 'growth' in k.lower()])

t2 = yq.Ticker('AAPL')
a1 = t2.summary_detail.get('AAPL', {})
a2 = t2.key_stats.get('AAPL', {})
a3 = t2.financial_data.get('AAPL', {})

if isinstance(a1, str): a1 = {}
if isinstance(a2, str): a2 = {}
if isinstance(a3, str): a3 = {}

print("AAPL summary_detail:", [k for k in a1.keys() if 'eps' in k.lower() or 'earn' in k.lower() or 'growth' in k.lower()])
print("AAPL key_stats:", [k for k in a2.keys() if 'eps' in k.lower() or 'earn' in k.lower() or 'growth' in k.lower()])
print("AAPL financial_data:", [k for k in a3.keys() if 'eps' in k.lower() or 'earn' in k.lower() or 'growth' in k.lower()])

print("Samsung PE:", d1.get('trailingPE'), d2.get('trailingPE'), d3.get('trailingPE'))
print("Samsung earnings:", d1.get('earningsGrowth'), d2.get('earningsGrowth'), d3.get('earningsGrowth'))

print("AAPL earnings:", a1.get('earningsGrowth'), a2.get('earningsQuarterlyGrowth'), a3.get('earningsGrowth'))
