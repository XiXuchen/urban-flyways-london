const map = L.map("map", {
  zoomControl: false,
  preferCanvas: false
}).setView([51.5072, -0.1276], 10);

window.habitatMap = map;

L.control.zoom({ position: "topright" }).addTo(map);

map.createPane("msoaPane");
map.getPane("msoaPane").style.zIndex = 430;

map.createPane("contextPane");
map.getPane("contextPane").style.zIndex = 460;

L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap &copy; CARTO",
  opacity: 0.7,
  subdomains: "abcd",
  maxZoom: 19
}).addTo(map);

let geojsonLayer;
let allData;
let selectedLayer = null;
let currentMetric = "bird_count";
let hotspotOnly = false;
let compareMode = false;
let threshold = 300;
let selectedCompare = [];
let activeBorough = "all";
let activeConditionFilter = "all";
let pulseLayer = L.layerGroup().addTo(map);
let contextLayer = L.layerGroup([], { pane: "contextPane" }).addTo(map);
let woodlandLayer;
let waterLayer;

const conditionPalette = {
  "Green-rich": "#79a760",
  "Water-linked": "#4fa8c2",
  "Built-up": "#c98256",
  "Mixed": "#d8b456"
};

const activityBreaks = [
  { label: "0", min: 0, max: 0, color: "#f5f0e7" },
  { label: "1-5", min: 1, max: 5, color: "#dbe8bb" },
  { label: "6-20", min: 6, max: 20, color: "#aacb90" },
  { label: "21-100", min: 21, max: 100, color: "#74b5bd" },
  { label: "101-300", min: 101, max: 300, color: "#ddb45a" },
  { label: ">300", min: 301, max: Infinity, color: "#c96f52" }
];

const greenBreaks = [
  { label: "0-2%", min: 0, max: 2, color: "#f6f1e8" },
  { label: "2-6%", min: 2, max: 6, color: "#dcebb8" },
  { label: "6-12%", min: 6, max: 12, color: "#afd184" },
  { label: "12-25%", min: 12, max: 25, color: "#79a760" },
  { label: ">25%", min: 25, max: Infinity, color: "#3f7f4a" }
];

const waterBreaks = [
  { label: "0%", min: 0, max: 0.05, color: "#f6f1e8" },
  { label: "0.05-0.5%", min: 0.05, max: 0.5, color: "#d5edf0" },
  { label: "0.5-2%", min: 0.5, max: 2, color: "#93d1d8" },
  { label: "2-8%", min: 2, max: 8, color: "#4fa8c2" },
  { label: ">8%", min: 8, max: Infinity, color: "#23758f" }
];

const builtBreaks = [
  { label: "<25/km²", min: 0, max: 25, color: "#f5f0e7" },
  { label: "25-45/km²", min: 25, max: 45, color: "#ecd4b9" },
  { label: "45-65/km²", min: 45, max: 65, color: "#d9a982" },
  { label: "65-90/km²", min: 65, max: 90, color: "#c98256" },
  { label: ">90/km²", min: 90, max: Infinity, color: "#9f523f" }
];

const storyCopy = {
  overview: {
    title: "The pattern",
    text: "Start with all bird records, then isolate the strongest hotspots. The linked charts show which measured urban condition dominates.",
    metric: "bird_count"
  },
  edge: {
    title: "Green cover",
    text: "Green mode uses woodland_final.geojson to calculate the percentage of each MSOA covered by woodland or green habitat.",
    metric: "green_pct"
  },
  blue: {
    title: "Water corridors",
    text: "Blue mode uses water_final.geojson to show rivers, reservoirs and water bodies, then compares them with hotspot locations.",
    metric: "water_pct"
  },
  inner: {
    title: "Built form",
    text: "Built mode uses building centroid density to highlight dense urban fabric and test whether hotspots avoid or overlap with it.",
    metric: "building_density"
  }
};

function getBreakColor(value, breaks) {
  const v = Number(value || 0);
  return breaks.find(item => v >= item.min && v <= item.max)?.color || breaks[0].color;
}

