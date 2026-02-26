// We are now using the actual data from market_data.js which defines `marketData`
const mockMarketData = typeof marketData !== 'undefined' ? marketData : { "SP500": [], "NASDAQ": [], "KOSPI": [] };
let currentMarket = 'SP500';
let displayData = [...(mockMarketData[currentMarket] || [])];
let currentSortColumn = null;
let currentSortOrder = null; // 'desc', 'asc', or null

// Function to sort data
function sortData(column, order) {
    if (order === null) {
        displayData = [...(mockMarketData[currentMarket] || [])];
        return;
    }

    displayData.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        // String comparison
        if (typeof valA === 'string' && typeof valB === 'string') {
            return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        // Handle nulls or undefined values in numbers
        if (valA === undefined || valA === null) valA = -Infinity;
        if (valB === undefined || valB === null) valB = -Infinity;

        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
    });
}

// Helper for specific metric colors
function getCorrectionClass(val) {
    if (val > 0.50) return 'bg-orange';
    return '';
}
function getPriceToAthClass(val) {
    if (val >= 0.90) return 'bg-lightgreen';
    return '';
}
function getEpsClass(val) {
    if (val >= 20) return 'bg-lightgreen';
    return '';
}
function getRoeClass(val) {
    if (val >= 20) return 'bg-lightgreen';
    return '';
}
function getPerClass(val) {
    if (val > 50) return 'bg-orange';
    if (val >= 15 && val <= 50) return 'bg-lightgreen';
    return '';
}
function getDaysSinceAthClass(val) {
    if (val >= 40 && val <= 365) return 'bg-lightgreen';
    return '';
}
function getMaSpreadClass(val) {
    if (val >= -0.03 && val <= 0.03) return 'bg-lightgreen';
    return '';
}


// Function to calculate how many green cells a stock has
function getGreenCellCount(stock) {
    let count = 0;
    if (getPriceToAthClass(stock.price_to_ath)) count++;
    if (getDaysSinceAthClass(stock.days_since_ath)) count++;
    if (getMaSpreadClass(stock.ma_20_spread)) count++;
    if (getMaSpreadClass(stock.ma_50_spread)) count++;
    if (getMaSpreadClass(stock.ma_20_50_spread)) count++;
    if (getEpsClass(stock.eps_q0)) count++;
    if (getEpsClass(stock.eps_q1)) count++;
    if (getEpsClass(stock.eps_q2)) count++;
    if (getEpsClass(stock.eps_q3)) count++;
    if (getPerClass(stock.per) === 'bg-lightgreen') count++;
    if (getRoeClass(stock.roe)) count++;
    return count;
}

// Helper to get current price for a ticker
function getCurrentPrice(ticker) {
    if (typeof mockMarketData === 'undefined') return null;
    for (const market in mockMarketData) {
        const stock = mockMarketData[market].find(s => s.ticker === ticker);
        if (stock) return stock.price;
    }
    return null;
}

// Helper to format numbers and strings safely
function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    if (typeof num === 'string') return num;
    if (isNaN(num)) return '-';
    return Number.isInteger(num)
        ? num.toLocaleString('en-US')
        : num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Helper to format percentages
function formatPercent(num) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return (num * 100).toFixed(2) + '%';
}

// Function to render table
function renderTable(data) {
    const tableBody = document.getElementById('stockTableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="16" style="text-align:center; padding: 2rem;">검색 결과가 없습니다.</td></tr>';
        return;
    }

    data.forEach((stock, index) => {
        const row = document.createElement('tr');
        row.id = `row-${stock.ticker.toUpperCase()}`;

        row.innerHTML = `
            <td class="sticky-col index-col">${index + 1}</td>
            <td class="sticky-col ticker">${stock.ticker}</td>
            <td class="name" style="text-align: left;">${stock.name}</td>
            <td>${currentMarket === 'KOSPI' ? '₩' : '$'}${formatNumber(stock.ath)}</td>
            <td>${currentMarket === 'KOSPI' ? '₩' : '$'}${formatNumber(stock.lowest_after_ath)}</td>
            <td>${currentMarket === 'KOSPI' ? '₩' : '$'}${formatNumber(stock.price)}</td>
            <td class="${getCorrectionClass(stock.correction_ratio)}">${formatPercent(stock.correction_ratio)}</td>
            <td class="${getPriceToAthClass(stock.price_to_ath)}">${formatPercent(stock.price_to_ath)}</td>
            <td class="${getDaysSinceAthClass(stock.days_since_ath)}">${formatNumber(stock.days_since_ath)}일</td>
            <td class="${stock.ma_20_spread !== undefined && stock.ma_20_spread !== null ? getMaSpreadClass(stock.ma_20_spread) : ''}">${stock.ma_20_spread !== undefined && stock.ma_20_spread !== null ? formatPercent(stock.ma_20_spread) : '-'}</td>
            <td class="${stock.ma_50_spread !== undefined && stock.ma_50_spread !== null ? getMaSpreadClass(stock.ma_50_spread) : ''}">${stock.ma_50_spread !== undefined && stock.ma_50_spread !== null ? formatPercent(stock.ma_50_spread) : '-'}</td>
            <td class="${stock.ma_20_50_spread !== undefined && stock.ma_20_50_spread !== null ? getMaSpreadClass(stock.ma_20_50_spread) : ''}">${stock.ma_20_50_spread !== undefined && stock.ma_20_50_spread !== null ? formatPercent(stock.ma_20_50_spread) : '-'}</td>
            <td class="${getEpsClass(stock.eps_q0)}">${formatNumber(stock.eps_q0)}%</td>
            <td class="${getEpsClass(stock.eps_q1)}">${formatNumber(stock.eps_q1)}%</td>
            <td class="${getEpsClass(stock.eps_q2)}">${formatNumber(stock.eps_q2)}%</td>
            <td class="${getEpsClass(stock.eps_q3)}">${formatNumber(stock.eps_q3)}%</td>
            <td class="${getPerClass(stock.per)}">${formatNumber(stock.per)}</td>
            <td class="${getRoeClass(stock.roe)}">${formatNumber(stock.roe)}</td>
        `;

        tableBody.appendChild(row);
    });
}

