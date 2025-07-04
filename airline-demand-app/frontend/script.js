// Modern dashboard logic for /api/analyze
function fetchAIInsight() {
  const aiDiv = document.getElementById('ai-insights');
  aiDiv.textContent = 'Loading AI insight...';
  fetch('http://127.0.0.1:8000/api/ai-insight')
    .then(r => r.json())
    .then(ai => {
      aiDiv.innerHTML = marked.parse(ai.ai_insights || 'No AI insights available.');
    })
    .catch(() => {
      aiDiv.textContent = 'Failed to load AI insights.';
    });
}

async function fetchAnalytics() {
  const summary = document.getElementById('summary-cards');
  summary.innerHTML = "<div class='col-span-4 text-center text-gray-400'>Loading...</div>";
  try {
    const response = await fetch('http://127.0.0.1:8000/api/analyze');
    const data = await response.json();
    renderSummaryCards(data);
    renderAirlineBarChart(data.top_airlines);
    renderPriceHistChart(data.price_hist);
    renderCO2BarChart(data.co2_by_airline);
    renderTable('cheapest-table', data.top_cheapest);
    renderTable('sample-table', data.sample_data);
    renderDemandTrendChart(data.price_hist);
    renderStopsPieChart(data.stops_count);
    renderAllFlightsTable('all-flights-table', data.all_flights, data.top_cheapest);
    // Optionally, fetch AI insight automatically after scraping/analytics
    // fetchAIInsight();
  } catch (e) {
    summary.innerHTML = `<div class='col-span-4 text-red-500'>Failed to load analytics.</div>`;
    document.getElementById('ai-insights').textContent = 'Failed to load AI insights.';
  }
}

function renderSummaryCards(data) {
  const cards = [
    {
      label: 'Total Flights',
      value: data.total_flights,
      icon: '🛫',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      label: 'Cheapest Price',
      value: data.top_cheapest?.[0]?.Price ? `₹${data.top_cheapest[0].Price}` : '-',
      icon: '💸',
      color: 'bg-green-100 text-green-800'
    },
    {
      label: 'Busiest Day',
      value: data.busiest_day || '-',
      icon: '📅',
      color: 'bg-indigo-100 text-indigo-800'
    },
    {
      label: 'Most Stops',
      value: Object.keys(data.stops_count || {}).sort((a,b)=>data.stops_count[b]-data.stops_count[a])[0] || '-',
      icon: '🛑',
      color: 'bg-yellow-100 text-yellow-800'
    }
  ];
  document.getElementById('summary-cards').innerHTML = cards.map(card => `
    <div class="rounded-lg shadow p-4 flex flex-col items-center ${card.color}">
      <div class="text-3xl mb-2">${card.icon}</div>
      <div class="text-xl font-bold">${card.value}</div>
      <div class="text-gray-700 mt-1">${card.label}</div>
    </div>
  `).join('');
}

function renderAirlineBarChart(top_airlines) {
  const ctx = document.getElementById('airlineBarChart').getContext('2d');
  if(window.airlineBarChartObj) window.airlineBarChartObj.destroy();
  window.airlineBarChartObj = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top_airlines.map(a => a['Airline Company']),
      datasets: [{
        label: 'Avg Price (₹)',
        data: top_airlines.map(a => a.Price),
        backgroundColor: 'rgba(59,130,246,0.7)'
      }]
    },
    options: {responsive: true, plugins: {legend: {display: false}}}
  });
}

function renderPriceHistChart(price_hist) {
  const ctx = document.getElementById('priceHistChart').getContext('2d');
  if(window.priceHistChartObj) window.priceHistChartObj.destroy();
  // Simple histogram: bin prices
  const bins = 10;
  const min = Math.min(...price_hist);
  const max = Math.max(...price_hist);
  const binSize = (max-min)/bins;
  const hist = Array(bins).fill(0);
  price_hist.forEach(p => {
    let idx = Math.floor((p-min)/binSize);
    if(idx >= bins) idx = bins-1;
    hist[idx]++;
  });
  const labels = Array(bins).fill(0).map((_,i)=>`₹${Math.round(min+i*binSize)}-₹${Math.round(min+(i+1)*binSize)}`);
  window.priceHistChartObj = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Flights',
        data: hist,
        backgroundColor: 'rgba(16,185,129,0.7)'
      }]
    },
    options: {responsive: true, plugins: {legend: {display: false}}}
  });
}

function renderCO2BarChart(co2_by_airline) {
  const ctx = document.getElementById('co2BarChart').getContext('2d');
  if(window.co2BarChartObj) window.co2BarChartObj.destroy();
  window.co2BarChartObj = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: co2_by_airline.map(a => a['Airline Company']),
      datasets: [{
        label: 'Avg CO₂ (kg)',
        data: co2_by_airline.map(a => a.CO2),
        backgroundColor: 'rgba(139,92,246,0.7)'
      }]
    },
    options: {responsive: true, plugins: {legend: {display: false}}}
  });
}