function getCentroid(feature) {
  const coords = [];
  collectCoordinates(feature.geometry.coordinates, coords);
  const sum = coords.reduce((acc, point) => {
    acc.lng += point[0];
    acc.lat += point[1];
    return acc;
  }, { lng: 0, lat: 0 });
  return { lng: sum.lng / coords.length, lat: sum.lat / coords.length };
}

function collectCoordinates(node, coords) {
  if (typeof node[0] === "number") {
    coords.push(node);
    return;
  }
  node.forEach(child => collectCoordinates(child, coords));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getHotspotClass(value) {
  const v = Number(value || 0);
  if (v === 0) return "No records";
  if (v <= 20) return "Low";
  if (v <= 100) return "High";
  if (v <= 300) return "Strong";
  return "Major";
}

function enrichUrbanConditions(features, summary) {
  const metricsByCode = new Map(summary.records.map(row => [row.msoa21cd, row]));
  const densities = summary.records.map(row => Number(row.building_density || 0));
  const minDensity = Math.min(...densities);
  const maxDensity = Math.max(...densities);

  features.forEach(feature => {
    const p = feature.properties;
    const metrics = metricsByCode.get(p.msoa21cd) || {};
    const greenPct = Number(metrics.green_pct || 0);
    const waterPct = Number(metrics.water_pct || 0);
    const buildingDensity = Number(metrics.building_density || 0);
    const builtScore = maxDensity === minDensity
      ? 0
      : Math.round(((buildingDensity - minDensity) / (maxDensity - minDensity)) * 100);

    const scores = {
      green: clamp(Math.round((greenPct / 20) * 100), 0, 100),
      water: clamp(Math.round((waterPct / 6) * 100), 0, 100),
      built: clamp(builtScore, 0, 100)
    };

    let condition = "Mixed";
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] >= 38) {
      if (sorted[0][0] === "green") condition = "Green-rich";
      if (sorted[0][0] === "water") condition = "Water-linked";
      if (sorted[0][0] === "built") condition = "Built-up";
    }

    p.green_pct = greenPct;
    p.water_pct = waterPct;
    p.building_count = Number(metrics.building_count || 0);
    p.building_density = buildingDensity;
    p._centroid = getCentroid(feature);
    p._scores = scores;
    p._condition = condition;
  });
}

function getVisibleFeatures() {
  if (!allData) return [];
  return allData.features.filter(feature => !shouldDim(feature));
}

function shouldDim(feature) {
  const p = feature.properties;
  const count = Number(p.bird_count || 0);
  if (activeBorough !== "all" && p.lad22nm !== activeBorough) return true;
  if (activeConditionFilter !== "all" && p._condition !== activeConditionFilter) return true;
  if (hotspotOnly && count < threshold) return true;
  return false;
}

function styleFeature(feature) {
  const dimmed = shouldDim(feature);
  const p = feature.properties;
  let fillColor = getBreakColor(p.bird_count, activityBreaks);

  if (currentMetric === "green_pct") fillColor = getBreakColor(p.green_pct, greenBreaks);
  if (currentMetric === "water_pct") fillColor = getBreakColor(p.water_pct, waterBreaks);
  if (currentMetric === "building_density") fillColor = getBreakColor(p.building_density, builtBreaks);
  if (currentMetric === "condition") fillColor = conditionPalette[p._condition] || conditionPalette.Mixed;

  return {
    fillColor: dimmed ? "#eee9dc" : fillColor,
    fillOpacity: dimmed ? 0.24 : 0.84,
    color: dimmed ? "rgba(90,94,78,0.24)" : "rgba(38,49,40,0.58)",
    weight: Number(p.bird_count || 0) >= threshold ? 1.35 : 0.65,
    opacity: dimmed ? 0.5 : 1
  };
}

