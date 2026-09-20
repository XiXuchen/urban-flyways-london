const colors = {
  bird: "#f2795f",
  green: "#4f9f68",
  blue: "#45a9c2",
  built: "#c98256",
  gold: "#f0bb45",
  plum: "#8d5c80",
  cream: "#fff7e8",
  ink: "#17322b"
};

const speciesLabels = {
  "Common Swift": "Common Swift",
  "Barn Swallow": "Barn Swallow",
  "House Martin": "House Martin"
};

const seasons = ["Spring", "Summer", "Autumn"];
const species = ["Common Swift", "Barn Swallow", "House Martin"];

const attentionColors = {
  "Stable Habitat Core": "#4f9f68",
  "Potential Corridor": "#45a9c2",
  "Urban Pressure Area": "#f2795f",
  "Lower Priority Matrix": "#d9cfae"
};

const habitatColors = {
  "Green-rich": "#4f9f68",
  "Water-linked": "#45a9c2",
  "Built-up": "#c98256",
  "Mixed": "#f0bb45"
};

let siteData;
let msoaData;
let selectedSpecies = "Common Swift";
let selectedSeason = "Spring";
let selectedHabitatMetric = "green_pct";
let compareSelection = [];

const hotspotMap = createMap("hotspotMap");
const habitatMap = createMap("habitatMap");
const attentionMap = createMap("attentionMap");

let hotspotLayer;
let habitatLayer;
let attentionLayer;
let topSpeciesChart;
let monthlyChart;
let boroughChart;
let habitatRadar;

function animateNumber(element, target, suffix = "") {
  if (!element) return;
  const duration = 900;
  const start = performance.now();
  const formatter = new Intl.NumberFormat("en-GB");
  const tick = now => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = `${formatter.format(Math.round(target * eased))}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function updateHeroStats() {
  const totalRecords = msoaData.features.reduce((sum, feature) => sum + Number(feature.properties.bird_count || 0), 0);
  animateNumber(document.getElementById("heroRecords"), totalRecords);
  animateNumber(document.getElementById("heroMsoas"), msoaData.features.length);
}

function activateChapter(targetId) {
  const chapters = [...document.querySelectorAll(".chapter")];
  const target = document.getElementById(targetId) || chapters[0];
  chapters.forEach(chapter => chapter.classList.toggle("is-active", chapter === target));
  document.querySelectorAll("[data-jump]").forEach(link => {
    link.classList.toggle("active", link.dataset.jump === target.id);
  });
  document.querySelectorAll(".progress-rail span").forEach((dot, index) => {
    dot.classList.toggle("active", index === Number(target.dataset.chapter || 0));
  });
  history.replaceState(null, "", `#${target.id}`);
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  window.dispatchEvent(new CustomEvent("flyways:chapterchange", { detail: { id: target.id } }));
}

document.querySelectorAll("[data-next]").forEach(button => {
  button.addEventListener("click", () => {
    const current = document.querySelector(".chapter.is-active") || document.querySelector(".chapter");
    const chapters = [...document.querySelectorAll(".chapter")];
    const next = chapters[Math.min(chapters.length - 1, chapters.indexOf(current) + 1)];
    activateChapter(next.id);
  });
});

document.querySelectorAll("[data-jump]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    activateChapter(link.dataset.jump);
    if (link.dataset.panelTarget) {
      activateSubpanel(link.dataset.panelTarget);
    }
    link.closest("details")?.removeAttribute("open");
  });
});

function activateSubpanel(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const group = panel.closest(".story-panel");
  group.querySelectorAll(".subnav button").forEach(item => item.classList.toggle("active", item.dataset.panel === panelId));
  group.querySelectorAll(".subpanel").forEach(item => item.classList.toggle("active", item.id === panelId));
}

document.querySelectorAll(".subnav button").forEach(button => {
  button.addEventListener("click", () => activateSubpanel(button.dataset.panel));
});

