/* Unified site interactions. Interaction 2 is preserved via scripts/chart.js + scripts/map.js. */

const sections = Array.from(document.querySelectorAll("main > section"));
const nextBtn = document.getElementById("nextBtn");

function currentSectionIndex() {
  const y = window.scrollY + window.innerHeight * 0.42;
  let idx = 0;
  sections.forEach((s, i) => {
    if (s.offsetTop <= y) idx = i;
  });
  return idx;
}

function goToSection(i) {
  sections[Math.max(0, Math.min(i, sections.length - 1))]?.scrollIntoView({
    behavior: "smooth"
  });
}

nextBtn?.addEventListener("click", () => goToSection(currentSectionIndex() + 1));

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    goToSection(currentSectionIndex() + 1);
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    goToSection(currentSectionIndex() - 1);
  }
});

document.querySelectorAll(".nav-group > button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById(btn.dataset.target)?.scrollIntoView({
      behavior: "smooth"
    });
  });
});

/* Fix Leaflet maps when scrolling into hidden/late sections */
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;

        document.querySelectorAll(".nav-group").forEach((g) => {
          g.classList.remove("active");
        });

        const nav = Array.from(document.querySelectorAll(".nav-group")).find(
          (g) =>
            g.querySelector(`[href="#${id}"]`) ||
            g.querySelector(`[data-target="${id}"]`)
        );

        if (nav) nav.classList.add("active");

        if (id === "spatial-hotspots" && window.flightMap) {
          setTimeout(() => window.flightMap.invalidateSize(true), 250);
        }

        if (id === "habitat-lens" && window.habitatMap) {
          setTimeout(() => window.habitatMap.invalidateSize(true), 250);
        }

        if (id === "attention-areas" && window.bhpMap) {
          setTimeout(() => window.bhpMap.invalidateSize(true), 250);
        }
      }
    });
  },
  { threshold: 0.35 }
);

sections.forEach((s) => io.observe(s));

/* Overview interaction */
const reasonCopy = {
  river:
    "Water corridors support feeding and movement, especially near the Thames, reservoirs and wetland edges.",
  parks:
    "Large parks and woodland edges create repeated observation clusters by offering nesting, feeding and resting conditions.",
  edge:
    "Outer London often shows stronger ecological contrast, where lower density and open land support wider movement."
};

document.querySelectorAll(".reason-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".reason-card").forEach((c) =>
      c.classList.remove("active")
    );
    card.classList.add("active");
    const reasonText = document.getElementById("reasonText");
    if (reasonText) reasonText.textContent = reasonCopy[card.dataset.reason];
  });
});

/* Species profile */
const speciesProfiles = {
  Swift: {
    img: "images/swift.jpg",
    url: "https://en.wikipedia.org/wiki/Common_swift",
    text:
      "Swift shows a highly concentrated summer pattern. It is strongly linked to aerial feeding and urban nesting structures.",
    note: "Short and intense seasonal window."
  },
  Swallow: {
    img: "images/swallow.jpg",
    url: "https://en.wikipedia.org/wiki/Barn_swallow",
    text:
      "Swallow appears earlier and remains present for longer, often associated with open landscapes, riversides and urban edges.",
    note: "Extended and flexible migration behaviour."
  },
  "House Martin": {
    img: "images/house-martin.jpg",
    url: "https://en.wikipedia.org/wiki/Common_house_martin",
    text:
      "House Martin follows a smoother late-spring to summer pattern and is commonly observed around buildings, gardens and suburban neighbourhoods.",
    note: "Stable summer presence."
  }
};

function setSpeciesProfile(name) {
  const p = speciesProfiles[name];
  const el = document.getElementById("speciesProfile");
  if (!el || !p) return;

  el.innerHTML = `
    <a class="species-wiki-link" href="${p.url}" target="_blank" rel="noopener" title="Open ${name} on Wikipedia">
      <img src="${p.img}" alt="${name}">
      <span>Wikipedia →</span>
    </a>
    <strong>${name}</strong>
    <p>${p.text}</p>
    <small>${p.note}</small>
  `;
}

document.querySelectorAll(".species-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".species-tab").forEach((t) =>
      t.classList.remove("active")
    );
    tab.classList.add("active");
    setSpeciesProfile(tab.dataset.species);
  });
});

setSpeciesProfile("Swift");

/* Top 10 species chart */
const topSpecies = [
  ["Phylloscopus collybita", 826528],
  ["Blackcap", 598592],
  ["Barn Swallow", 530304],
  ["House Martin", 278411],
  ["Phylloscopus trochilus", 272862],
  ["Swift", 254198],
  ["Sand Martin", 162640],
  ["Cuculus canorus", 90617],
  ["Muscicapa striata", 46370],
  ["Spotted Flycatcher", 38720]
].reverse();