// Function to find and render recommended stocks for all markets
function renderRecommendations() {
    const wrapper = document.getElementById('recommendationsWrapper');
    wrapper.innerHTML = '';

    const markets = [
        { key: 'SP500', name: 'S&P 500' },
        { key: 'NASDAQ', name: 'NASDAQ' },
        { key: 'KOSPI', name: 'KOSPI' }
    ];

    const sp500Tickers = new Set((mockMarketData['SP500'] || []).map(stock => stock.ticker));

    markets.forEach(m => {
        const marketItems = mockMarketData[m.key] || [];

        // Filter logic based on criteria:
        const recommendedStocks = marketItems.filter(stock => {
            // Exclude stocks that are already in S&P 500 if the current market is not S&P 500
            if (m.key !== 'SP500' && sp500Tickers.has(stock.ticker)) {
                return false;
            }

            // Exclude ADRs (Depositary Receipts) if market is NASDAQ
            if (m.key === 'NASDAQ' && stock.name && (stock.name.includes('ADR') || stock.name.includes('Depositary'))) {
                return false;
            }

            const cond1 = stock.correction_ratio <= 0.40;
            const cond2 = stock.price_to_ath >= 0.90;
            const cond3 = stock.days_since_ath >= 40 && stock.days_since_ath <= 365;
            // Allow EPS check to pass if data is 0 (missing from Yahoo API) OR if it meets the >= 20 criterion.
            const cond4 = (stock.eps_q0 === 0 && stock.eps_q1 === 0) || (stock.eps_q0 >= 20 && stock.eps_q1 >= 20);

            // Condition 5: Either MA20 spread or MA50 spread is in the 'green' range (-3% to +3%)
            const isMa20Green = stock.ma_20_spread !== undefined && stock.ma_20_spread !== null && stock.ma_20_spread >= -0.03 && stock.ma_20_spread <= 0.03;
            const isMa50Green = stock.ma_50_spread !== undefined && stock.ma_50_spread !== null && stock.ma_50_spread >= -0.03 && stock.ma_50_spread <= 0.03;
            const cond5 = isMa20Green || isMa50Green;

            return cond1 && cond2 && cond3 && cond4 && cond5;
        });

        recommendedStocks.sort((a, b) => {
            const valA = a.price_to_ath >= 0 ? a.price_to_ath : 0;
            const valB = b.price_to_ath >= 0 ? b.price_to_ath : 0;
            return valB - valA;
        });

        // Take only top 6 recommendations per market
        const topRecommendations = recommendedStocks.slice(0, 6);

        // Create row container
        const rowDiv = document.createElement('div');
        rowDiv.className = 'market-rec-row';

        // Create Market Label Card
        const labelCard = document.createElement('div');
        labelCard.className = 'market-label-card';
        labelCard.textContent = m.name;
        rowDiv.appendChild(labelCard);

        if (topRecommendations.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'rec-card';
            emptyMsg.style.display = 'flex';
            emptyMsg.style.alignItems = 'center';
            emptyMsg.style.justifyContent = 'center';
            emptyMsg.style.color = 'var(--secondary-color)';
            emptyMsg.innerHTML = '추천 종목 없음';
            rowDiv.appendChild(emptyMsg);
        } else {
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'rec-card-container';

            topRecommendations.forEach(stock => {
                const card = document.createElement('div');
                card.className = 'rec-card';
                card.innerHTML = `
                    <div class="rec-ticker">${stock.ticker}</div>
                    <div class="rec-name">${stock.name}</div>
                    <div class="rec-metrics">
                        <span title="20-50 이평선 이격도"><i class="ri-funds-line"></i> ${stock.ma_20_50_spread !== undefined && stock.ma_20_50_spread !== null ? formatPercent(stock.ma_20_50_spread) : '-'}</span>
                        <span title="종가/최고가 비율"><i class="ri-arrow-up-circle-line"></i> ${formatPercent(stock.price_to_ath)}</span>
                    </div>
                `;
                // Click to focus and switch to that market tab
                card.addEventListener('click', () => {
                    // Switch tab
                    const tabBtn = document.querySelector(`.tab-btn[data-market="${m.key}"]`);
                    if (tabBtn) tabBtn.click();

                    // Search
                    const searchInput = document.getElementById('searchInput');
                    searchInput.value = stock.ticker;
                    searchInput.dispatchEvent(new Event('input'));
                });
                cardsContainer.appendChild(card);
            });
            rowDiv.appendChild(cardsContainer);
        }

        wrapper.appendChild(rowDiv);
    });
}


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // --- View Switching ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const fundermentalsView = document.getElementById('fundermentalsView');
    const tradeHistoryView = document.getElementById('tradeHistoryView');
    const headerContent = document.querySelector('.header-content');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const view = btn.getAttribute('data-view');
            if (view === 'fundermentals') {
                fundermentalsView.style.display = 'block';
                tradeHistoryView.style.display = 'none';
                headerContent.style.display = 'block';
            } else {
                fundermentalsView.style.display = 'none';
                tradeHistoryView.style.display = 'block';
                headerContent.style.display = 'none';
                renderTradeHistory();
            }
        });
    });

    // --- Modal Logic ---
    const modal = document.getElementById('tradeModal');
    const closeModal = document.querySelector('.close-modal');
    const tradeForm = document.getElementById('tradeForm');
    const modalTicker = document.getElementById('modalTicker');
    const modalDate = document.getElementById('modalDate');
    const fpModalDate = flatpickr(modalDate, {
        "locale": "ko",
        dateFormat: "Y-m-d",
        defaultDate: "today",
        disableMobile: true
    });

    // Close modals when clicking X
    closeModal.onclick = () => {
        modal.style.display = 'none';
    };

    // Close detail modal when clicking X
    const detailModal = document.getElementById('detailModal');
    const closeDetailModal = detailModal.querySelector('.close-modal');
    closeDetailModal.onclick = () => {
        detailModal.style.display = 'none';
    };

    // Generalized modal closing when clicking outside
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Function to show detail modal
    function showDetailModal(title, details) {
        const titleEl = document.getElementById('detailModalTitle');
        const bodyEl = document.getElementById('detailModalBody');

        titleEl.textContent = title;
        bodyEl.innerHTML = '';

        if (!details || details.length === 0) {
            bodyEl.innerHTML = '<div style="text-align:center; padding: 2rem;">내역이 없습니다.</div>';
        } else {
            details.forEach(item => {
                if (!item.content && !item.chart) return; // Skip empty entries

                const row = document.createElement('div');
                row.className = 'detail-item-row';

                let contentHtml = '';
                if (item.content) {
                    contentHtml = `<div class="detail-content">${item.content}</div>`;
                } else if (item.chart) {
                    contentHtml = `<a href="${item.chart}" target="_blank" class="icon-btn detail-chart-link"><i class="ri-line-chart-line"></i> 차트 보기</a>`;
                }

                row.innerHTML = `
                    <div class="detail-date">${item.date}</div>
                    ${contentHtml}
                `;
                bodyEl.appendChild(row);
            });
        }

        detailModal.style.display = 'flex';
    }

    // Open modal when clicking a row in the stock table
    document.getElementById('stockTableBody').addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (row && !row.querySelector('td.glossary-box')) { // Ensure we didn't click glossary
            const tickerCell = row.querySelector('.ticker');
            if (tickerCell) {
                const ticker = tickerCell.textContent;
                tradeForm.reset();
                modalTicker.value = ticker;
                fpModalDate.setDate(new Date());
                modal.style.display = 'flex';
            }
        }
    });

    // Handle trade form submission
    tradeForm.onsubmit = (e) => {
        e.preventDefault();
        const tradeData = {
            ticker: modalTicker.value,
            date: modalDate.value,
            quantity: parseFloat(document.getElementById('modalQuantity').value),
            price: parseFloat(document.getElementById('modalPrice').value),
            reason: document.getElementById('modalReason').value,
            chart: document.getElementById('modalChart').value,
            id: Date.now()
        };

        // Save to localStorage with averaging logic
        let trades = JSON.parse(localStorage.getItem('stockTrades') || '[]');
        const existingTradeIndex = trades.findIndex(t => t.ticker === tradeData.ticker);

        if (existingTradeIndex !== -1) {
            const existing = trades[existingTradeIndex];
            const totalQuantity = existing.quantity + tradeData.quantity;
            const totalCost = (existing.quantity * existing.price) + (tradeData.quantity * tradeData.price);
            const avgPrice = totalCost / totalQuantity;

            // Update buyDetails array
            let buyDetails = existing.buyDetails || [];
            if (buyDetails.length === 0 && (existing.reason || existing.chart)) {
                buyDetails.push({ date: existing.date, reason: existing.reason, chart: existing.chart });
            }
            if (tradeData.reason || tradeData.chart) {
                buyDetails.push({
                    date: tradeData.date,
                    reason: tradeData.reason,
                    chart: tradeData.chart
                });
            }

            trades[existingTradeIndex] = {
                ...existing,
                quantity: totalQuantity,
                price: avgPrice,
                date: tradeData.date, // Update with latest buy date
                reason: tradeData.reason || existing.reason,
                chart: tradeData.chart || existing.chart,
                buyDetails: buyDetails
            };
        } else {
            if (tradeData.reason || tradeData.chart) {
                tradeData.buyDetails = [{
                    date: tradeData.date,
                    reason: tradeData.reason,
                    chart: tradeData.chart
                }];
            } else {
                tradeData.buyDetails = [];
            }
            trades.push(tradeData);
        }

        localStorage.setItem('stockTrades', JSON.stringify(trades));

        // Reset and close
        tradeForm.reset();
        modal.style.display = 'none';
        alert('기록되었습니다. 거래내역에서 확인하세요.');
    };

    // --- Sell Modal Logic ---
    const sellModal = document.getElementById('sellModal');
    const sellForm = document.getElementById('sellForm');
    const sellTickerInput = document.getElementById('sellTicker');
    const sellDateInput = document.getElementById('sellDate');
    const fpSellDate = flatpickr(sellDateInput, {
        "locale": "ko",
        dateFormat: "Y-m-d",
        defaultDate: "today",
        disableMobile: true
    });
    const sellQtyInput = document.getElementById('sellQuantity');
    const sellPriceInput = document.getElementById('sellPrice');
    const maxSellQtySpan = document.getElementById('maxSellQty');

    // Handle sell form submission
    sellForm.onsubmit = (e) => {
        e.preventDefault();
        const ticker = sellTickerInput.value;
        const sellQty = parseFloat(sellQtyInput.value);
        const sellPrice = parseFloat(sellPriceInput.value);
        const sellDate = sellDateInput.value;
        const sellReason = document.getElementById('sellReason').value;
        const sellChart = document.getElementById('sellChart').value;

        let trades = JSON.parse(localStorage.getItem('stockTrades') || '[]');
        const tradeIndex = trades.findIndex(t => t.ticker === ticker);

        if (tradeIndex === -1 || trades[tradeIndex].quantity < sellQty) {
            alert('보유 수량이 부족하거나 오류가 발생했습니다.');
            return;
        }

        const trade = trades[tradeIndex];

        // Fee Calculation (Toss Securities)
        const isKR = ticker.endsWith('.KS') || ticker.endsWith('.KQ');
        const buyFeeRate = isKR ? 0.00015 : 0.001;
        const sellFeeRate = isKR ? 0.00195 : 0.001; // Domestic Sell: 0.015% fee + 0.18% tax

        const costBasis = sellQty * trade.price * (1 + buyFeeRate);
        const revenue = sellQty * sellPrice * (1 - sellFeeRate);
        const profit = revenue - costBasis;

        // Load History
        let history = JSON.parse(localStorage.getItem('stockHistory') || '[]');
        const existingHistoryIndex = history.findIndex(h => h.ticker === ticker);

        if (existingHistoryIndex !== -1) {
            // Aggregate with existing history
            const existing = history[existingHistoryIndex];

            const totalQty = existing.quantity + sellQty;

            // Recalculate average buy price
            const totalBuyCost = (existing.quantity * existing.buyPrice) + (sellQty * trade.price);
            const avgBuyPrice = totalBuyCost / totalQty;

            // Recalculate average sell price
            const totalSellRevenue = (existing.quantity * existing.sellPrice) + (sellQty * sellPrice);
            const avgSellPrice = totalSellRevenue / totalQty;

            // Recalculate total profit
            const totalProfit = existing.profit + profit;

            // Approximate profit rate
            const totalCostBasis = totalQty * avgBuyPrice * (1 + buyFeeRate);
            const profitRate = (totalProfit / totalCostBasis) * 100;

            // Update sellDetails array
            let sellDetails = existing.sellDetails || [];
            if (sellDetails.length === 0 && (existing.sellReason || existing.sellChart)) {
                sellDetails.push({ date: existing.sellDate, reason: existing.sellReason, chart: existing.sellChart });
            }
            if (sellReason || sellChart) {
                sellDetails.push({
                    date: sellDate,
                    reason: sellReason,
                    chart: sellChart
                });
            }

            history[existingHistoryIndex] = {
                ...existing,
                sellDate: sellDate > existing.sellDate ? sellDate : existing.sellDate,
                quantity: totalQty,
                buyPrice: avgBuyPrice,
                sellPrice: avgSellPrice,
                profit: totalProfit,
                profitRate: profitRate,
                sellDetails: sellDetails
            };
        } else {
            // Create new history entry
            const profitRate = (profit / costBasis) * 100;
            const historyEntry = {
                ticker: ticker,
                buyDate: trade.date,
                sellDate: sellDate,
                quantity: sellQty,
                buyPrice: trade.price,
                sellPrice: sellPrice,
                profit: profit,
                profitRate: profitRate,
                isKR: isKR,
                sellDetails: [{
                    date: sellDate,
                    reason: sellReason,
                    chart: sellChart
                }],
                id: Date.now()
            };
            history.push(historyEntry);
        }

        // Save History
        localStorage.setItem('stockHistory', JSON.stringify(history));

        // Update Trades (Handle partial sell)
        if (trade.quantity === sellQty) {
            trades.splice(tradeIndex, 1);
        } else {
            trade.quantity -= sellQty;
        }
        localStorage.setItem('stockTrades', JSON.stringify(trades));

        sellForm.reset();
        sellModal.style.display = 'none';
        renderTradeHistory();
        alert('매도가 완료되었습니다.');
    };

    // Close sell modal logic (shared style)
    sellModal.querySelector('.close-modal').onclick = () => sellModal.style.display = 'none';

    // Function to render trade history
    function renderTradeHistory() {
        const trades = JSON.parse(localStorage.getItem('stockTrades') || '[]');
        const historyList = JSON.parse(localStorage.getItem('stockHistory') || '[]');

        // --- Calculate Summary Stats ---
        let evalKRW = 0, costKRW = 0;
        let evalUSD = 0, costUSD = 0;
        let realizedProfitKRW = 0, realizedProfitUSD = 0;

        trades.forEach(t => {
            const isKR = t.ticker.endsWith('.KS') || t.ticker.endsWith('.KQ');
            const currentPrice = getCurrentPrice(t.ticker) || t.price;
            const evalAmount = t.quantity * currentPrice;
            const costAmount = t.quantity * t.price;
            if (isKR) {
                evalKRW += evalAmount;
                costKRW += costAmount;
            } else {
                evalUSD += evalAmount;
                costUSD += costAmount;
            }
        });

        historyList.forEach(h => {
            const isKR = h.ticker.endsWith('.KS') || h.ticker.endsWith('.KQ');
            if (isKR) realizedProfitKRW += h.profit;
            else realizedProfitUSD += h.profit;
        });

        // Update Summary UI - Evaluation & Holding Profit
        const holdingProfitKRW = evalKRW - costKRW;
        const holdingProfitRateKRW = costKRW > 0 ? (holdingProfitKRW / costKRW) * 100 : 0;

        const holdingProfitUSD = evalUSD - costUSD;
        const holdingProfitRateUSD = costUSD > 0 ? (holdingProfitUSD / costUSD) * 100 : 0;

        document.getElementById('holdingEvalKRW').textContent = `₩${formatNumber(evalKRW)}`;
        const krwHoldingProfitEl = document.getElementById('holdingProfitKRW');
        krwHoldingProfitEl.textContent = `${holdingProfitKRW >= 0 ? '+' : '-'}${holdingProfitKRW >= 0 ? '₩' : '₩'}${formatNumber(Math.abs(holdingProfitKRW))} (${holdingProfitRateKRW.toFixed(2)}%)`;
        krwHoldingProfitEl.className = `summary-sub ${holdingProfitKRW >= 0 ? 'positive' : 'negative'}`;

        document.getElementById('holdingEvalUSD').textContent = `$${formatNumber(evalUSD)}`;
        const usdHoldingProfitEl = document.getElementById('holdingProfitUSD');
        usdHoldingProfitEl.textContent = `${holdingProfitUSD >= 0 ? '+' : '-'}${holdingProfitUSD >= 0 ? '$' : '$'}${formatNumber(Math.abs(holdingProfitUSD))} (${holdingProfitRateUSD.toFixed(2)}%)`;
        usdHoldingProfitEl.className = `summary-sub ${holdingProfitUSD >= 0 ? 'positive' : 'negative'}`;

        // Update Summary UI - Realized Profit
        const krwRealizedEl = document.getElementById('totalProfitKRW');
        krwRealizedEl.textContent = `${realizedProfitKRW >= 0 ? '₩' : '-₩'}${formatNumber(Math.abs(realizedProfitKRW))}`;
        krwRealizedEl.className = `value ${realizedProfitKRW >= 0 ? 'positive' : 'negative'}`;

        const usdRealizedEl = document.getElementById('totalProfitUSD');
        usdRealizedEl.textContent = `${realizedProfitUSD >= 0 ? '$' : '-$'}${formatNumber(Math.abs(realizedProfitUSD))}`;
        usdRealizedEl.className = `value ${realizedProfitUSD >= 0 ? 'positive' : 'negative'}`;

        // --- Render Holding Table ---
        const entryTableBody = document.getElementById('entryTableBody');
        entryTableBody.innerHTML = '';

        if (trades.length === 0) {
            entryTableBody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 2rem;">입력된 매수 정보가 없습니다.</td></tr>';
        } else {
            trades.forEach(trade => {
                const row = document.createElement('tr');
                const totalCost = trade.quantity * trade.price;
                const isKR = trade.ticker.endsWith('.KS') || trade.ticker.endsWith('.KQ');
                const currency = isKR ? '₩' : '$';

                const currentPrice = getCurrentPrice(trade.ticker) || trade.price; // Fallback to buy price
                const evalAmount = trade.quantity * currentPrice;
                const pl = evalAmount - totalCost;
                const plClass = pl >= 0 ? 'positive' : 'negative';

                row.innerHTML = `
                    <td>
                        <div class="ticker-cell">
                            <button class="delete-item-btn" data-type="trade" data-ticker="${trade.ticker}">&times;</button>
                            <span>${trade.ticker}</span>
                        </div>
                    </td>
                    <td>${trade.date}</td>
                    <td>${formatNumber(trade.quantity)}</td>
                    <td>${currency}${formatNumber(trade.price)}</td>
                    <td>${currency}${formatNumber(totalCost)}</td>
                    <td>${currency}${formatNumber(currentPrice)}</td>
                    <td>${currency}${formatNumber(evalAmount)}</td>
                     <td class="${plClass}">${pl >= 0 ? currency : '-' + currency}${formatNumber(Math.abs(pl))}</td>
                    <td>
                        <div class="reason-chart-cell">
                            ${(trade.buyDetails && trade.buyDetails.some(d => d.reason)) || trade.reason ? `<button class="icon-btn reason-btn" title="매수근거 보기"><i class="ri-chat-bubble-3-line"></i></button>` : '-'}
                        </div>
                    </td>
                    <td>
                        <div class="reason-chart-cell">
                            ${(trade.buyDetails && trade.buyDetails.some(d => d.chart)) || trade.chart ? `<button class="icon-btn chart-btn" title="차트 보기"><i class="ri-line-chart-line"></i></button>` : '-'}
                        </div>
                    </td>
                    <td><button class="sell-btn" data-ticker="${trade.ticker}">매도</button></td>
                `;

                // Add detail view listener for reason
                const reasonBtn = row.querySelector('.reason-btn');
                if (reasonBtn) {
                    reasonBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        let details = trade.buyDetails || [];
                        if (details.length === 0 && trade.reason) {
                            details = [{ date: trade.date, reason: trade.reason }];
                        }
                        showDetailModal('매수 근거', details.map(d => ({ date: d.date, content: d.reason })));
                    });
                }

                // Add detail view listener for chart
                const chartBtn = row.querySelector('.chart-btn');
                if (chartBtn) {
                    chartBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        let details = trade.buyDetails || [];
                        if (details.length === 0 && trade.chart) {
                            details = [{ date: trade.date, chart: trade.chart }];
                        }
                        showDetailModal('매수 차트', details.map(d => ({ date: d.date, chart: d.chart })));
                    });
                }


                // Add delete event listener
                row.querySelector('.delete-item-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`${trade.ticker} 정보를 삭제하시겠습니까?`)) {
                        let trades = JSON.parse(localStorage.getItem('stockTrades') || '[]');
                        trades = trades.filter(t => t.ticker !== trade.ticker);
                        localStorage.setItem('stockTrades', JSON.stringify(trades));
                        renderTradeHistory();
                    }
                });

                // Add event listener to sell button
                row.querySelector('.sell-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    sellTickerInput.value = trade.ticker;
                    fpSellDate.setDate(new Date());
                    sellQtyInput.value = trade.quantity;
                    maxSellQtySpan.textContent = formatNumber(trade.quantity);
                    sellModal.style.display = 'flex';
                });

                entryTableBody.appendChild(row);
            });
        }

        // --- Render History Table ---
        const historyTableBody = document.getElementById('historyTableBody');
        historyTableBody.innerHTML = '';

        if (historyList.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 2rem;">거래 완료 내역이 없습니다.</td></tr>';
        } else {
            historyList.forEach(item => {
                const row = document.createElement('tr');
                const currency = item.isKR ? '₩' : '$';
                const profitClass = item.profit >= 0 ? 'positive' : 'negative';

                row.innerHTML = `
                    <td>
                        <div class="ticker-cell">
                            <button class="delete-item-btn" data-type="history" data-id="${item.id}">&times;</button>
                            <span>${item.ticker}</span>
                        </div>
                    </td>
                    <td>${item.buyDate}</td>
                    <td>${item.sellDate}</td>
                    <td>${formatNumber(item.quantity)}</td>
                    <td>${currency}${formatNumber(item.buyPrice)}</td>
                    <td>${currency}${formatNumber(item.sellPrice)}</td>
                    <td class="${profitClass}">${item.profit >= 0 ? currency : '-' + currency}${formatNumber(Math.abs(item.profit))}</td>
                     <td class="${profitClass}">${item.profitRate.toFixed(2)}%</td>
                    <td>
                        <div class="reason-chart-cell">
                            ${(item.sellDetails && item.sellDetails.some(d => d.reason)) || item.sellReason ? `<button class="icon-btn sell-reason-btn" title="매도근거 보기"><i class="ri-chat-bubble-3-line"></i></button>` : '-'}
                        </div>
                    </td>
                    <td>
                        <div class="reason-chart-cell">
                            ${(item.sellDetails && item.sellDetails.some(d => d.chart)) || item.sellChart ? `<button class="icon-btn sell-chart-btn" title="차트 보기"><i class="ri-line-chart-line"></i></button>` : '-'}
                        </div>
                    </td>
                `;

                // Add detail view listeners
                const reasonBtn = row.querySelector('.sell-reason-btn');
                if (reasonBtn) {
                    reasonBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        let details = item.sellDetails || [];
                        if (details.length === 0 && item.sellReason) {
                            details = [{ date: item.sellDate, reason: item.sellReason }];
                        }
                        showDetailModal('매도 근거', details.map(d => ({ date: d.date, content: d.reason })));
                    });
                }
                const chartBtn = row.querySelector('.sell-chart-btn');
                if (chartBtn) {
                    chartBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        let details = item.sellDetails || [];
                        if (details.length === 0 && item.sellChart) {
                            details = [{ date: item.sellDate, chart: item.sellChart }];
                        }
                        showDetailModal('매도 차트', details.map(d => ({ date: d.date, chart: d.chart })));
                    });
                }

                // Add delete event listener
                row.querySelector('.delete-item-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`해당 거래 기록을 삭제하시겠습니까 ? `)) {
                        let history = JSON.parse(localStorage.getItem('stockHistory') || '[]');
                        history = history.filter(h => h.id !== item.id);
                        localStorage.setItem('stockHistory', JSON.stringify(history));
                        renderTradeHistory();
                    }
                });
                historyTableBody.appendChild(row);
            });
        }
    }

    // --- Cache Invalid/Sync Fixes ---
    // 1. Ensure the index column (#) header exists (for cached HTML)
    const theadRow = document.querySelector('#stockTable thead tr');
    if (theadRow && !theadRow.querySelector('.index-col')) {
        const indexTh = document.createElement('th');
        indexTh.className = 'sticky-col index-col';
        indexTh.textContent = '구분';
        theadRow.insertBefore(indexTh, theadRow.firstChild);
    }
    // 2. Ensure NASDAQ tab says 300 (for cached HTML)
    const nasdaqTab = document.querySelector('.tab-btn[data-market="NASDAQ"]');
    if (nasdaqTab && nasdaqTab.textContent.includes('100')) {
        nasdaqTab.textContent = 'NASDAQ 300';
    }

    // Default sort by green cell count for the initial market (SP500)
    displayData.sort((a, b) => getGreenCellCount(b) - getGreenCellCount(a));

    // Initial render
    renderTable(displayData);
    renderRecommendations();

    // Tab switching logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active styling
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update current market and table data
            currentMarket = btn.getAttribute('data-market');
            displayData = [...(mockMarketData[currentMarket] || [])];

            // Sort by green cell count by default
            displayData.sort((a, b) => getGreenCellCount(b) - getGreenCellCount(a));

            // Reset sorting
            currentSortColumn = null;
            currentSortOrder = null;
            document.querySelectorAll('th.sortable .sort-icon').forEach(icon => {
                icon.className = 'ri-expand-up-down-line sort-icon';
            });

            // Clear search
            document.getElementById('searchInput').value = '';

            renderTable(displayData);
        });
    });

    // Setup sorting
    const sortableHeaders = document.querySelectorAll('th.sortable');
    sortableHeaders.forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort');

            // Determine new sort order
            if (currentSortColumn === column) {
                if (currentSortOrder === 'desc') {
                    currentSortOrder = 'asc';
                } else if (currentSortOrder === 'asc') {
                    currentSortOrder = null;
                    currentSortColumn = null;
                } else {
                    currentSortOrder = 'desc';
                }
            } else {
                currentSortColumn = column;
                currentSortOrder = 'desc';
            }

            // Update UI Icons
            sortableHeaders.forEach(header => {
                const icon = header.querySelector('.sort-icon');
                if (icon) {
                    icon.className = 'ri-expand-up-down-line sort-icon';
                }
            });

            if (currentSortOrder !== null) {
                const activeIcon = th.querySelector('.sort-icon');
                if (activeIcon) {
                    activeIcon.className = currentSortOrder === 'desc'
                        ? 'ri-arrow-down-line sort-icon'
                        : 'ri-arrow-up-line sort-icon';
                }
            }

            // Sort and render
            sortData(currentSortColumn, currentSortOrder);
            renderTable(displayData);
        });
    });

    // Search functionality (Scroll to ticker)
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toUpperCase();
        if (!query) return;

        // 1. Try exact ticker match
        let targetRow = document.getElementById(`row-${query}`);

        // 2. Try prefix ticker match
        if (!targetRow) {
            const matchedTicker = displayData.find(s => s.ticker.toUpperCase().startsWith(query));
            if (matchedTicker) {
                targetRow = document.getElementById(`row-${matchedTicker.ticker.toUpperCase()}`);
            }
        }

        // 3. Try partial name match (case-insensitive)
        if (!targetRow) {
            const lowerQuery = e.target.value.trim().toLowerCase();
            const matchedName = displayData.find(s => s.name.toLowerCase().includes(lowerQuery));
            if (matchedName) {
                targetRow = document.getElementById(`row-${matchedName.ticker.toUpperCase()}`);
            }
        }

        if (targetRow) {
            // Scroll table so row is visible instantly (no smooth animation)
            targetRow.scrollIntoView({ behavior: 'auto', block: 'center' });

            // Highlight the row temporarily
            targetRow.style.backgroundColor = 'rgba(88, 166, 255, 0.3)';
            targetRow.style.transition = 'background-color 0.5s';
            setTimeout(() => {
                targetRow.style.backgroundColor = '';
            }, 1000);
        }
    });

    // Glossary toggle functionality
    const glossaryBtn = document.getElementById('glossaryBtn');
    const glossaryBox = document.getElementById('glossaryBox');

    glossaryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        glossaryBox.classList.toggle('active');
    });

    // Column Resizing Logic
    const initResizer = () => {
        const headers = document.querySelectorAll('th');
        headers.forEach(th => {
            // Add resizer element if not already present
            if (!th.querySelector('.resizer')) {
                const resizer = document.createElement('div');
                resizer.classList.add('resizer');
                th.appendChild(resizer);

                let startX, startWidth;

                const onMouseMove = (e) => {
                    const width = startWidth + (e.pageX - startX);
                    if (width > 50) { // Minimum width
                        th.style.width = `${width}px`;
                        th.style.minWidth = `${width}px`;
                    }
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    th.classList.remove('resizing');
                };

                resizer.addEventListener('mousedown', (e) => {
                    e.stopPropagation(); // Prevent sorting trigger
                    startX = e.pageX;
                    startWidth = th.offsetWidth;
                    th.classList.add('resizing');
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            }
        });
    };

    // Call resizer init
    initResizer();

    // Close glossary when clicking outside
    document.addEventListener('click', (e) => {
        if (!glossaryBox.contains(e.target) && e.target !== glossaryBtn) {
            glossaryBox.classList.remove('active');
        }
    });

    // Download functionality
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (displayData.length === 0) {
                alert("다운로드할 데이터가 없습니다.");
                return;
            }

            // CSV Header
            let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF for UTF-8 BOM (Excel support)
            csvContent += "티커,기업명,역사적 최고가,최고가 이후 최저가,오늘 종가,조정 비율,종가/최고가 비율,최고가 경과일,20 이평선 이격도,50 이평선 이격도,20-50 이평선 이격도,EPS Q0,EPS Q-1,EPS Q-2,EPS Q-3,PER,ROE\n";

            // CSV Rows
            displayData.forEach(row => {
                const rowData = [
                    row.ticker,
                    '"' + row.name.split('"').join('""') + '"', // Handle commas quoting in names
                    row.ath,
                    row.lowest_after_ath,
                    row.price,
                    row.correction_ratio,
                    row.price_to_ath,
                    row.days_since_ath,
                    row.ma_20_spread,
                    row.ma_50_spread,
                    row.ma_20_50_spread,
                    row.eps_q0,
                    row.eps_q1,
                    row.eps_q2,
                    row.eps_q3,
                    row.per,
                    row.roe
                ];
                csvContent += rowData.join(",") + "\n";
            });

            // Trigger Download
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "StockMap_Data.csv");
            document.body.appendChild(link); // Required for Firefox
            link.click();
            document.body.removeChild(link);
        });
    }
});