document.addEventListener("keydown", event => {
  if (event.key !== "ArrowDown" && event.key !== "PageDown" && event.key !== "ArrowUp" && event.key !== "PageUp") return;
  const current = document.querySelector(".chapter.is-active") || document.querySelector(".chapter");
  const chapters = [...document.querySelectorAll(".chapter")];
  const offset = event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 1;
  const nextIndex = Math.max(0, Math.min(chapters.length - 1, chapters.indexOf(current) + offset));
  if (chapters[nextIndex] !== current) {
    event.preventDefault();
    activateChapter(chapters[nextIndex].id);
  }
});

const strategyCopy = {
  protect: ["Protect habitat cores", "Start with repeated hotspots that already overlap measured habitat. These are the strongest candidates for conservation attention.", "High", "MSOA + corridor", "Observer bias"],
  connect: ["Connect corridors", "Treat green-edge and water-linked hotspots as stepping stones. The planning question becomes continuity, not only isolated richness.", "Medium-high", "Borough edge", "Fragmentation"],
  buffer: ["Buffer urban pressure", "Built-context hotspots are not failures. They show where birds are recorded inside pressure, so mitigation and monitoring matter most.", "Medium", "Street + block", "Disturbance"],
  monitor: ["Monitor the evidence", "Citizen-science records reveal observation hotspots. Repeated surveys are needed before converting pattern into abundance claims.", "Essential", "Seasonal survey", "Sampling bias"]
};

const birdInsights = {
  swift: "Common Swift is the strongest symbol of urban airspace: visible, seasonal, and dependent on both buildings and flying insects.",
  swallow: "Barn Swallow helps test corridor logic because it is tied to open edges, water, and low acrobatic feeding rather than dense urban cores.",
  martin: "House Martin is the bridge species: it nests around buildings but often feeds over wet and open habitats, connecting built form with green-blue infrastructure."
};

document.querySelectorAll(".bird-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".bird-card").forEach(item => item.classList.toggle("active", item === card));
    document.getElementById("birdInsight").textContent = birdInsights[card.dataset.bird];
  });
});

document.querySelectorAll(".planning-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".planning-card").forEach(item => item.classList.toggle("active", item === card));
    const copy = strategyCopy[card.dataset.strategy];
    document.getElementById("strategyTitle").textContent = copy[0];
    document.getElementById("strategyText").textContent = copy[1];
    document.getElementById("strategyEvidence").textContent = copy[2];
    document.getElementById("strategyScale").textContent = copy[3];
    document.getElementById("strategyRisk").textContent = copy[4];
  });
});

activateChapter(location.hash ? location.hash.slice(1) : "intro");

function createMap(id) {
  if (!document.getElementById(id)) return null;
  const instance = L.map(id, { zoomControl: false, preferCanvas: false }).setView([51.5072, -0.1276], 10);
  L.control.zoom({ position: "bottomright" }).addTo(instance);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    opacity: 0.72,
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(instance);
  return instance;
}

window.addEventListener("flyways:chapterchange", () => {
  [hotspotMap, habitatMap, attentionMap].forEach(instance => {
    if (instance) window.setTimeout(() => instance.invalidateSize(), 80);
  });
});

function countKey(sp, season) {
  return `cnt_${sp.toLowerCase().replaceAll(" ", "_")}_${season.toLowerCase()}`;
}

function getRangeColor(value, breaks) {
  return breaks.find(item => value >= item[0] && value <= item[1])?.[2] || breaks[0][2];
}

function birdStyle(feature) {
  const value = Number(feature.properties[countKey(selectedSpecies, selectedSeason)] || 0);
  const breaks = [
    [0, 0, "#f5efe4"],
    [1, 5, "#dff0c4"],
    [6, 20, "#add48d"],
    [21, 60, "#72b7bd"],
    [61, 140, "#f0bb45"],
    [141, Infinity, "#f2795f"]
  ];
  return {
    fillColor: getRangeColor(value, breaks),
    fillOpacity: value ? 0.82 : 0.34,
    color: value ? "rgba(23,50,43,0.52)" : "rgba(23,50,43,0.18)",
    weight: value ? 0.8 : 0.45
  };
}