function plotTop10(frame = 1) {
  if (!document.getElementById("top10Chart")) return;

  const vals = topSpecies.map((d) => Math.round(d[1] * frame));

  Plotly.react(
    "top10Chart",
    [
      {
        type: "bar",
        orientation: "h",
        y: topSpecies.map((d) => d[0]),
        x: vals,
        text: vals.map((v) => v.toLocaleString()),
        textposition: "outside",
        marker: {
          color: topSpecies.map((d) => {
            if (["Barn Swallow", "House Martin", "Swift"].includes(d[0])) {
              return "#dce97a";
            }
            return "#849869";
          })
        }
      }
    ],
    {
      margin: { l: 160, r: 80, t: 30, b: 30 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      height: 460,
      xaxis: {
        showgrid: true,
        gridcolor: "rgba(38,50,40,.08)",
        zeroline: false,
        tickfont: { color: "#6b776b" }
      },
      yaxis: { tickfont: { color: "#263228", size: 12 } },
      font: { family: "Manrope, sans-serif", color: "#263228" },
      showlegend: false
    },
    { displayModeBar: false, responsive: true }
  );
}

let tf = 0.12;
plotTop10(tf);
setInterval(() => {
  tf += 0.16;
  if (tf > 1.06) tf = 0.12;
  plotTop10(Math.min(tf, 1));
}, 120);

/* Monthly rhythm chart */
const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const monthly = {
  "House Martin": [0, 0, 1200, 24000, 57000, 54000, 46000, 50000, 38000, 7000, 600, 0],
  Swallow: [0, 0, 2500, 51000, 61500, 43000, 37000, 44500, 39000, 11500, 900, 0],
  Swift: [0, 0, 0, 7000, 76000, 75000, 66000, 25500, 3500, 200, 0, 0]
};

const mColors = {
  "House Martin": "#d9ad5d",
  Swallow: "#8b6c97",
  Swift: "#7bcf96"
};

let mFrame = 1;

function plotMonthly() {
  if (!document.getElementById("monthlyChart")) return;

  const upto = Math.max(1, mFrame);

  const traces = Object.keys(monthly).map((name) => ({
    type: "scatter",
    mode: "lines+markers",
    name,
    x: months.slice(0, upto),
    y: monthly[name].slice(0, upto),
    line: { color: mColors[name], width: 4, shape: "spline" },
    marker: { size: 8, color: mColors[name] }
  }));

  Plotly.react(
    "monthlyChart",
    traces,
    {
      margin: { l: 70, r: 30, t: 40, b: 55 },
      height: 460,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Manrope, sans-serif", color: "#263228" },
      legend: { orientation: "h", x: 0.5, xanchor: "center", y: 1.12 },
      xaxis: {
        range: [-0.2, 11.2],
        tickvals: months.map((_, i) => i),
        ticktext: months,
        showgrid: false
      },
      yaxis: {
        title: "Number of records",
        gridcolor: "rgba(38,50,40,.09)",
        zeroline: false
      }
    },
    { displayModeBar: false, responsive: true }
  );

  const activeMonth = months[upto - 1];

  document.querySelectorAll("#monthDots span").forEach((s, i) => {
    s.classList.toggle("active", i === upto - 1);
  });

  const copy =
    upto < 4
      ? "Early months contain relatively few records before spring migration becomes visible."
      : upto < 8
      ? "Summer creates the strongest observation window, especially for Swift and Swallow."
      : "After late summer, records decline as seasonal movement shifts towards autumn transition.";

  const mt = document.getElementById("monthlyText");
  if (mt) mt.textContent = `${activeMonth}: ${copy}`;

  mFrame = mFrame >= 12 ? 1 : mFrame + 1;
}

const monthDots = document.getElementById("monthDots");
if (monthDots) {
  monthDots.innerHTML = months.map((m) => `<span>${m}</span>`).join("");
}

plotMonthly();
setInterval(plotMonthly, 520);

/* Migration peaks */
const peakCopy = {
  spring:
    "<strong>Spring emergence</strong><br>Early records begin to reappear around riverside and suburban areas.",
  summer:
    "<strong>Summer peak</strong><br>Bird activity intensifies during the breeding season, forming dense clusters around parks and outer boroughs.",
  autumn:
    "<strong>Autumn transition</strong><br>Activity disperses as migration resumes, revealing a wider but less concentrated spatial footprint."
};

document.querySelectorAll(".peak-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".peak-btn").forEach((b) =>
      b.classList.remove("active")
    );
    btn.classList.add("active");
    const peakText = document.getElementById("peakText");
    if (peakText) peakText.innerHTML = peakCopy[btn.dataset.peak];
  });
});