function updateContextLayers() {
  contextLayer.clearLayers();
  if (currentMetric === "green_pct" && woodlandLayer) contextLayer.addLayer(woodlandLayer);
  if (currentMetric === "water_pct" && waterLayer) contextLayer.addLayer(waterLayer);
}

function highlightFeature(event) {
  event.target.setStyle({ weight: 2.4, color: "#263128", fillOpacity: 0.96 });
  event.target.bringToFront();
  updateHoverCard(event.target.feature);
}

function resetHighlight(event) {
  if (event.target !== selectedLayer) geojsonLayer.resetStyle(event.target);
  if (!selectedLayer) resetHoverCard();
}

function describeFeature(feature) {
  const p = feature.properties;
  const count = Number(p.bird_count || 0);
  if (count >= threshold) {
    return `This hotspot combines ${p.green_pct.toFixed(1)}% green cover, ${p.water_pct.toFixed(1)}% water cover and ${p.building_density.toFixed(1)} buildings/km². Read it as a cumulative 2021-2025 observation hotspot, not a single-year trend.`;
  }
  return `This MSOA has ${p.green_pct.toFixed(1)}% green cover, ${p.water_pct.toFixed(1)}% water cover and ${p.building_density.toFixed(1)} buildings/km². Compare it with hotspots to see whether habitat conditions differ.`;
}

function selectFeature(feature, layer) {
  if (selectedLayer) geojsonLayer.resetStyle(selectedLayer);
  selectedLayer = layer;
  layer.setStyle({ weight: 3, color: "#263128", fillOpacity: 0.96 });

  const p = feature.properties;
  document.getElementById("area-name").textContent = p.msoa21nm || "Unknown MSOA";
  document.getElementById("area-borough").textContent = p.lad22nm || "Unknown borough";
  document.getElementById("bird-count").textContent = Number(p.bird_count || 0).toLocaleString();
  document.getElementById("hotspot-class").textContent = `${p.green_pct.toFixed(1)}%`;
  document.getElementById("setting-class").textContent = `${p.water_pct.toFixed(1)}%`;
  document.getElementById("setting-confidence").textContent = `${p.building_density.toFixed(1)}`;
  document.getElementById("interpretation").textContent = describeFeature(feature);
}

function updateComparePanel() {
  const box = document.getElementById("compareList");
  if (!selectedCompare.length) {
    box.innerHTML = "<p>No areas selected. Turn on Compare 2 and click two MSOAs.</p>";
  } else {
    box.innerHTML = selectedCompare.map(f => {
      const p = f.properties;
      return `<span class="compare-pill">${p.msoa21nm}: ${p.green_pct.toFixed(1)}% green, ${p.water_pct.toFixed(1)}% water</span>`;
    }).join("");
  }
  updateCompareChart(selectedCompare);
}

function updateHoverCard(feature) {
  const p = feature.properties;
  const card = document.getElementById("hoverCard");
  card.innerHTML = `
    <span>${p.lad22nm || "London MSOA"}</span>
    <strong>${p.msoa21nm || "Unknown MSOA"}</strong>
    <p>${Number(p.bird_count || 0).toLocaleString()} records | ${p._condition}</p>
    <div class="signature-bars">
      ${smallFingerprintRow("Green", p._scores.green || 0, "#6f8f63")}
      ${smallFingerprintRow("Water", p._scores.water || 0, "#6fa8b8")}
      ${smallFingerprintRow("Built", p._scores.built || 0, "#b8735a")}
    </div>
  `;
}

function smallFingerprintRow(label, value, color) {
  return `<div class="signature-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${value}%; background:${color}"></div></div><strong>${value}</strong></div>`;
}

function resetHoverCard() {
  document.getElementById("hoverCard").innerHTML = "<span>Hover an MSOA</span><strong>Measured habitat profile appears here</strong>";
}