function habitatStyle(feature) {
  const p = feature.properties;
  let value = Number(p[selectedHabitatMetric] || 0);
  let breaks = [
    [0, 2, "#f5efe4"],
    [2, 6, "#dff0c4"],
    [6, 12, "#add48d"],
    [12, 25, "#78b66f"],
    [25, Infinity, "#3f8a57"]
  ];
  if (selectedHabitatMetric === "water_pct") {
    breaks = [[0, 0.05, "#f5efe4"], [0.05, 0.5, "#dff3f6"], [0.5, 2, "#9bd5df"], [2, 8, "#45a9c2"], [8, Infinity, "#247b95"]];
  }
  if (selectedHabitatMetric === "building_density") {
    breaks = [[0, 25, "#f5efe4"], [25, 45, "#f4dec1"], [45, 65, "#e2b488"], [65, 90, "#c98256"], [90, Infinity, "#9f523f"]];
  }
  return {
    fillColor: getRangeColor(value, breaks),
    fillOpacity: 0.82,
    color: "rgba(23,50,43,0.46)",
    weight: 0.65
  };
}

function attentionStyle(feature) {
  return {
    fillColor: attentionColors[feature.properties.attention_zone] || "#d9cfae",
    fillOpacity: 0.82,
    color: "rgba(23,50,43,0.52)",
    weight: 0.7
  };
}

function setButtonGroup(containerId, values, active, callback) {
  const box = document.getElementById(containerId);
  box.innerHTML = "";
  values.forEach(value => {
    const button = document.createElement("button");
    button.textContent = value;
    button.className = value === active ? "active" : "";
    button.addEventListener("click", () => callback(value));
    box.appendChild(button);
  });
}

function makeStaticCharts() {
  topSpeciesChart = new Chart(document.getElementById("topSpeciesChart"), {
    type: "bar",
    data: {
      labels: siteData.top10_species.map(d => d["Common name"]),
      datasets: [{
        data: siteData.top10_species.map(d => d.record_count),
        backgroundColor: siteData.top10_species.map(d => species.includes(d["Common name"]) ? colors.bird : "#d9cfae"),
        borderRadius: 8
      }]
    },
    options: {
      animation: { duration: 1200, easing: "easeOutQuart" },
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "rgba(23,50,43,0.1)" } },
        y: { grid: { display: false } }
      }
    }
  });

  const monthlyDatasets = species.map((sp, index) => ({
    label: sp,
    data: Array.from({ length: 12 }, (_, i) => {
      const row = siteData.monthly.find(d => d.common_name === sp && Number(d.month) === i + 1);
      return row ? Number(row.record_count) : 0;
    }),
    borderColor: [colors.blue, colors.bird, colors.green][index],
    backgroundColor: [colors.blue, colors.bird, colors.green][index],
    tension: 0.35,
    pointRadius: 3
  }));

  monthlyChart = new Chart(document.getElementById("monthlyChart"), {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: monthlyDatasets
    },
    options: {
      animation: { duration: 1400, easing: "easeOutQuart" },
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "rgba(23,50,43,0.1)" } }
      }
    }
  });
  bindChartControls();
}

function bindChartControls() {
  document.querySelectorAll("#topSpeciesMode button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("#topSpeciesMode button").forEach(item => item.classList.toggle("active", item === button));
      updateTopSpeciesMode(button.dataset.mode);
    });
  });

  document.querySelectorAll("#monthlyFocus button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("#monthlyFocus button").forEach(item => item.classList.toggle("active", item === button));
      updateMonthlyFocus(button.dataset.species);
    });
  });
}