/* Environmental cards */
const envCopy = {
  green:
    "Green-rich hotspots indicate where high observation counts align with stronger ecological support.",
  water:
    "Water-linked hotspots show the role of reservoirs, rivers and wetland edges in feeding and movement.",
  built:
    "Built-up exceptions are analytically important because they suggest nesting opportunities or observation intensity despite urban pressure."
};

document.querySelectorAll(".env-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".env-card").forEach((c) =>
      c.classList.remove("active")
    );
    card.classList.add("active");
    const envText = document.getElementById("envText");
    if (envText) envText.textContent = envCopy[card.dataset.env];
  });
});

/* Area comparison chart */
const compareAreas = {
  "Green-rich hotspot": [72, 86, 22, 24],
  "Water-linked hotspot": [62, 44, 88, 30],
  "Built-up exception": [45, 26, 12, 76],
  "Potential corridor": [54, 62, 56, 38]
};

const aSel = document.getElementById("areaA");
const bSel = document.getElementById("areaB");

if (aSel && bSel) {
  Object.keys(compareAreas).forEach((k) => {
    aSel.add(new Option(k, k));
    bSel.add(new Option(k, k));
  });

  bSel.selectedIndex = 1;

  [aSel, bSel].forEach((s) => {
    s.addEventListener("change", plotCompare);
  });

  plotCompare();
}

function plotCompare() {
  if (!aSel || !bSel || !document.getElementById("compareAreaChart")) return;

  const a = aSel.value;
  const b = bSel.value;
  const cats = ["Records", "Green", "Water", "Built"];
  const aVals = compareAreas[a];
  const bVals = compareAreas[b];
  const diffVals = aVals.map((v, i) => v - bVals[i]);
  Plotly.react(
    "compareAreaChart",
    [
      { type: "bar", name: a, x: cats, y: aVals, marker: { color: "#86a172", line: { color: "rgba(38,49,40,.18)", width: 1 } }, hovertemplate: `<b>${a}</b><br>%{x}: %{y}<extra></extra>` },
      { type: "bar", name: b, x: cats, y: bVals, marker: { color: "#83b9c2", line: { color: "rgba(38,49,40,.18)", width: 1 } }, hovertemplate: `<b>${b}</b><br>%{x}: %{y}<extra></extra>` },
      { type: "scatter", mode: "lines+markers", name: "Difference", x: cats, y: diffVals, yaxis: "y2", line: { color: "#c78666", width: 3, shape: "spline" }, marker: { size: 8, color: "#c78666" }, hovertemplate: `<b>A - B</b><br>%{x}: %{y}<extra></extra>` }
    ],
    {
      barmode: "group",
      height: 430,
      margin: { l: 58, r: 68, t: 58, b: 78 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(255,253,246,.38)",
      font: { family: "Manrope, sans-serif", color: "#263228", size: 13 },
      title: { text: "Interactive habitat profile comparison", x: 0.02, y: 0.98, xanchor: "left", yanchor: "top", font: { size: 20, color: "#263228" } },
      legend: { orientation: "h", x: 0.02, y: -0.10, xanchor: "left", yanchor: "top", bgcolor: "rgba(255,253,246,0)", borderwidth: 0, font: { size: 13 } },
      yaxis: { title: "Normalised score", range: [0, 100], gridcolor: "rgba(38,49,40,.08)", zeroline: false },
      yaxis2: { title: "A - B", overlaying: "y", side: "right", range: [-80, 80], zeroline: false, showgrid: false },
      annotations: [
        { x: "Green", y: Math.max(aVals[1], bVals[1]) + 8, text: "green habitat", showarrow: false, font: { size: 11, color: "#6b766c" } },
        { x: "Water", y: Math.max(aVals[2], bVals[2]) + 8, text: "blue corridor", showarrow: false, font: { size: 11, color: "#6b766c" } },
        { x: "Built", y: Math.max(aVals[3], bVals[3]) + 8, text: "built context", showarrow: false, font: { size: 11, color: "#6b766c" } }
      ],
      hovermode: "x unified"
    },
    { displayModeBar: false, responsive: true }
  );
}


/* Interaction 1: Flight hotspot map */
let flightSpecies = "Swallow";
let flightSeason = "Spring";
let flightData = null;
let flightLayer = null;
let flightView = "records";

const flightProfiles = {
  Swallow: {
    img: "images/swallow.jpg",
    text: "A long-distance migrant often associated with open landscapes and riversides."
  },
  Swift: {
    img: "images/swift.jpg",
    text: "A highly aerial species, often linked with urban nesting structures."
  },
  "House Martin": {
    img: "images/house-martin.jpg",
    text: "A summer visitor commonly found around buildings and suburban neighbourhoods."
  }
};

const flightColors = [
  "#f8f5ed",
  "#dfeec5",
  "#a9cc94",
  "#7ec6c9",
  "#e0bd61",
  "#c77459"
];

function flightColor(v) {
  v = Number(v || 0);
  if (v === 0) return flightColors[0];
  if (v <= 20) return flightColors[1];
  if (v <= 80) return flightColors[2];
  if (v <= 180) return flightColors[3];
  if (v <= 320) return flightColors[4];
  return flightColors[5];
}

function fetchJsonCandidates(paths) {
  return paths.reduce((chain, path) => chain.catch(() =>
    fetch(path).then((r) => {
      if (!r.ok) throw new Error(path + " " + r.status);
      return r.json();
    })
  ), Promise.reject());
}

function loadFlightGeoJSON() {
  return fetchJsonCandidates(["data/birds_msoa_hotspots.geojson", "./data/birds_msoa_hotspots.geojson", "birds_msoa_hotspots.geojson"]);
}

function getFlightSpecies(p) { return String(p["Common name"] || p.species || p.common_name || p.Species || "").trim(); }
function getFlightSeason(p) { return String(p.Season || p.season || "").trim(); }
function getFlightCount(p) { return Number(p.record_count ?? p.records ?? p.bird_count ?? 0) || 0; }

function addFlightExtraControls() {
  const panel = document.querySelector(".hotspot-panel");
  if (!panel || panel.querySelector(".flight-extra")) return;
  const extra = document.createElement("div");
  extra.className = "flight-extra";
  extra.innerHTML = `
    <button class="active" data-view="records">Record intensity</button>
    <button data-view="rank">Species rank</button>
    <button data-view="outer">Outer London lens</button>
    <button data-view="reset">Reset view</button>
    <div class="flight-statbox" id="flightStatbox" style="grid-column:1/3">Click an MSOA to inspect its local record count and borough context.</div>`;
  panel.insertBefore(extra, panel.querySelector(".ranking-card"));
  extra.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", () => {
    extra.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    flightView = btn.dataset.view || "records";
    if (btn.dataset.view === "reset") {
      flightView = "records";
      extra.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.view === "records"));
      if (window.flightMap) window.flightMap.setView([51.5, -0.13], 9.35);
    }
    updateFlight();
  }));
}

