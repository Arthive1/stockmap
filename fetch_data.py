import urllib.request
import json
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')

table = html.split('<table class="wikitable sortable"')[1].split('</table>')[0]
rows = table.split('<tr>')[2:]
res = []

for r in rows:
    cols = re.split('<td.*?>', r)
    if len(cols) > 3:
        ticker = re.sub('<.*?>', '', cols[1]).strip()
        name = re.sub('<.*?>', '', cols[2]).strip()
        sector = re.sub('<.*?>', '', cols[3]).strip()
        
        # skip if already added to avoid duplicates
        if any(s['ticker'] == ticker for s in res):
            continue
            
        res.append({
            'ticker': ticker,
            'name': name,
            'industry': sector
        })

# Save to JS file
js_content = "const sp500Tickers = " + json.dumps(res, indent=4) + ";\n"
with open('sp500_data.js', 'w') as f:
    f.write(js_content)

print(f"Successfully generated sp500_data.js with {len(res)} companies.")