function updateTopSpeciesMode(mode) {
  const rows = mode === "selected"
    ? siteData.top10_species.filter(d => species.includes(d["Common name"]))
    : siteData.top10_species;
  topSpeciesChart.data.labels = rows.map(d => d["Common name"]);
  topSpeciesChart.data.datasets[0].data = rows.map(d => d.record_count);
  topSpeciesChart.data.datasets[0].backgroundColor = rows.map(d => {
    if (mode === "urban") {
      if (d["Common name"] === "Common Swift") return colors.blue;
      if (d["Common name"] === "Barn Swallow") return colors.coral || colors.bird;
      if (d["Common name"] === "House Martin") return colors.green;
    }
    return species.includes(d["Common name"]) ? colors.bird : "#d9cfae";
  });
  const note = document.getElementById("topSpeciesNote");
  note.textContent = mode === "selected"
    ? "The selected trio are all high-frequency migrants, so the project can stay focused without feeling arbitrary."
    : mode === "urban"
      ? "The colour story turns the ranking into an argument: Swift = airspace/buildings, Swallow = open/water edges, House Martin = built-habitat bridge."
      : "The three selected birds are highlighted inside the top-ten ranking, then interpreted as different ways of using urban environments.";
  topSpeciesChart.update();
}

function updateMonthlyFocus(targetSpecies) {
  monthlyChart.data.datasets.forEach(dataset => {
    dataset.hidden = targetSpecies !== "all" && dataset.label !== targetSpecies;
    dataset.borderWidth = targetSpecies === "all" || dataset.label === targetSpecies ? 3 : 1;
  });
  const notes = {
    all: "All three selected migrants peak between late spring and summer, but Swift is the sharpest seasonal pulse.",
    "Common Swift": "Common Swift has the most compressed summer pulse, which makes it a strong test for seasonal urban airspace.",
    "Barn Swallow": "Barn Swallow keeps a broader spring-to-autumn shoulder, useful for reading open-edge and corridor records.",
    "House Martin": "House Martin bridges settlement and habitat, with records persisting through summer and early autumn."
  };
  document.getElementById("monthlyNote").textContent = notes[targetSpecies] || notes.all;
  monthlyChart.update();
}

function initHotspotModule() {
  const selectSpecies = value => {
    selectedSpecies = value;
    setButtonGroup("speciesToggle", species, selectedSpecies, selectSpecies);
    hotspotLayer.setStyle(birdStyle);
    updateBoroughChart();
  };

  const selectSeason = value => {
    selectedSeason = value;
    setButtonGroup("seasonToggle", seasons, selectedSeason, selectSeason);
    hotspotLayer.setStyle(birdStyle);
    updateBoroughChart();
  };

  setButtonGroup("speciesToggle", species, selectedSpecies, selectSpecies);
  setButtonGroup("seasonToggle", seasons, selectedSeason, selectSeason);

  hotspotLayer = L.geoJSON(msoaData, {
    style: birdStyle,
    onEachFeature: (feature, layer) => {
      layer.on({
        mouseover: () => {
          layer.setStyle({ weight: 2, color: colors.ink });
          const value = Number(feature.properties[countKey(selectedSpecies, selectedSeason)] || 0);
          document.getElementById("hotspotInfo").innerHTML = `<strong>${feature.properties.msoa21nm}</strong><br>${selectedSpecies}, ${selectedSeason}: ${value.toLocaleString()} records<br>Borough: ${feature.properties.lad22nm}`;
        },
        mouseout: () => hotspotLayer.resetStyle(layer),
        click: () => {
          hotspotMap.fitBounds(layer.getBounds(), { padding: [80, 80], maxZoom: 12 });
          document.getElementById("hotspotInfo").innerHTML = `<strong>${feature.properties.msoa21nm}</strong><br>${selectedSpecies}, ${selectedSeason}: ${Number(feature.properties[countKey(selectedSpecies, selectedSeason)] || 0).toLocaleString()} records<br>Borough: ${feature.properties.lad22nm}`;
        }
      });
    }
  }).addTo(hotspotMap);
  hotspotMap.fitBounds(hotspotLayer.getBounds(), { padding: [24, 24] });

  boroughChart = new Chart(document.getElementById("boroughChart"), {
    type: "bar",
    data: { labels: [], datasets: [{ data: [], backgroundColor: colors.blue, borderRadius: 6 }] },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { color: "rgba(23,50,43,0.1)" } }, y: { grid: { display: false } } }
    }
  });
  updateBoroughChart();

  document.getElementById("resetHotspot").addEventListener("click", () => {
    hotspotMap.fitBounds(hotspotLayer.getBounds(), { padding: [24, 24] });
  });

  document.getElementById("randomHotspot").addEventListener("click", () => {
    const key = countKey(selectedSpecies, selectedSeason);
    const ranked = [...msoaData.features]
      .filter(f => Number(f.properties[key] || 0) > 0)
      .sort((a, b) => Number(b.properties[key] || 0) - Number(a.properties[key] || 0))
      .slice(0, 30);
    const feature = ranked[Math.floor(Math.random() * ranked.length)];
    const layer = hotspotLayer.getLayers().find(l => l.feature.properties.msoa21cd === feature?.properties.msoa21cd);
    if (layer) {
      hotspotMap.fitBounds(layer.getBounds(), { padding: [80, 80], maxZoom: 12 });
      layer.fire("mouseover");
    }
  });
}