const outerBoroughs = new Set(["Bromley","Croydon","Havering","Hillingdon","Harrow","Enfield","Barnet","Hounslow","Richmond upon Thames","Kingston upon Thames","Sutton","Bexley","Redbridge"]);
const rankPalette = { "Swallow": "#7fb4bd", "Swift": "#dfe873", "House Martin": "#d59a72" };

function flightStyle(feature) {
  const p = feature.properties || {};
  const c = getFlightCount(p);
  const isOuter = outerBoroughs.has(p.lad22nm);
  let fill = flightColor(c);
  let opacity = c > 0 ? 0.88 : 0.24;
  let weight = c > 0 ? 1.25 : 0.75;
  if (flightView === "rank") {
    const rankSpecies = p.rank_species || getFlightSpecies(p);
    fill = rankPalette[rankSpecies] || "#dfeec5";
    opacity = c > 0 ? 0.88 : 0.15;
    weight = c > 0 ? 1.15 : 0.55;
  }
  if (flightView === "outer" && !isOuter) {
    fill = "#ece8dc";
    opacity = 0.20;
    weight = 0.45;
  }
  return { color: c > 0 ? "rgba(31,49,38,0.72)" : "rgba(58,73,55,0.32)", weight, fillColor: fill, fillOpacity: opacity, opacity: 1 };
}

if (document.getElementById("flightMap")) {
  window.flightMap = L.map("flightMap", { zoomControl: false, preferCanvas: false }).setView([51.5, -0.13], 9.35);
  window.flightMap.createPane("flightPolygons");
  window.flightMap.getPane("flightPolygons").style.zIndex = 430;
  L.control.zoom({ position: "topright" }).addTo(window.flightMap);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19, opacity: 0.74, attribution: "&copy; OpenStreetMap &copy; CARTO" }).addTo(window.flightMap);

  loadFlightGeoJSON().then((d) => { flightData = d; addFlightExtraControls(); updateFlight(); setTimeout(() => window.flightMap.invalidateSize(true), 300); })
  .catch((err) => { console.warn("Flight map data could not be loaded", err); const bars = document.getElementById("flightBars"); if (bars) bars.innerHTML = '<p class="muted-small">Flight GeoJSON could not be loaded. Keep data/birds_msoa_hotspots.geojson beside index.html and open with Live Server.</p>'; });

  document.querySelectorAll("#flightSpecies button").forEach((b) => b.addEventListener("click", () => { document.querySelectorAll("#flightSpecies button").forEach((x) => x.classList.remove("active")); b.classList.add("active"); flightSpecies = b.dataset.species; updateFlight(); }));
  document.querySelectorAll("#flightSeason button").forEach((b) => b.addEventListener("click", () => { document.querySelectorAll("#flightSeason button").forEach((x) => x.classList.remove("active")); b.classList.add("active"); flightSeason = b.dataset.season; updateFlight(); }));
}

