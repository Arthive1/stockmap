// We are now using the actual S&P 500 list from sp500_data.js which defines `sp500Data`
const mockStockData = typeof sp500Data !== 'undefined' ? sp500Data : [];
let displayData = [...mockStockData];
let currentSortColumn = null;
let currentSortOrder = null; // 'desc', 'asc', or null

// Function to sort data
function sortData(column, order) {
    if (order === null) {
        displayData = [...mockStockData];
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
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
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

    data.forEach(stock => {
        const row = document.createElement('tr');
        row.id = `row-${stock.ticker.toUpperCase()}`;

        row.innerHTML = `
            <td class="sticky-col ticker">${stock.ticker}</td>
            <td class="name" style="text-align: left;">${stock.name}</td>
            <td class="industry">${stock.industry}</td>
            <td>$${formatNumber(stock.ath)}</td>
            <td>$${formatNumber(stock.lowest_after_ath)}</td>
            <td>$${formatNumber(stock.price)}</td>
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

// Function to find and render recommended stocks
function renderRecommendations(data) {
    const cardsContainer = document.getElementById('recommendationCards');
    const noMsgWrapper = document.getElementById('noRecommendationsMessage');
    cardsContainer.innerHTML = '';

    // Filter logic based on criteria:
    // 1. 조정 비율(correction_ratio) <= 0.40 (40% 이하)
    // 2. 종가/최고가 비율(price_to_ath) >= 0.90 (90% 이상)
    // 3. 최고가 경과일(days_since_ath) >= 40 && <= 365 (40일~365일 범위 이내)
    // 4. EPS Q0 >= 20 && EPS Q1 >= 20 (모두 20% 이상)

    const recommendedStocks = data.filter(stock => {
        const cond1 = stock.correction_ratio <= 0.40;
        const cond2 = stock.price_to_ath >= 0.90;
        const cond3 = stock.days_since_ath >= 40 && stock.days_since_ath <= 365;
        const cond4 = stock.eps_q0 >= 20 && stock.eps_q1 >= 20;

        return cond1 && cond2 && cond3 && cond4;
    });

    // Sort by ma_spread_percentile ascending (lowest first = moving averages are closest)
    // Put missing values (-1) at the very end
    recommendedStocks.sort((a, b) => {
        const valA = a.ma_spread_percentile >= 0 ? a.ma_spread_percentile : Infinity;
        const valB = b.ma_spread_percentile >= 0 ? b.ma_spread_percentile : Infinity;
        return valA - valB;
    });

    if (recommendedStocks.length === 0) {
        noMsgWrapper.style.display = 'block';
    } else {
        noMsgWrapper.style.display = 'none';

        recommendedStocks.forEach(stock => {
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
            // Click to search
            card.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                searchInput.value = stock.ticker;
                searchInput.dispatchEvent(new Event('input'));
            });
            cardsContainer.appendChild(card);
        });
    }
}


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initial render
    renderTable(displayData);
    renderRecommendations(mockStockData);

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
            const matchedTicker = mockStockData.find(s => s.ticker.toUpperCase().startsWith(query));
            if (matchedTicker) {
                targetRow = document.getElementById(`row-${matchedTicker.ticker.toUpperCase()}`);
            }
        }

        // 3. Try partial name match (case-insensitive)
        if (!targetRow) {
            const lowerQuery = e.target.value.trim().toLowerCase();
            const matchedName = mockStockData.find(s => s.name.toLowerCase().includes(lowerQuery));
            if (matchedName) {
                targetRow = document.getElementById(`row-${matchedName.ticker.toUpperCase()}`);
            }
        }

        if (targetRow) {
            // Scroll table so row is visible
            targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

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
});