function updateBoroughChart() {
  const rows = siteData.top_boroughs[selectedSpecies][selectedSeason].slice(0, 5);
  document.getElementById("hotspotTitle").textContent = `${selectedSpecies} in ${selectedSeason}`;
  boroughChart.data.labels = rows.map(d => d.lad22nm);
  boroughChart.data.datasets[0].data = rows.map(d => d.count);
  boroughChart.update();
}

function initHabitatModule() {
  if (!habitatMap) return;
  const metrics = [
    { label: "Green space", value: "green_pct" },
    { label: "Water proximity", value: "water_pct" },
    { label: "Built density", value: "building_density" }
  ];
  const drawMetricButtons = () => {
    const box = document.getElementById("habitatToggle");
    box.innerHTML = "";
    metrics.forEach(metric => {
      const button = document.createElement("button");
      button.textContent = metric.label;
      button.className = selectedHabitatMetric === metric.value ? "active" : "";
      button.addEventListener("click", () => {
        selectedHabitatMetric = metric.value;
        drawMetricButtons();
        habitatLayer.setStyle(habitatStyle);
      });
      box.appendChild(button);
    });
  };
  drawMetricButtons();

  habitatLayer = L.geoJSON(msoaData, {
    style: habitatStyle,
    onEachFeature: (feature, layer) => {
      layer.on("click", () => updateHabitatProfile(feature));
    }
  }).addTo(habitatMap);
  habitatMap.fitBounds(habitatLayer.getBounds(), { padding: [24, 24] });

  habitatRadar = new Chart(document.getElementById("habitatRadar"), {
    type: "radar",
    data: {
      labels: ["Green cover", "Water cover", "Built density", "Bird records"],
      datasets: [{ label: "Selected MSOA", data: [0, 0, 0, 0], borderColor: colors.plum, backgroundColor: "rgba(141,92,128,0.18)" }]
    },
    options: {
      maintainAspectRatio: false,
      scales: { r: { min: 0, max: 100, ticks: { display: false } } }
    }
  });
}

function updateHabitatProfile(feature) {
  const p = feature.properties;
  const data = [
    Math.min(100, p.green_pct / 20 * 100),
    Math.min(100, p.water_pct / 6 * 100),
    Math.min(100, p.building_density / 120 * 100),
    Math.min(100, p.bird_count / 1000 * 100)
  ];
  habitatRadar.data.datasets[0].data = data;
  habitatRadar.update();
  document.getElementById("habitatTitle").textContent = p.msoa21nm;
  document.getElementById("habitatText").textContent = `${p.lad22nm}: ${p.bird_count.toLocaleString()} cumulative records. Building value is centroid density, not footprint cover.`;
  document.getElementById("habitatBars").innerHTML = [
    ["Green", `${p.green_pct.toFixed(1)}%`, p.green_pct / 20 * 100, colors.green],
    ["Water", `${p.water_pct.toFixed(1)}%`, p.water_pct / 6 * 100, colors.blue],
    ["Built", `${p.building_density.toFixed(1)}/km²`, p.building_density / 120 * 100, colors.built]
  ].map(([label, value, width, color]) => `
    <div class="metric-row"><span>${label}</span><div class="metric-track"><div class="metric-fill" style="width:${Math.min(100, width)}%;background:${color}"></div></div><strong>${value}</strong></div>
  `).join("");
}

