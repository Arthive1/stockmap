import urllib.request
import pandas as pd

req = urllib.request.Request('https://en.wikipedia.org/wiki/Nasdaq-100', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read()
df = pd.read_html(html)[4]
print(df.columns)