function onEachFeature(feature, layer) {
  const p = feature.properties;
  layer.bindPopup(`
    <strong>${p.msoa21nm || "Unknown MSOA"}</strong><br>
    Borough: ${p.lad22nm || "Unknown"}<br>
    Bird records: ${Number(p.bird_count || 0).toLocaleString()}<br>
    Green: ${p.green_pct.toFixed(1)}% | Water: ${p.water_pct.toFixed(1)}%<br>
    Buildings: ${p.building_density.toFixed(1)}/km²
  `);

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: () => {
      if (compareMode) {
        if (!selectedCompare.find(f => f.properties.msoa21cd === p.msoa21cd)) {
          selectedCompare.push(feature);
          if (selectedCompare.length > 2) selectedCompare.shift();
        }
        updateComparePanel();
      }
      selectFeature(feature, layer);
    }
  });
}

function updateLegend() {
  const legend = document.getElementById("legend");
  legend.innerHTML = "";

  const configs = {
    bird_count: {
      title: "Bird records",
      mapTitle: "Recorded bird hotspots",
      description: "MSOA-level cumulative bird observation records, 2021-2025.",
      rows: activityBreaks
    },
    green_pct: {
      title: "Green cover",
      mapTitle: "Measured green cover",
      description: "Woodland/green cover percentage calculated from woodland_final.geojson.",
      rows: greenBreaks
    },
    water_pct: {
      title: "Water cover",
      mapTitle: "Measured water cover",
      description: "Water coverage percentage calculated from water_final.geojson.",
      rows: waterBreaks
    },
    building_density: {
      title: "Building density",
      mapTitle: "Measured built density",
      description: "Building centroid density from building_centroid_10.geojson, shown as points per km².",
      rows: builtBreaks
    },
    condition: {
      title: "Dominant setting",
      mapTitle: "Dominant measured setting",
      description: "Classification based on measured green cover, water cover and building density.",
      rows: Object.entries(conditionPalette).map(([label, color]) => ({ label, color }))
    }
  };

  const c = configs[currentMetric] || configs.bird_count;
  document.getElementById("legend-title").textContent = c.title;
  document.getElementById("map-title").textContent = c.mapTitle;
  document.getElementById("map-description").textContent = c.description;
  c.rows.forEach(row => {
    legend.innerHTML += `<div class="legend-row"><span class="swatch" style="background:${row.color}"></span><span>${row.label}</span></div>`;
  });
}