function initAttentionModule() {
  if (!attentionMap) return;
  attentionLayer = L.geoJSON(msoaData, {
    style: attentionStyle,
    onEachFeature: (feature, layer) => {
      layer.on("click", () => {
        updateAttentionCard(feature);
        addCompare(feature);
      });
    }
  }).addTo(attentionMap);
  attentionMap.fitBounds(attentionLayer.getBounds(), { padding: [24, 24] });
}

function updateAttentionCard(feature) {
  const p = feature.properties;
  document.getElementById("attentionTitle").textContent = p.msoa21nm;
  document.getElementById("attentionCard").innerHTML = `
    <dl>
      <div><dt>Bird count</dt><dd>${p.bird_count.toLocaleString()}</dd></div>
      <div><dt>Dominant species</dt><dd>${p.dominant_species}</dd></div>
      <div><dt>Habitat score</dt><dd>${p.habitat_score}/100</dd></div>
      <div><dt>Attention level</dt><dd>${p.attention_zone}</dd></div>
    </dl>
  `;
}

function addCompare(feature) {
  if (!compareSelection.find(f => f.properties.msoa21cd === feature.properties.msoa21cd)) {
    compareSelection.push(feature);
    if (compareSelection.length > 2) compareSelection.shift();
  }
  renderCompare();
}

function renderCompare() {
  const box = document.getElementById("compareTable");
  if (compareSelection.length < 2) {
    box.textContent = compareSelection.length ? "Select one more MSOA to compare." : "Choose two MSOAs on the map.";
    return;
  }
  const [a, b] = compareSelection.map(f => f.properties);
  box.innerHTML = `
    <dl>
      <div><dt>Area A</dt><dd>${a.msoa21nm}</dd></div>
      <div><dt>Area B</dt><dd>${b.msoa21nm}</dd></div>
      <div><dt>Bird records</dt><dd>${a.bird_count} vs ${b.bird_count}</dd></div>
      <div><dt>Habitat score</dt><dd>${a.habitat_score} vs ${b.habitat_score}</dd></div>
      <div><dt>Green</dt><dd>${a.green_pct.toFixed(1)}% vs ${b.green_pct.toFixed(1)}%</dd></div>
      <div><dt>Water</dt><dd>${a.water_pct.toFixed(1)}% vs ${b.water_pct.toFixed(1)}%</dd></div>
    </dl>
  `;
}

document.getElementById("clearCompare").addEventListener("click", () => {
  compareSelection = [];
  renderCompare();
});

let lastTrail = 0;
document.addEventListener("mousemove", event => {
  const now = performance.now();
  if (now - lastTrail < 240) return;
  lastTrail = now;
  const trail = document.getElementById("cursorTrail");
  const bird = document.createElement("span");
  bird.className = "trail-bird";
  bird.style.left = `${event.clientX + 10}px`;
  bird.style.top = `${event.clientY + 8}px`;
  trail.appendChild(bird);
  setTimeout(() => bird.remove(), 1050);
});

Promise.all([
  fetch("data/site_data.json").then(r => r.json()),
  fetch("data/msoa_site.geojson").then(r => r.json())
]).then(([data, geojson]) => {
  siteData = data;
  msoaData = geojson;
  updateHeroStats();
  makeStaticCharts();
  initHotspotModule();
  initHabitatModule();
  initAttentionModule();
}).catch(error => {
  console.error(error);
  alert("Could not load site data. Check data/site_data.json and data/msoa_site.geojson.");
});
