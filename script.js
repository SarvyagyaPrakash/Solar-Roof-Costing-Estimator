document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const areaInput = document.getElementById('roof-area');
    const areaValDisplay = document.getElementById('area-val');
    const btnInc = document.getElementById('btn-inc');
    const btnDec = document.getElementById('btn-dec');

    // Output Elements
    const systemSizeEl = document.getElementById('system-size');
    const systemCostEl = document.getElementById('system-cost');
    const annualProdEl = document.getElementById('annual-production');
    const annualSavingsEl = document.getElementById('annual-savings');

    // Chart.js Context
    const ctx = document.getElementById('roiChart').getContext('2d');
    let roiChart;

    // Constants (Indian Market Perspective)
    const CONSTANTS = {
        SQM_PER_KW: 10,          // ~10m² usually required per 1kW in India (conservative)
        ANNUAL_GEN_PER_KW: 1450, // Approx 1450 units (kWh) per kW per year in India
        COST_PER_KW: 75000,      // Avg residential cost ₹75,000 per kW
        ENERGY_RATE: 7.00,       // Approx ₹7 per unit
        CO2_PER_KWH: 0.82,       // India specific grid emission factor
        TREES_PER_TON_CO2: 50
    };

    // Formatters
    const currencyFmt = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });

    const numberFmt = new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 1
    });

    /**
     * Main Calculation Function
     */
    function calculateData(area) {
        // 1. System Size (kW)
        const systemSizeKW = area / CONSTANTS.SQM_PER_KW;

        // 2. Annual Production (kWh) - "Units"
        const annualProduction = systemSizeKW * CONSTANTS.ANNUAL_GEN_PER_KW;

        // 3. System Cost
        const systemCost = systemSizeKW * CONSTANTS.COST_PER_KW;

        // 4. Annual Savings
        const annualSavings = annualProduction * CONSTANTS.ENERGY_RATE;

        // 5. Environmental Impact
        const co2SavingsKg = annualProduction * CONSTANTS.CO2_PER_KWH;
        const co2SavingsTons = co2SavingsKg / 1000;
        const treesPlanted = co2SavingsTons * CONSTANTS.TREES_PER_TON_CO2;

        return {
            systemSizeKW,
            systemCost,
            annualProduction,
            annualSavings,
            treesPlanted,
            co2SavingsTons
        };
    }

    /**
     * Update UI with Animation
     */
    function updateUI(data) {
        animateValue(systemSizeEl, data.systemSizeKW, 1);
        animateValue(systemCostEl, data.systemCost, 0, true);
        animateValue(annualProdEl, data.annualProduction, 0);
        animateValue(annualSavingsEl, data.annualSavings, 0, true);

        // Impact
        document.getElementById('trees-planted').textContent = Math.round(data.treesPlanted);
        document.getElementById('co2-offset').textContent = data.co2SavingsTons.toFixed(1);
    }

    /**
     * Simple number animation
     */
    function animateValue(obj, end, decimals, isCurrency = false) {
        let startTimestamp = null;
        const duration = 400;
        const start = parseFloat(obj.textContent.replace(/[^0-9.-]+/g, "")) || 0;

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            let value = progress * (end - start) + start;

            if (isCurrency) {
                obj.textContent = currencyFmt.format(value);
            } else {
                obj.textContent = numberFmt.format(value.toFixed(decimals));
            }

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                if (isCurrency) obj.textContent = currencyFmt.format(end);
                else obj.textContent = numberFmt.format(end.toFixed(decimals));
            }
        };
        window.requestAnimationFrame(step);
    }


    /**
     * ROI Chart Logic
     */
    function updateChart(data) {
        const years = Array.from({ length: 26 }, (_, i) => i); // 0 to 25
        const cumulativeData = [];

        let balance = -data.systemCost;

        for (let year = 0; year <= 25; year++) {
            if (year === 0) {
                cumulativeData.push(balance);
            } else {
                // Assume 3% increase in electricity cost/savings per year (inflation)
                const yearlySavings = data.annualSavings * Math.pow(1.03, year - 1);
                balance += yearlySavings;
                cumulativeData.push(balance);
            }
        }

        const isDark = document.body.hasAttribute('data-theme');
        const textColor = isDark ? '#E0E0E0' : '#6D4C41';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(109, 76, 65, 0.1)';
        const ticksColor = isDark ? '#BDBDBD' : '#8D6E63';

        if (roiChart) {
            roiChart.data.datasets[0].data = cumulativeData;
            roiChart.update();
        } else {
            roiChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: years.map(y => `Year ${y}`),
                    datasets: [{
                        label: 'Cumulative Savings',
                        data: cumulativeData,
                        borderColor: '#50C878', // Teal Pop
                        backgroundColor: 'rgba(80, 200, 120, 0.2)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: textColor }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return currencyFmt.format(context.raw);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            grid: { color: gridColor },
                            title: {
                                display: true,
                                text: 'Net Financial Position (Thousands ₹)',
                                color: textColor,
                                font: { size: 12, weight: 'bold' }
                            },
                            ticks: {
                                color: ticksColor,
                                callback: function (value) {
                                    // Divide by 1000 and add 'k'
                                    return (value / 1000).toFixed(0) + 'k';
                                }
                            }
                        },
                        x: {
                            grid: { display: false },
                            title: {
                                display: true,
                                text: 'Timeline (Years)',
                                color: textColor,
                                font: { size: 12, weight: 'bold' }
                            },
                            ticks: {
                                color: ticksColor,
                                callback: function (val, index) {
                                    // Show label every 2 years
                                    return index % 2 === 0 ? `Year ${index}` : '';
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    /**
     * Input Handling
     */
    function updateApp(val) {
        areaInput.value = val;
        areaValDisplay.textContent = val;
        const data = calculateData(val);
        updateUI(data);
        updateChart(data);
    }

    // Slider
    areaInput.addEventListener('input', (e) => {
        updateApp(parseInt(e.target.value));
    });

    // Buttons
    btnInc.addEventListener('click', () => {
        let val = parseInt(areaInput.value);
        if (val < 500) {
            val += 5; // Step by 5 for button click
            updateApp(val);
        }
    });

    btnDec.addEventListener('click', () => {
        let val = parseInt(areaInput.value);
        if (val > 10) {
            val -= 5;
            updateApp(val);
        }
    });

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            body.setAttribute('data-theme', 'dark');
            if (roiChart) {
                updateChartColors('#E0E0E0', '#BDBDBD', 'rgba(255,255,255,0.1)');
            }
        } else {
            body.removeAttribute('data-theme');
            if (roiChart) {
                updateChartColors('#6D4C41', '#8D6E63', 'rgba(109, 76, 65, 0.1)');
            }
        }
    });

    function updateChartColors(textColor, ticksColor, gridColor) {
        roiChart.options.scales.x.title.color = textColor;
        roiChart.options.scales.x.ticks.color = ticksColor;
        roiChart.options.scales.y.title.color = textColor;
        roiChart.options.scales.y.ticks.color = ticksColor;
        roiChart.options.scales.y.grid.color = gridColor;
        roiChart.options.plugins.legend.labels.color = textColor;
        roiChart.update();
    }

    // Initial Calculation
    const initialData = calculateData(50);
    updateUI(initialData);
    updateChart(initialData);

});