function setMetric(metric) {
  currentMetric = metric;
  document.querySelectorAll(".rail-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === metric));
  geojsonLayer.setStyle(styleFeature);
  updateContextLayers();
  updateLegend();
}

function refreshFilteredViews() {
  geojsonLayer.setStyle(styleFeature);
  updateKpis(allData.features);
  updateConditionChart(getVisibleFeatures(), threshold);
  updateTopChart(getVisibleFeatures());
  drawPulseMarkers(getVisibleFeatures());
}

window.focusFeatureByCode = function focusFeatureByCode(code) {
  const feature = allData.features.find(f => f.properties.msoa21cd === code);
  if (feature) focusFeature(feature);
};

window.filterByCondition = function filterByCondition(condition) {
  activeConditionFilter = activeConditionFilter === condition ? "all" : condition;
  currentMetric = "condition";
  document.querySelectorAll(".rail-btn").forEach(btn => btn.classList.remove("active"));
  geojsonLayer.setStyle(styleFeature);
  updateContextLayers();
  updateLegend();
  updateKpis(allData.features);
  drawPulseMarkers(getVisibleFeatures());
  document.getElementById("story-title").textContent = activeConditionFilter === "all" ? "Environment mix" : `${condition} hotspots`;
  document.getElementById("story-text").textContent = activeConditionFilter === "all"
    ? "Click a chart segment to isolate one measured setting."
    : `Filtering the map to ${condition} MSOAs. Click the same segment again to clear it.`;
};

document.querySelectorAll(".rail-btn").forEach(btn => btn.addEventListener("click", () => setMetric(btn.dataset.mode)));

document.getElementById("allBtn").addEventListener("click", () => {
  hotspotOnly = false;
  document.getElementById("allBtn").classList.add("active");
  document.getElementById("hotspotBtn").classList.remove("active");
  refreshFilteredViews();
});

document.getElementById("hotspotBtn").addEventListener("click", () => {
  hotspotOnly = true;
  document.getElementById("hotspotBtn").classList.add("active");
  document.getElementById("allBtn").classList.remove("active");
  refreshFilteredViews();
});

document.getElementById("compareBtn").addEventListener("click", () => {
  compareMode = !compareMode;
  document.getElementById("compareBtn").classList.toggle("active", compareMode);
});

document.getElementById("thresholdSlider").addEventListener("input", event => {
  threshold = Number(event.target.value);
  document.getElementById("thresholdValue").textContent = `${threshold}+`;
  refreshFilteredViews();
});

document.getElementById("boroughSelect").addEventListener("change", event => {
  activeBorough = event.target.value;
  refreshFilteredViews();
});

document.getElementById("flyBtn").addEventListener("click", () => {
  const top = getTopFeatures(getVisibleFeatures().length ? getVisibleFeatures() : allData.features, 1)[0];
  if (top) focusFeature(top);
});

document.getElementById("resetViewBtn").addEventListener("click", () => {
  activeBorough = "all";
  hotspotOnly = false;
  activeConditionFilter = "all";
  document.getElementById("boroughSelect").value = "all";
  document.getElementById("allBtn").classList.add("active");
  document.getElementById("hotspotBtn").classList.remove("active");
  setStory("overview");
  map.fitBounds(geojsonLayer.getBounds(), { padding: [36, 36], maxZoom: 10 });
  refreshFilteredViews();
});

document.getElementById("randomHotspotBtn").addEventListener("click", () => {
  const visible = getVisibleFeatures();
  const pool = visible.filter(f => Number(f.properties.bird_count || 0) >= threshold);
  const source = pool.length ? pool : getTopFeatures(visible.length ? visible : allData.features, 20);
  const feature = source[Math.floor(Math.random() * source.length)];
  if (feature) focusFeature(feature);
});

document.querySelectorAll(".story-btn").forEach(button => {
  button.addEventListener("click", () => setStory(button.dataset.story));
});

document.getElementById("storyFocusBtn").addEventListener("click", () => {
  if (currentStoryFeature) focusFeature(currentStoryFeature);
  if (activeStory === "overview") {
    hotspotOnly = true;
    document.getElementById("hotspotBtn").classList.add("active");
    document.getElementById("allBtn").classList.remove("active");
    refreshFilteredViews();
  }
});

function setStory(story) {
  activeStory = story;
  const copy = storyCopy[story];
  document.querySelectorAll(".story-btn").forEach(button => button.classList.toggle("active", button.dataset.story === story));
  document.getElementById("story-title").textContent = copy.title;
  document.getElementById("story-text").textContent = copy.text;
  setMetric(copy.metric);
  currentStoryFeature = getStoryFeature(story);
  if (story !== "overview" && currentStoryFeature) focusFeature(currentStoryFeature);
}

function getStoryFeature(story) {
  const hotspots = [...allData.features].filter(f => Number(f.properties.bird_count || 0) >= threshold)
    .sort((a, b) => Number(b.properties.bird_count || 0) - Number(a.properties.bird_count || 0));
  if (story === "edge") return hotspots.sort((a, b) => b.properties.green_pct - a.properties.green_pct)[0] || hotspots[0];
  if (story === "blue") return hotspots.sort((a, b) => b.properties.water_pct - a.properties.water_pct)[0] || hotspots[0];
  if (story === "inner") return hotspots.sort((a, b) => b.properties.building_density - a.properties.building_density)[0] || hotspots[0];
  return hotspots[0] || getTopFeatures(allData.features, 1)[0];
}

function focusFeature(feature) {
  const layer = geojsonLayer.getLayers().find(l => l.feature.properties.msoa21cd === feature.properties.msoa21cd);
  if (!layer) return;
  map.fitBounds(layer.getBounds(), { padding: [110, 110], maxZoom: 12 });
  selectFeature(feature, layer);
  updateHoverCard(feature);
  layer.openPopup();
}

function updateKpis(features) {
  const visible = getVisibleFeatures().length ? getVisibleFeatures() : features;
  const total = visible.reduce((sum, f) => sum + Number(f.properties.bird_count || 0), 0);
  const majorFeatures = visible.filter(f => Number(f.properties.bird_count || 0) >= threshold);
  const boroughTotals = {};
  visible.forEach(f => {
    const borough = f.properties.lad22nm || "Unknown";
    boroughTotals[borough] = (boroughTotals[borough] || 0) + Number(f.properties.bird_count || 0);
  });
  const topBorough = Object.entries(boroughTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "--";
  const signature = getSharedSignature(majorFeatures);

  document.getElementById("kpi-total").textContent = total.toLocaleString();
  document.getElementById("kpi-major").textContent = majorFeatures.length.toLocaleString();
  document.getElementById("kpi-borough").textContent = topBorough;
  document.getElementById("kpi-signature").textContent = signature.label;
  document.getElementById("answer-title").textContent = signature.headline;
  document.getElementById("answer-text").textContent = signature.text;
  updateSignatureBars(majorFeatures);
}

function getSharedSignature(features) {
  if (!features.length) {
    return {
      label: "No hotspots at this filter",
      headline: "No shared condition is visible under the current filter.",
      text: "Lower the threshold or broaden the borough filter to inspect the measured habitat profile."
    };
  }
  const avg = features.reduce((acc, f) => {
    acc.green += f.properties.green_pct;
    acc.water += f.properties.water_pct;
    acc.built += f.properties.building_density;
    return acc;
  }, { green: 0, water: 0, built: 0 });
  Object.keys(avg).forEach(key => avg[key] = avg[key] / features.length);

  const label = avg.green >= 5 ? "Green-rich hotspots" : avg.water >= 1 ? "Water-linked hotspots" : "Built-context hotspots";
  const headline = avg.green >= 5
    ? "Hotspots share a measurable green-space signal."
    : avg.water >= 1
      ? "Hotspots show a measurable water-corridor signal."
      : "Hotspots sit in mixed and built urban contexts.";
  const text = `At the current threshold, hotspot MSOAs average ${avg.green.toFixed(1)}% green cover, ${avg.water.toFixed(1)}% water cover and ${avg.built.toFixed(1)} buildings/km².`;
  return { label, headline, text };
}

function updateSignatureBars(features) {
  const box = document.getElementById("signatureBars");
  const avg = features.length ? features.reduce((acc, f) => {
    acc.green += f.properties.green_pct;
    acc.water += f.properties.water_pct;
    acc.built += f.properties.building_density;
    return acc;
  }, { green: 0, water: 0, built: 0 }) : { green: 0, water: 0, built: 0 };
  Object.keys(avg).forEach(key => avg[key] = features.length ? avg[key] / features.length : 0);
  const rows = [
    ["Green cover", Math.round(Math.min(100, avg.green / 20 * 100)), `${avg.green.toFixed(1)}%`, "#6f8f63"],
    ["Water cover", Math.round(Math.min(100, avg.water / 6 * 100)), `${avg.water.toFixed(1)}%`, "#6fa8b8"],
    ["Buildings", Math.round(Math.min(100, avg.built / 120 * 100)), `${avg.built.toFixed(0)}/km²`, "#b8735a"]
  ];
  box.innerHTML = rows.map(([label, width, value, color]) => `
    <div class="signature-row">
      <span>${label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${width}%; background:${color}"></div></div>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function populateBoroughs(features) {
  const select = document.getElementById("boroughSelect");
  const boroughs = [...new Set(features.map(f => f.properties.lad22nm).filter(Boolean))].sort();
  boroughs.forEach(borough => {
    const option = document.createElement("option");
    option.value = borough;
    option.textContent = borough;
    select.appendChild(option);
  });
}

function drawPulseMarkers(features) {
  pulseLayer.clearLayers();
  getTopFeatures(features, 14).forEach(feature => {
    const p = feature.properties;
    const size = Math.max(10, Math.min(24, Number(p.bird_count || 0) / 42));
    const marker = L.marker([p._centroid.lat, p._centroid.lng], {
      icon: L.divIcon({ className: "pulse-marker", html: "", iconSize: [size, size] })
    });
    marker.on("click", () => focusFeature(feature));
    marker.addTo(pulseLayer);
  });
}

function createContextLayers(woodland, water) {
  woodlandLayer = L.geoJSON(woodland, {
    pane: "contextPane",
    interactive: false,
    style: { fillColor: "#6f8f63", fillOpacity: 0.26, color: "#4f724e", weight: 0.8, opacity: 0.55 }
  });
  waterLayer = L.geoJSON(water, {
    pane: "contextPane",
    interactive: false,
    style: { fillColor: "#6fa8b8", fillOpacity: 0.34, color: "#3e7f91", weight: 0.8, opacity: 0.65 }
  });
}

let lastTrailAt = 0;
document.addEventListener("mousemove", event => {
  const now = performance.now();
  if (now - lastTrailAt < 180) return;
  lastTrailAt = now;
  const trail = document.getElementById("cursorTrail");
  if (!trail) return;
  const bird = document.createElement("span");
  bird.className = "trail-bird";
  bird.textContent = "🐦";
  bird.style.left = `${event.clientX + 10}px`;
  bird.style.top = `${event.clientY + 8}px`;
  trail.appendChild(bird);
  window.setTimeout(() => bird.remove(), 1050);
});

function loadJsonWithFallback(fileName, label) {
  const candidates = [`data/${fileName}`, `./data/${fileName}`, fileName];
  const tryPath = (i) => {
    const url = candidates[i];
    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`${label} not found at ${url}`);
        return res.json();
      })
      .catch(err => {
        if (i < candidates.length - 1) return tryPath(i + 1);
        throw err;
      });
  };
  return tryPath(0);
}

Promise.all([
  loadJsonWithFallback("London_BHP_Results_2025.geojson", "BHP polygons"),
  loadJsonWithFallback("urban_condition_summary.json", "urban condition summary").catch(()=>null),
  loadJsonWithFallback("woodland_final.geojson", "woodland layer").catch(()=>({type:"FeatureCollection",features:[]})),
  loadJsonWithFallback("water_final.geojson", "water layer").catch(()=>({type:"FeatureCollection",features:[]}))
])
  .then(([birdData, summary, woodland, water]) => {
    allData = birdData;
    if(!summary || !summary.records){
      summary = {records: allData.features.map(f=>({msoa21cd:f.properties.msoa21cd, green_pct: Number(f.properties.Hi_final||0)*20, water_pct: Number(f.properties.Ci_n||0)*6, building_count:0, building_density: Number(f.properties.Di_n||0)*120}))};
    }
    enrichUrbanConditions(allData.features, summary);
    createContextLayers(woodland, water);

    geojsonLayer = L.geoJSON(allData, {
      pane: "msoaPane",
      style: styleFeature,
      onEachFeature
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds(), { padding: [36, 36], maxZoom: 10 });
    const mapStatus = document.getElementById("mapStatus");
    if (mapStatus) {
      mapStatus.textContent = `${allData.features.length.toLocaleString()} MSOA polygons loaded`;
      mapStatus.classList.add("ready");
    }

    populateBoroughs(allData.features);
    updateKpis(allData.features);
    createConditionChart(allData.features, threshold);
    createTopChart(allData.features);
    drawPulseMarkers(allData.features);
    updateLegend();
  })
  .catch(err => {
    console.error("Habitat map data load failed:", err);
    const mapStatus = document.getElementById("mapStatus");
    if (mapStatus) {
      mapStatus.textContent = "Habitat map data could not load. Keep the data folder beside index.html and open with Live Server.";
      mapStatus.classList.remove("ready");
    }
  });