function updateFlight() {
  if (!window.flightMap || !flightData) return;
  if (flightLayer) { window.flightMap.removeLayer(flightLayer); flightLayer = null; }
  let features = flightData.features.filter((f) => {
    const p = f.properties || {};
    if (getFlightSeason(p).toLowerCase() !== flightSeason.toLowerCase()) return false;
    return flightView === "rank" || getFlightSpecies(p).toLowerCase() === flightSpecies.toLowerCase();
  });

  if (flightView === "rank") {
    const grouped = new Map();
    features.forEach((f) => {
      const p = f.properties || {};
      const key = p.msoa21cd || p.MSOA21CD || p.msoa11cd || p.msoa21nm || JSON.stringify(f.geometry && f.geometry.coordinates && f.geometry.coordinates[0] && f.geometry.coordinates[0][0]);
      if (!grouped.has(key)) grouped.set(key, { base: JSON.parse(JSON.stringify(f)), speciesCounts: {}, total: 0 });
      const g = grouped.get(key);
      const sp = getFlightSpecies(p) || "Unknown";
      const count = getFlightCount(p);
      g.speciesCounts[sp] = (g.speciesCounts[sp] || 0) + count;
      g.total += count;
    });
    features = Array.from(grouped.values()).map((g) => {
      const topSpecies = Object.entries(g.speciesCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || "Unknown";
      g.base.properties = {
        ...g.base.properties,
        record_count: g.total,
        rank_species: topSpecies,
        rank_label: `${topSpecies} leads this MSOA`
      };
      return g.base;
    });
  }
  flightLayer = L.geoJSON({ type: "FeatureCollection", features }, { pane: "flightPolygons", style: flightStyle, onEachFeature: (feature, layer) => {
    const p = feature.properties || {}; const c = getFlightCount(p);
    layer.bindTooltip(`<strong>${p.msoa21nm || "MSOA"}</strong><br>${p.lad22nm || "London"}<br>${Math.round(c)} records${p.rank_species ? `<br><em>${p.rank_species} dominant</em>` : ""}`, { sticky: true });
    layer.on({ mouseover: () => layer.setStyle({ weight: 2.4, color: "#1f3126", fillOpacity: c > 0 ? 0.97 : 0.42 }), mouseout: () => flightLayer && flightLayer.resetStyle(layer), click: () => { const stat = document.getElementById("flightStatbox"); if (stat) stat.innerHTML = `<strong>${p.msoa21nm || "Selected MSOA"}</strong><br>${p.lad22nm || "London"} · ${Math.round(c)} records · ${flightSpecies} in ${flightSeason}`; layer.openTooltip(); } });
  }}).addTo(window.flightMap);
  if (features.length) { try { window.flightMap.fitBounds(flightLayer.getBounds(), { padding: [18, 18], maxZoom: 10 }); } catch (e) {} }
  const profile = flightProfiles[flightSpecies] || flightProfiles.Swallow;
  const img = document.getElementById("flightBirdImg"); const name = document.getElementById("flightBirdName"); const text = document.getElementById("flightBirdText");
  if (img) img.src = profile.img; if (name) name.textContent = flightSpecies; if (text) text.textContent = profile.text;
  const seasonText = { Spring: ["Spring emergence", "Early hotspots emerge in suburban and riverside areas."], Summer: ["Summer peak", "Dense clusters appear around parks, garden suburbs and outer boroughs."], Autumn: ["Autumn transition", "Activity disperses as birds move out of the city."] };
  const title = document.getElementById("flightStoryTitle"); const story = document.getElementById("flightStoryText");
  if (title) title.textContent = flightView === "rank" ? "Species rank view" : flightView === "outer" ? "Outer London lens" : (seasonText[flightSeason] || seasonText.Spring)[0]; if (story) story.textContent = flightView === "rank" ? "Colours now show the dominant focal species in each MSOA for the selected season." : flightView === "outer" ? "Non-outer boroughs are faded to test whether hotspots lean towards London edge conditions." : (seasonText[flightSeason] || seasonText.Spring)[1];
  const borough = {}; features.forEach((f) => { const k = f.properties.lad22nm || "Unknown"; borough[k] = (borough[k] || 0) + getFlightCount(f.properties || {}); });
  const top = Object.entries(borough).filter((d) => d[1] > 0).sort((a,b)=>b[1]-a[1]).slice(0,5); const max = Math.max(...top.map((d)=>d[1]), 1);
  const bars = document.getElementById("flightBars");
  if (bars) bars.innerHTML = top.length ? top.map((d,i)=>`<div class="bar-row"><div><span>${i+1}. ${d[0]}</span><b>${Math.round(d[1])}</b></div><i style="width:${Math.max(8,(d[1]/max)*100)}%"></i></div>`).join("") : '<p class="muted-small">No records for this selection.</p>';
  setTimeout(() => window.flightMap.invalidateSize(true), 120);
}

/* === Final polish interactions === */
(function(){
  const copy = {
    H: ['Hi increases BHP.', 'Higher habitat quality means stronger local support for migratory birds.'],
    C: ['Ci increases BHP.', 'Connectivity means an MSOA can work as a stepping stone in the wider flyway network.'],
    D: ['Di reduces BHP.', 'Human disturbance lowers suitability where dense built fabric and activity pressure are high.'],
    L: ['Li reduces BHP.', 'Light pollution can disrupt nocturnal orientation, feeding patterns and nesting conditions.']
  };
  document.querySelectorAll('.formula-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.formula-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const box = document.getElementById('formulaExplain');
      const v = copy[btn.dataset.var];
      if (box && v) box.innerHTML = `<strong>${v[0]}</strong><span>${v[1]}</span>`;
      const idx = {H:0,C:1,D:2,L:3}[btn.dataset.var];
      document.querySelectorAll('.variable-grid article').forEach((a,i)=>a.classList.toggle('active', i===idx));
    });
  });
})();

