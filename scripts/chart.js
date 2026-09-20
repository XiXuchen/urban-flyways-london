let compareChart;
let conditionChart;
let topChart;

const chartText = "#263128";
const chartMuted = "#667267";
const gridLine = "rgba(65, 75, 58, 0.14)";
const settingColors = {
  "Green-rich": "#6f8f63",
  "Water-linked": "#6fa8b8",
  "Built-up": "#b8735a",
  "Mixed": "#e0b65f"
};

Chart.defaults.font.family = "Inter, Segoe UI, Arial, sans-serif";
Chart.defaults.color = chartText;
Chart.defaults.plugins.tooltip.backgroundColor = "rgba(38, 49, 40, 0.9)";
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;

function createCompareChart() {
  const ctx = document.getElementById("compareChart");

  compareChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels: ["Green %", "Water %", "Buildings", "Bird records"],
      datasets: []
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 10, font: { size: 11 } }
        }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { display: false, stepSize: 25 },
          angleLines: { color: gridLine },
          grid: { color: gridLine },
          pointLabels: { color: chartMuted, font: { size: 10, weight: "700" } }
        }
      }
    }
  });
}

function updateCompareChart(selected) {
  const palette = ["#7e546c", "#6fa8b8"];
  compareChart.data.datasets = selected.map((feature, index) => {
    const p = feature.properties;
    const scores = p._scores || { green: 0, water: 0, built: 0 };
    const recordScore = Math.min(100, Math.round((Number(p.bird_count || 0) / 1000) * 100));

    return {
      label: p.msoa21nm || `Area ${index + 1}`,
      data: [scores.green, scores.water, scores.built, recordScore],
      borderColor: palette[index],
      backgroundColor: `${palette[index]}2e`,
      pointBackgroundColor: palette[index],
      borderWidth: 2
    };
  });

  compareChart.update();
}

function createConditionChart(features, threshold) {
  const summary = summariseConditions(features, threshold);
  const labels = Object.keys(summary);

  const ctx = document.getElementById("conditionChart");
  conditionChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: Object.values(summary),
        backgroundColor: labels.map(label => settingColors[label]),
        borderColor: "#fffaf0",
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (event, elements) => {
        if (!elements.length || typeof window.filterByCondition !== "function") return;
        const label = conditionChart.data.labels[elements[0].index];
        window.filterByCondition(label);
      },
      cutout: "62%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 10, color: chartText, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: item => `${item.label}: ${item.raw} hotspot MSOAs`
          }
        }
      }
    }
  });
}

function updateConditionChart(features, threshold) {
  if (!conditionChart) return;
  const summary = summariseConditions(features, threshold);
  const labels = Object.keys(summary);

  conditionChart.data.labels = labels;
  conditionChart.data.datasets[0].data = Object.values(summary);
  conditionChart.data.datasets[0].backgroundColor = labels.map(label => settingColors[label]);
  conditionChart.update();
}

function createTopChart(features) {
  const top = getTopFeatures(features, 8);
  const ctx = document.getElementById("topChart");

  topChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top.map(f => f.properties.msoa21nm || f.properties.lad22nm),
      datasets: [{
        data: top.map(f => Number(f.properties.bird_count || 0)),
        backgroundColor: top.map(f => settingColors[f.properties._condition] || "#667267"),
        borderWidth: 0,
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (event, elements) => {
        if (!elements.length || typeof window.focusFeatureByCode !== "function") return;
        const feature = topChart.$features?.[elements[0].index];
        if (feature) window.focusFeatureByCode(feature.properties.msoa21cd);
      },
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: item => {
              const feature = topChart.$features?.[item.dataIndex];
              return feature ? `Habitat: ${feature.properties._condition}` : "";
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: chartMuted, font: { size: 10 } },
          grid: { color: gridLine }
        },
        y: {
          ticks: { color: chartText, font: { size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
  topChart.$features = top;
}

function updateTopChart(features) {
  if (!topChart) return;
  const top = getTopFeatures(features, 8);
  topChart.data.labels = top.map(f => f.properties.msoa21nm || f.properties.lad22nm);
  topChart.data.datasets[0].data = top.map(f => Number(f.properties.bird_count || 0));
  topChart.data.datasets[0].backgroundColor = top.map(f => settingColors[f.properties._condition] || "#667267");
  topChart.$features = top;
  topChart.update();
}

function getTopFeatures(features, count) {
  return [...features]
    .sort((a, b) => Number(b.properties.bird_count || 0) - Number(a.properties.bird_count || 0))
    .slice(0, count);
}

function summariseConditions(features, threshold) {
  const summary = {
    "Green-rich": 0,
    "Water-linked": 0,
    "Built-up": 0,
    "Mixed": 0
  };

  features
    .filter(f => Number(f.properties.bird_count || 0) >= threshold)
    .forEach(f => {
      const condition = f.properties._condition || "Mixed";
      summary[condition] = (summary[condition] || 0) + 1;
    });

  return summary;
}

createCompareChart();