function renderDemandTrendChart(price_hist) {
  const ctx = document.getElementById('demandTrendChart').getContext('2d');
  if(window.demandTrendChartObj) window.demandTrendChartObj.destroy();
  // Use price_hist as a proxy for demand trend (or replace with real demand data if available)
  window.demandTrendChartObj = new Chart(ctx, {
    type: 'line',
    data: {
      labels: price_hist.map((_, i) => `Flight ${i+1}`),
      datasets: [{
        label: 'Price Trend (₹)',
        data: price_hist,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {responsive: true, plugins: {legend: {display: true}}}
  });
}

function renderStopsPieChart(stops_count) {
  const ctx = document.getElementById('stopsPieChart').getContext('2d');
  if(window.stopsPieChartObj) window.stopsPieChartObj.destroy();
  const labels = Object.keys(stops_count);
  const data = Object.values(stops_count);
  window.stopsPieChartObj = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'Flights by Stops',
        data,
        backgroundColor: ['#60a5fa','#818cf8','#fbbf24','#34d399','#f87171','#a78bfa']
      }]
    },
    options: {responsive: true}
  });
}

function renderTable(tableId, rows) {
  const table = document.getElementById(tableId);
  if(!rows || !rows.length) {
    table.innerHTML = '<tr><td class="text-gray-400">No data</td></tr>';
    return;
  }
  const thead = '<thead><tr>' + Object.keys(rows[0]).map(k => `<th class='border px-3 py-2 bg-blue-100 text-blue-900 font-semibold text-sm uppercase tracking-wider'>${k.replace(/_/g, ' ')}</th>`).join('') + '</tr></thead>';
  const tbody = '<tbody>' + rows.map((row, i) =>
    '<tr class="' + (i % 2 === 0 ? 'bg-white' : 'bg-blue-50') + '">' +
    Object.values(row).map(v => `<td class='border px-3 py-2'>${v}</td>`).join('') + '</tr>'
  ).join('') + '</tbody>';
  table.innerHTML = thead + tbody;
}

function renderAllFlightsTable(tableId, allRows, topRows) {
  const table = document.getElementById(tableId);
  if(!allRows || !allRows.length) {
    table.innerHTML = '<tr><td class="text-gray-400">No data</td></tr>';
    return;
  }
  const thead = '<thead><tr>' + Object.keys(allRows[0]).map(k => `<th class='border px-3 py-2 bg-blue-100 text-blue-900 font-semibold text-sm uppercase tracking-wider'>${k.replace(/_/g, ' ')}</th>`).join('') + '</tr></thead>';
  const topSet = new Set(topRows.map(row => JSON.stringify(row)));
  const tbody = '<tbody>' + allRows.map((row, i) => {
    const isTop = topSet.has(JSON.stringify(row));
    return `<tr class='${isTop ? 'bg-yellow-100 font-bold ring-2 ring-yellow-400' : (i % 2 === 0 ? 'bg-white' : 'bg-blue-50')}'>` +
      Object.values(row).map(v => `<td class='border px-3 py-2'>${v}</td>`).join('') + '</tr>';
  }).join('') + '</tbody>';
  table.innerHTML = thead + tbody;
}

// Add scraping logic

document.getElementById('scrape-btn').onclick = async function() {
  const origin = document.getElementById('origin-input').value;
  const destination = document.getElementById('destination-input').value;
  const startDate = document.getElementById('start-date-input').value;
  const rangeDays = parseInt(document.getElementById('date-range-input').value, 10);
  // Calculate end date based on range
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + rangeDays - 1);
  const endDate = end.toISOString().slice(0, 10);
  const statusDiv = document.getElementById('scrape-status');
  statusDiv.textContent = 'Scraping in progress...';
  try {
    const response = await fetch('http://127.0.0.1:8000/api/scrape', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        origin, destination, start_date: startDate, end_date: endDate, filename: 'flight_data.csv'
      })
    });
    if (!response.ok) throw new Error('Scraping failed');
    const result = await response.json();
    statusDiv.textContent = result.status || 'Scraping complete!';
    // Refresh dashboard after scraping
    fetchAnalytics();
  } catch (e) {
    statusDiv.textContent = 'Scraping failed: ' + e.message;
  }
};

// Add a button to get AI insight manually
const aiBtn = document.createElement('button');
aiBtn.textContent = 'Get AI Insight';
aiBtn.className = 'bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 mb-4';
aiBtn.onclick = fetchAIInsight;
document.querySelector('#ai-insights').parentElement.prepend(aiBtn);

fetchAnalytics();
