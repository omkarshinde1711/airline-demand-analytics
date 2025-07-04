// Modern dashboard logic for /api/analyze
function fetchAIInsight() {
  const aiDiv = document.getElementById('ai-insights');
  aiDiv.innerHTML = `
    <div class="flex items-center justify-center h-40 text-gray-400">
      <i class="fas fa-spinner fa-spin mr-2"></i>
      Generating AI insights...
    </div>
  `;
  fetch('http://127.0.0.1:8000/api/ai-insight')
    .then(r => r.json())
    .then(ai => {
      aiDiv.innerHTML = marked.parse(ai.ai_insights || 'No AI insights available.');
    })
    .catch(() => {
      aiDiv.innerHTML = `
        <div class="flex items-center justify-center h-40 text-red-400">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          Failed to load AI insights
        </div>
      `;
    });
}

async function fetchAnalytics() {
  const summary = document.getElementById('summary-cards');
  summary.innerHTML = `
    <div class="col-span-4 flex items-center justify-center py-12">
      <div class="text-center">
        <i class="fas fa-spinner fa-spin text-3xl text-blue-600 mb-4"></i>
        <p class="text-gray-600 font-medium">Loading analytics...</p>
      </div>
    </div>
  `;
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
    summary.innerHTML = `
      <div class="col-span-4 flex items-center justify-center py-12">
        <div class="text-center">
          <i class="fas fa-exclamation-triangle text-3xl text-red-500 mb-4"></i>
          <p class="text-red-600 font-medium">Failed to load analytics</p>
        </div>
      </div>
    `;
    document.getElementById('ai-insights').innerHTML = `
      <div class="flex items-center justify-center h-40 text-red-400">
        <i class="fas fa-exclamation-triangle mr-2"></i>
        Failed to load AI insights
      </div>
    `;
  }
}

function renderSummaryCards(data) {
  const cards = [
    {
      label: 'Total Flights',
      value: data.total_flights || 0,
      icon: 'fas fa-plane-departure',
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900'
    },
    {
      label: 'Cheapest Price',
      value: data.top_cheapest?.[0]?.Price ? `₹${Math.round(data.top_cheapest[0].Price)}` : 'N/A',
      icon: 'fas fa-tag',
      color: 'bg-green-50 border-green-200',
      iconColor: 'text-green-600',
      textColor: 'text-green-900'
    },
    {
      label: 'Busiest Day',
      value: data.busiest_day || 'N/A',
      icon: 'fas fa-calendar-day',
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600',
      textColor: 'text-purple-900'
    },
    {
      label: 'Most Stops',
      value: Object.keys(data.stops_count || {}).sort((a,b)=>data.stops_count[b]-data.stops_count[a])[0] || 'N/A',
      icon: 'fas fa-route',
      color: 'bg-orange-50 border-orange-200',
      iconColor: 'text-orange-600',
      textColor: 'text-orange-900'
    }
  ];
  
  document.getElementById('summary-cards').innerHTML = cards.map(card => `
    <div class="border rounded-xl p-6 ${card.color} hover:shadow-lg transition-shadow duration-200">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-600 mb-1">${card.label}</p>
          <p class="text-2xl font-bold ${card.textColor}">${card.value}</p>
        </div>
        <div class="bg-white p-3 rounded-lg shadow-sm">
          <i class="${card.icon} text-xl ${card.iconColor}"></i>
        </div>
      </div>
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
  
  // Update button and status
  const btn = document.getElementById('scrape-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';
  btn.className = 'w-full bg-gray-400 text-white font-medium py-2 px-4 rounded-lg cursor-not-allowed';
  
  statusDiv.innerHTML = `
    <div class="inline-flex items-center px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
      <i class="fas fa-spinner fa-spin mr-2"></i>
      <span>Scraping flight data from ${origin} to ${destination}...</span>
    </div>
  `;
  
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
    statusDiv.innerHTML = `
      <div class="inline-flex items-center px-4 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
        <i class="fas fa-check-circle mr-2"></i>
        <span>${result.status || 'Analysis complete!'}</span>
      </div>
    `;
    // Refresh dashboard after scraping
    fetchAnalytics();
  } catch (e) {
    statusDiv.innerHTML = `
      <div class="inline-flex items-center px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium">
        <i class="fas fa-exclamation-triangle mr-2"></i>
        <span>Analysis failed: ${e.message}</span>
      </div>
    `;
  } finally {
    // Reset button
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-play mr-2"></i>Start Analysis';
    btn.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center';
  }
};

// Add a button to get AI insight manually
const aiBtn = document.createElement('button');
aiBtn.textContent = 'Refresh Insights';
aiBtn.className = 'bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center';
aiBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Refresh Insights';
aiBtn.onclick = fetchAIInsight;
document.querySelector('#ai-insights').parentElement.querySelector('h3').parentElement.appendChild(aiBtn);

fetchAnalytics();
