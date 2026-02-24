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

// Helper to format numbers and strings safely
function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    if (typeof num === 'string') return num;
    if (isNaN(num)) return '-';
    return Number.isInteger(num)
        ? num.toLocaleString('en-US')
        : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        tableBody.innerHTML = '<tr><td colspan="14" style="text-align:center; padding: 2rem;">검색 결과가 없습니다.</td></tr>';
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
            <td>${formatNumber(stock.days_since_ath)}일</td>
            <td>${stock.ma_spread_percentile >= 0 ? formatNumber(stock.ma_spread_percentile) + '%' : '-'}</td>
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

            const cond1 = stock.correction_ratio <= 0.40;
            const cond2 = stock.price_to_ath >= 0.90;
            const cond3 = stock.days_since_ath >= 40 && stock.days_since_ath <= 365;
            // Allow EPS check to pass if data is 0 (missing from Yahoo API) OR if it meets the >= 20 criterion.
            const cond4 = (stock.eps_q0 === 0 && stock.eps_q1 === 0) || (stock.eps_q0 >= 20 && stock.eps_q1 >= 20);
            return cond1 && cond2 && cond3 && cond4;
        });

        recommendedStocks.sort((a, b) => {
            const valA = a.ma_spread_percentile >= 0 ? a.ma_spread_percentile : Infinity;
            const valB = b.ma_spread_percentile >= 0 ? b.ma_spread_percentile : Infinity;
            return valA - valB;
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
            topRecommendations.forEach(stock => {
                const card = document.createElement('div');
                card.className = 'rec-card';
                card.innerHTML = `
                    <div class="rec-ticker">${stock.ticker}</div>
                    <div class="rec-name">${stock.name}</div>
                    <div class="rec-metrics">
                        <span title="이격도 하위 백분위수"><i class="ri-funds-line"></i> ${stock.ma_spread_percentile >= 0 ? formatNumber(stock.ma_spread_percentile) + '%' : '-'}</span>
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
                rowDiv.appendChild(card);
            });
        }

        wrapper.appendChild(rowDiv);
    });
}


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // --- Cache Invalid/Sync Fixes ---
    // 1. Ensure the index column (#) header exists (for cached HTML)
    const theadRow = document.querySelector('#stockTable thead tr');
    if (theadRow && !theadRow.querySelector('.index-col')) {
        const indexTh = document.createElement('th');
        indexTh.className = 'sticky-col index-col';
        indexTh.textContent = '#';
        theadRow.insertBefore(indexTh, theadRow.firstChild);
    }
    // 2. Ensure NASDAQ tab says 300 (for cached HTML)
    const nasdaqTab = document.querySelector('.tab-btn[data-market="NASDAQ"]');
    if (nasdaqTab && nasdaqTab.textContent.includes('100')) {
        nasdaqTab.textContent = 'NASDAQ 300';
    }

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
            csvContent += "티커,기업명,역사적 최고가,최고가 이후 최저가,오늘 종가,조정 비율,종가/최고가 비율,최고가 경과일,이동평균 이격도(하위 백분위수),EPS Q0,EPS Q-1,EPS Q-2,EPS Q-3,PER,ROE\n";

            // CSV Rows
            displayData.forEach(row => {
                const rowData = [
                    row.ticker,
                    `"${row.name.replace(/"/g, '""')}"`, // Handle commas quoting in names
                    row.ath,
                    row.lowest_after_ath,
                    row.price,
                    row.correction_ratio,
                    row.price_to_ath,
                    row.days_since_ath,
                    row.ma_spread_percentile,
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