(function(){
  const originalUpdate = window.updateFlight || (typeof updateFlight === 'function' ? updateFlight : null);
  if (!originalUpdate) return;
})();


/* Section dot navigation + small bird cursor + planning interactions */
(function(){
  const dotNav = document.querySelector(".section-dots");
  const storySections = [
    "home",
    "species-selection",
    "spatial-hotspots",
    "habitat-lens",
    "attention-areas",
    "planning-logic",
    "future",
    "team"
  ].map(id => document.getElementById(id)).filter(Boolean);
  if (dotNav && storySections.length) {
    dotNav.innerHTML = storySections.map((sec, i) => `<button type="button" data-dot="${sec.id}" title="${sec.querySelector('.kicker')?.textContent || sec.id}"><span>${i+1}</span></button>`).join("");
    dotNav.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.dot)?.scrollIntoView({behavior:"smooth"});
    }));
    const obs = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      dotNav.querySelectorAll("button").forEach(btn => btn.classList.toggle("active", btn.dataset.dot === entry.target.id));
    }), {threshold:.38});
    storySections.forEach(sec => obs.observe(sec));
  }

  const cursor = document.createElement("div");
  cursor.className = "bird-cursor";
  cursor.innerHTML = `<svg class="cursor-bird-svg" viewBox="0 0 64 64"><path class="bird-body" d="M12 36c7-11 19-17 34-15 4 .6 7 2.4 10 5-6 1-11 3-15 7 5 4 10 8 13 14-8-4-17-6-28-4-8 1.4-13-1.2-14-7Z"/><circle class="bird-eye" cx="46" cy="27" r="2.2"/><path class="bird-beak closed" d="M55 27l7 3-7 3Z"/><path class="bird-beak open" d="M55 26l8-4-4 7 4 7-8-4Z"/><path class="bird-wing" d="M24 35c6-7 15-8 22-7-7 2-13 7-18 14-2-1.5-3.4-3.7-4-7Z"/></svg>`;
  document.body.appendChild(cursor);
  window.addEventListener("pointermove", (e) => { cursor.style.transform = `translate(${e.clientX + 10}px, ${e.clientY + 8}px)`; }, {passive:true});
  window.addEventListener("pointerdown", () => cursor.classList.add("open"));
  window.addEventListener("pointerup", () => cursor.classList.remove("open"));
  window.addEventListener("pointercancel", () => cursor.classList.remove("open"));
  const heroMapEl = document.getElementById("heroMiniMap");
  if (heroMapEl && typeof L !== "undefined" && !window.heroMiniMap) {
    window.heroMiniMap = L.map(heroMapEl, { zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, boxZoom:false, keyboard:false, attributionControl:false }).setView([51.5072, -0.1276], 10.6);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {subdomains:"abcd", maxZoom:19, opacity:.95}).addTo(window.heroMiniMap);
    L.polyline([[51.48,-0.36],[51.49,-0.25],[51.50,-0.16],[51.505,-0.08],[51.50,0.02],[51.49,0.12]],{color:"#78aeb7",weight:5,opacity:.72}).addTo(window.heroMiniMap);
    [[51.50,-0.12],[51.52,-0.05],[51.49,-0.22],[51.54,-0.17],[51.47,0.00]].forEach((p,i)=>L.circleMarker(p,{radius:5+i,color:"#dfe873",fillColor:"#dfe873",fillOpacity:.9,weight:1}).addTo(window.heroMiniMap));
    setTimeout(()=>window.heroMiniMap.invalidateSize(true), 250);
  }

  const planCopy = {
    protect: ["01 · Stable Habitat Core", "Protect existing ecological anchors", "Keep mature tree cover, reduce lighting spill, protect nesting opportunities and avoid fragmentation around the strongest BHP areas."],
    connect: ["02 · Potential Corridor", "Connect blue-green stepping stones", "Use street trees, riparian edges, parks and reservoirs to close gaps between observed hotspots and support movement through the city."],
    retrofit: ["03 · Urban Pressure Area", "Retrofit dense built environments", "Introduce bird-friendly facades, nesting-sensitive renovation, de-paving, acoustic buffering and dark-sky lighting around pressure zones."],
    monitor: ["04 · Attention Zone", "Monitor seasonal change", "Repeat the workflow with future observation records to identify whether hotspots are stable, emerging or declining across seasons."]
  };
  document.querySelectorAll("[data-plan]").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll("[data-plan]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const v = planCopy[btn.dataset.plan];
    const box = document.getElementById("planningExplain");
    if (box && v) box.innerHTML = `<span>${v[0]}</span><h3>${v[1]}</h3><p>${v[2]}</p>`;
  }));

  const roadCopy = {
    network: ["Blue-green network", "Use rivers, reservoirs, parks and wooded edges as a connected movement system. BHP hotspots can identify where corridor continuity should be strengthened."],
    buildings: ["Building-sensitive design", "Treat buildings as part of the flyway: retain nesting opportunities, reduce disturbance during breeding windows, and add biodiversity-positive retrofit measures."],
    season: ["Seasonal management", "Use spring, summer and autumn hotspot differences to time maintenance, lighting controls and habitat management around sensitive periods."],
    policy: ["Policy integration", "Link BHP classes to London Plan priorities on urban greening, biodiversity net gain, ecological connectivity and climate-resilient neighbourhood design."]
  };
  document.querySelectorAll("[data-road]").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll("[data-road]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const v = roadCopy[btn.dataset.road];
    const box = document.getElementById("roadExplain");
    if (box && v) box.innerHTML = `<h3>${v[0]}</h3><p>${v[1]}</p>`;
  }));
})();

