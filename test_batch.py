import yahooquery as yq

def test():
    tickers = ['AAPL', 'MSFT', '005930.KS', 'XEL']
    t = yq.Ticker(tickers)
    
    # Batch fetching all modules at once is faster than individual properties.
    # Actually, yq.Ticker(tickers).summary_detail fetches summaryDetail for all.
    summary = t.summary_detail
    key_stats = t.key_stats
    fin_data = t.financial_data
    history = t.history(period="1y", interval="1d")
    
    print("Summary:", {k: type(v) for k, v in summary.items()})
    print("KeyStats:", {k: type(v) for k, v in key_stats.items()})
    
    for ticker in tickers:
        s = summary.get(ticker, {})
        ks = key_stats.get(ticker, {})
        fd = fin_data.get(ticker, {})
        
        if isinstance(s, str): s = {}
        if isinstance(ks, str): ks = {}
        if isinstance(fd, str): fd = {}
        
        per = s.get('trailingPE', ks.get('trailingPE', 0))
        print(f"{ticker} PE:", per)

test()
