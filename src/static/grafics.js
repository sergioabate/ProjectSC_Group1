// Contextos dels gràfics (on es dibuixa)
const uploadChartCtx = document.getElementById('uploadChart').getContext('2d');
const downloadChartCtx = document.getElementById('downloadChart').getContext('2d');
const delayChartCtx = document.getElementById('delayChart').getContext('2d');
const packetLossChartCtx = document.getElementById('packetLossChart').getContext('2d');

// Crea els gràfics
const uploadChart = new Chart(uploadChartCtx, {
    type: 'line',
    data: {
        labels: [], // Timestamps will be added dynamically
        datasets: [{
            label: 'Upload Throughput (B/s)',
            data: [], // Data points will be added dynamically
            borderColor: 'blue',
            fill: false,
        }],
    },
    options: { scales: { x: { display: true }, y: { beginAtZero: true } } },
});

const downloadChart = new Chart(downloadChartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Download Throughput (B/s)',
            data: [],
            borderColor: 'green',
            fill: false,
        }],
    },
    options: { scales: { x: { display: true }, y: { beginAtZero: true } } },
});

const delayChart = new Chart(delayChartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Delay (ms)',
            data: [],
            borderColor: 'orange',
            fill: false,
        }],
    },
    options: { scales: { x: { display: true }, y: { beginAtZero: true } } },
});

const packetLossChart = new Chart(packetLossChartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Packet Loss (%)',
            data: [],
            borderColor: 'red',
            fill: false,
        }],
    },
    options: { scales: { x: { display: true }, y: { beginAtZero: true } } },
});

function addData(chart, label, data) {
    // Limit chart data points to 20 for better readability
    if (chart.data.labels.length > 120) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(data);

    chart.update();
}