// v6: solid bird cursor click state + clearer animated hero background map
(function(){
  document.addEventListener('mousedown', () => document.body.classList.add('bird-cursor-open'));
  document.addEventListener('mouseup', () => document.body.classList.remove('bird-cursor-open'));
  document.addEventListener('mouseleave', () => document.body.classList.remove('bird-cursor-open'));

  const initHeroBgMap = () => {
    const el = document.getElementById('heroBgMap');
    if (!el || typeof L === 'undefined' || window.heroBgMapLeaflet || el._leaflet_id || el.dataset.loaded) return;
    window.heroBgMapLeaflet = L.map(el, { zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, boxZoom:false, keyboard:false, attributionControl:false }).setView([51.5072, -0.1276], 10.75);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { subdomains:'abcd', maxZoom:19 }).addTo(window.heroBgMapLeaflet);
    const flyway = [[51.49,-0.36],[51.505,-0.28],[51.515,-0.18],[51.51,-0.08],[51.50,0.04],[51.49,0.14]];
    L.polyline(flyway,{color:'#7fb4bd',weight:7,opacity:.72,lineCap:'round'}).addTo(window.heroBgMapLeaflet);
    L.polyline(flyway,{color:'#dce97a',weight:3,opacity:.9,lineCap:'round'}).addTo(window.heroBgMapLeaflet);
    flyway.forEach((p,i)=>L.circleMarker(p,{radius:6+i%2*2,color:'#263228',weight:1,fillColor:'#dce97a',fillOpacity:.9,opacity:.45}).addTo(window.heroBgMapLeaflet));
    setTimeout(()=>window.heroBgMapLeaflet.invalidateSize(true), 250);
    let z = 11;
    setInterval(()=>{
      z = z === 11 ? 11.35 : 11;
      window.heroBgMapLeaflet.flyTo([51.5072, -0.1276], z, {duration: 3.8, easeLinearity:.2});
    }, 5200);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeroBgMap); else initHeroBgMap();
})();

