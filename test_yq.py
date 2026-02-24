import yahooquery as yq

def test(ticker):
    t = yq.Ticker(ticker)
    s = t.summary_detail.get(ticker, {})
    ks = t.key_stats.get(ticker, {})
    fd = t.financial_data.get(ticker, {})
    print(f"\n--- {ticker} ---")
    if isinstance(s, str): s = {}
    if isinstance(ks, str): ks = {}
    if isinstance(fd, str): fd = {}
    
    per = s.get('trailingPE', ks.get('trailingPE', 0))
    roe = fd.get('returnOnEquity', ks.get('returnOnEquity', 0))
    eps = ks.get('earningsQuarterlyGrowth', fd.get('earningsGrowth', 0))
    
    print("PER:", per)
    print("ROE:", roe)
    print("EPS:", eps)

test('AAPL')
test('005930.KS')
test('XEL')