/* V9: force visible London map under cover after all layout shifts */
window.addEventListener('load', () => {
  if (window.heroBgMapLeaflet && typeof window.heroBgMapLeaflet.invalidateSize === 'function') {
    [120, 550, 1200].forEach(t => setTimeout(() => {
      if (!window.heroBgMapLeaflet || typeof window.heroBgMapLeaflet.invalidateSize !== 'function') return;
      window.heroBgMapLeaflet.invalidateSize(true);
      window.heroBgMapLeaflet.setView([51.5072, -0.1276], 10.75, {animate:false});
    }, t));
  }
});

/* V16: remove encoding artefacts from rendered copy */
(function () {
  const replacements = [
    [/馃惁/g, ""],
    [/鈫\?/g, "→"],
    [/鈥檚/g, "'s"],
    [/鈭\?/g, "−"],
    [/ · /g, " · "],
    [/·/g, "·"],
    [/岬\?/g, "i "],
    [/莽/g, "c"],
    [/虏/g, "²"],
    [/漏/g, "©"],
    [/鉁\?/g, "Email"],
    [/鈥/g, "'"],
    [/檚/g, "'s"]
  ];

  function cleanText(value) {
    return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
  }

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const cleaned = cleanText(node.nodeValue || "");
      if (cleaned !== node.nodeValue) node.nodeValue = cleaned;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(node.tagName)) return;
    node.childNodes.forEach(cleanNode);
  }

  function runCleanup() {
    cleanNode(document.body);
    document.querySelectorAll(".brand span, .bird-mark, .bird-dot-3d").forEach(el => {
      el.textContent = "";
      el.setAttribute("aria-hidden", "true");
    });
    document.querySelectorAll("[data-var='H']").forEach(el => el.textContent = "Hi Habitat quality");
    document.querySelectorAll("[data-var='C']").forEach(el => el.textContent = "Ci Connectivity");
    document.querySelectorAll("[data-var='D']").forEach(el => el.textContent = "Di Disturbance");
    document.querySelectorAll("[data-var='L']").forEach(el => el.textContent = "Li Light pollution");
    const formulaExplain = document.getElementById("formulaExplain");
    if (formulaExplain && formulaExplain.textContent.includes("i increases")) {
      formulaExplain.innerHTML = "<strong>Hi increases BHP.</strong><span>Higher habitat quality means stronger local support for migratory birds.</span>";
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", runCleanup);
  else runCleanup();
  window.addEventListener("load", runCleanup);
  if (document.body && !window.__encodingCleanupObserver) {
    window.__encodingCleanupObserver = new MutationObserver(() => window.requestAnimationFrame(runCleanup));
    window.__encodingCleanupObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
})();

/* V13: lightweight depth and interaction polish */
(function () {
  return;
  function addTakeaway(sectionId, title, items) {
    const section = document.getElementById(sectionId);
    if (!section || section.querySelector(".takeaway-strip")) return;
    const strip = document.createElement("div");
    strip.className = "takeaway-strip";
    strip.innerHTML = `
      <strong>${title}</strong>
      <div>${items.map((item, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-takeaway="${i}">${item[0]}</button>`).join("")}</div>
      <p>${items[0][1]}</p>
    `;
    const intro = section.querySelector(".section-intro, .soft-card, .bhp-map-copy, .team-heading");
    if (intro && intro.parentElement === section) intro.insertAdjacentElement("afterend", strip);
    else section.insertAdjacentElement("afterbegin", strip);
    const text = strip.querySelector("p");
    strip.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => {
        strip.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        text.textContent = items[Number(button.dataset.takeaway)][1];
      });
    });
  }

  addTakeaway("environmental-profiles", "Interpretation depth", [
    ["Green", "Green-rich hotspots are not just prettier areas: they suggest stronger local habitat capacity and lower friction for repeated bird activity."],
    ["Water", "Water-linked areas help explain movement and feeding corridors, especially where reservoirs and river edges connect otherwise fragmented urban habitat."],
    ["Built", "Built-up exceptions matter because they reveal where birds may still use dense urban fabric, but where design mitigation is most important."]
  ]);

  addTakeaway("compare-areas", "How to read the comparison", [
    ["Records", "The record bar shows observation intensity, but it should be interpreted alongside habitat indicators because records can be affected by access and reporting effort."],
    ["Habitat", "Green and water reveal whether bird activity aligns with ecological support rather than only with human observation density."],
    ["Pressure", "Built pressure shows where planning action should shift from protection toward retrofit, greening, and light-sensitive design."]
  ]);

  addTakeaway("limitations", "Evidence caution", [
    ["Bias", "Observation records are useful but not the same as true abundance; visible and accessible places can be over-represented."],
    ["Scale", "MSOA analysis is a screening layer. Site-level design would still need finer habitat, building, and lighting evidence."],
    ["Next", "A stronger next version would combine survey effort, land cover, night lights, and seasonal nesting evidence."]
  ]);
})();


