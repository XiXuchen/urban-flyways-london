(function () {
  const el = document.getElementById("msoa3dMap");
  if (!el || typeof mapboxgl === "undefined") return;

  el.innerHTML = "";
  const copyCard = document.querySelector(".msoa-3d-copy");
  if (copyCard) {
    const kicker = copyCard.querySelector(".kicker");
    const body = copyCard.querySelector("p:not(.kicker)");
    if (kicker) kicker.textContent = "Attention Zones · Urban Form Readout";
    if (body) {
      body.textContent = "Select one MSOA to see whether its urban form reads as ecological support, urban pressure, or a mixed attention zone. Green and blue are supportive; amber and purple are pressures.";
    }
  }
  const mapNote = document.querySelector(".msoa-3d-map-note");
  if (mapNote) mapNote.textContent = "Click a polygon to rebuild the 3D readout";

  mapboxgl.accessToken =
    "pk.eyJ1IjoieW9sb29vMDciLCJhIjoiY21sZWJ5MTFsMGlvMjNkczRtcjI3cG45ZSJ9.aMW93D1ealvvJyRESJqC3w";

  const map = new mapboxgl.Map({
    container: "msoa3dMap",
    style: "mapbox://styles/mapbox/light-v11",
    center: [-0.1276, 51.5072],
    zoom: 9.8,
    pitch: 58,
    bearing: -24,
    antialias: true
  });

  window.msoa3dRealMap = map;
  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

  const palette = {
    "Stable Habitat Core": "#9fba8e",
    "Potential Corridor": "#9ccfd3",
    "Attention Zone": "#e7c978",
    "Urban Pressure Area": "#d69a78"
  };

  const metricMeta = {
    habitat: { label: "Habitat", color: "#7eab72", soft: "#e7f2df" },
    connectivity: { label: "Connectivity", color: "#65b7be", soft: "#e2f3f4" },
    disturbance: { label: "Disturbance", color: "#d08a62", soft: "#f7e7dc" },
    light: { label: "Light", color: "#75576b", soft: "#eee4ed" }
  };

  function classify(score) {
    score = Number(score || 0);
    if (score >= 70) return "Stable Habitat Core";
    if (score >= 55) return "Potential Corridor";
    if (score >= 40) return "Attention Zone";
    return "Urban Pressure Area";
  }

  function getClass(f) {
    return f.properties.BHP_Class || classify(f.properties.BHP_Score);
  }

  function getName(p) {
    return p.msoa21nm || p.MSOA21NM || p.msoa11nm || p.name || p.Name || "Selected MSOA";
  }

  function getValue(p, keys, fallback = 0) {
    for (const k of keys) {
      if (p[k] !== undefined && p[k] !== null && p[k] !== "") {
        const v = Number(p[k]);
        if (!Number.isNaN(v)) return v;
      }
    }
    return fallback;
  }

  function normalise01(value, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    if (n > 1) return Math.max(0, Math.min(1, n / 100));
    return Math.max(0, Math.min(1, n));
  }

  function getMetrics(feature) {
    const p = feature.properties || {};
    const cls = getClass(feature);
    const classFallbacks = {
      "Stable Habitat Core": { habitat: 0.84, connectivity: 0.78, disturbance: 0.22, light: 0.18 },
      "Potential Corridor": { habitat: 0.66, connectivity: 0.74, disturbance: 0.38, light: 0.32 },
      "Attention Zone": { habitat: 0.42, connectivity: 0.52, disturbance: 0.58, light: 0.56 },
      "Urban Pressure Area": { habitat: 0.26, connectivity: 0.34, disturbance: 0.78, light: 0.74 }
    };
    const fb = classFallbacks[cls] || classFallbacks["Attention Zone"];

    return {
      habitat: normalise01(getValue(p, ["Hi_final", "H_i", "habitat", "Habitat"], fb.habitat), fb.habitat),
      connectivity: normalise01(getValue(p, ["Ci_n", "C_i", "connectivity", "Connectivity"], fb.connectivity), fb.connectivity),
      disturbance: normalise01(getValue(p, ["Di_n", "D_i", "disturbance", "Disturbance"], fb.disturbance), fb.disturbance),
      light: normalise01(getValue(p, ["Si_n", "Li_n", "L_i", "light_pollution", "Light_Pollution"], fb.light), fb.light),
      score: getValue(p, ["BHP_Score", "bhp_score"], 0),
      birds: getValue(p, ["bird_count", "Bird_Count", "records"], 0)
    };
  }

  function collectCoords(node, out) {
    if (!node) return;
    if (typeof node[0] === "number") out.push(node);
    else node.forEach(n => collectCoords(n, out));
  }

  function bbox(feature) {
    const coords = [];
    collectCoords(feature.geometry.coordinates, coords);
    const xs = coords.map(p => Number(p[0])).filter(Number.isFinite);
    const ys = coords.map(p => Number(p[1])).filter(Number.isFinite);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }

  function centroid(feature) {
    const b = bbox(feature);
    return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  }

  function circle(lon, lat, radius, sides = 32) {
    const coords = [];
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      coords.push([lon + Math.cos(a) * radius, lat + Math.sin(a) * radius]);
    }
    return [coords];
  }

  function makeSelectedColumns(feature) {
    const p = feature.properties || {};
    const cls = getClass(feature);
    const c = centroid(feature);
    const metrics = getMetrics(feature);

    const offsets = [
      [-1.5, -1.0], [-0.5, -1.0], [0.5, -1.0], [1.5, -1.0],
      [-1.5,  0.0], [-0.5,  0.0], [0.5,  0.0], [1.5,  0.0],
      [-1.5,  1.0], [-0.5,  1.0], [0.5,  1.0], [1.5,  1.0]
    ];
    const types = [
      "habitat", "disturbance", "disturbance", "light",
      "connectivity", "habitat", "disturbance", "light",
      "connectivity", "habitat", "connectivity", "disturbance"
    ];

    const features = offsets.map((o, i) => {
      const type = types[i];
      const value = Math.min(1, Math.max(0.08, metrics[type] * (0.86 + (i % 4) * 0.07)));
      const pressureType = type === "disturbance" || type === "light";
      const height = pressureType
        ? 80 + Math.pow(value, 1.45) * 980
        : 26 + Math.pow(value, 1.25) * 280;

      const lon = c[0] + o[0] * 0.00125;
      const lat = c[1] + o[1] * 0.00105;

      return {
        type: "Feature",
        properties: {
          height,
          color: metricMeta[type].color,
          metricType: type,
          metricLabel: metricMeta[type].label,
          metricValue: value,
          name: getName(p),
          bhpClass: cls
        },
        geometry: {
          type: "Polygon",
          coordinates: circle(lon, lat, 0.00042, 30)
        }
      };
    });

    return { type: "FeatureCollection", features };
  }

  function buildingHtml(type, value, index) {
    const h = Math.round(44 + value * 168);
    const shade = Math.round(82 + value * 18);
    const x = 8 + (index % 4) * 22;
    const y = 62 - Math.floor(index / 4) * 22;
    return `
      <button class="morph-building ${type}" type="button"
        style="--h:${h}px; --x:${x}%; --y:${y}%; --shade:${shade}%;"
        aria-label="${metricMeta[type].label} ${Math.round(value * 100)}%">
        <span>${Math.round(value * 100)}</span>
      </button>
    `;
  }

  function ensureMorphologyPanel() {
    const card = document.querySelector(".msoa-3d-stage-card");
    if (!card) return null;

    let panel = document.getElementById("msoaMorphologyPanel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "msoaMorphologyPanel";
    panel.className = "morphology-panel";

    const interp = document.getElementById("msoa3dInterpretation");
    if (interp) card.insertBefore(panel, interp);
    else card.appendChild(panel);

    return panel;
  }

  function renderMorphologyPanel(feature) {
    const panel = ensureMorphologyPanel();
    if (!panel) return;

    const p = feature.properties || {};
    const cls = getClass(feature);
    const name = getName(p);
    const m = getMetrics(feature);
    const pattern = [
      ["connectivity", m.connectivity], ["habitat", m.habitat], ["disturbance", m.disturbance], ["light", m.light],
      ["habitat", m.habitat * 0.92], ["connectivity", m.connectivity * 0.88], ["disturbance", m.disturbance * 1.04], ["light", m.light * 0.96],
      ["connectivity", m.connectivity * 0.82], ["habitat", m.habitat * 1.06], ["disturbance", m.disturbance * 0.88], ["light", m.light * 1.08]
    ].map(([type, value], i) => buildingHtml(type, Math.min(1, Math.max(0.08, value)), i)).join("");

    panel.innerHTML = `
      <div class="morph-toolbar" aria-label="3D morphology controls">
        <button class="active" type="button" data-view="isometric">Iso</button>
        <button type="button" data-view="plan">Plan</button>
        <button type="button" data-view="low">Low</button>
      </div>
      <div class="morph-scene isometric" aria-label="Interactive 3D urban morphology model">
        <div class="morph-orbit" aria-hidden="true"></div>
        <div class="morph-water" aria-hidden="true"></div>
        <div class="morph-green" aria-hidden="true"></div>
        <div class="morph-grid" aria-hidden="true"></div>
        ${pattern}
        <div class="morph-flight-path" aria-hidden="true"></div>
      </div>
      <div class="morph-meter-grid">
        ${Object.entries(metricMeta).map(([key, meta]) => `
          <div class="morph-meter ${key}">
            <span>${meta.label}</span>
            <strong>${Math.round(m[key] * 100)}</strong>
            <i><b style="width:${Math.round(m[key] * 100)}%; background:${meta.color}"></b></i>
          </div>
        `).join("")}
      </div>
      <div class="morph-caption">
        <strong>${name}</strong>
        <span>${cls} · BHP ${Math.round(m.score)} · ${Math.round(m.birds).toLocaleString()} bird records</span>
      </div>
    `;

    panel.querySelectorAll(".morph-toolbar button").forEach(button => {
      button.addEventListener("click", () => {
        panel.querySelectorAll(".morph-toolbar button").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        const scene = panel.querySelector(".morph-scene");
        scene.classList.remove("isometric", "plan", "low");
        scene.classList.add(button.dataset.view);
      });
    });
  }

  function renderReadoutPanel(feature) {
    const panel = ensureMorphologyPanel();
    if (!panel) return;

    const p = feature.properties || {};
    const cls = getClass(feature);
    const name = getName(p);
    const m = getMetrics(feature);
    const support = Math.round(((m.habitat + m.connectivity) / 2) * 100);
    const pressure = Math.round(((m.disturbance + m.light) / 2) * 100);
    const balance = Math.max(8, Math.min(92, support));
    const verdict =
      support >= pressure + 18 ? "Supportive corridor form" :
      pressure >= support + 18 ? "Pressure-dominated urban form" :
      "Mixed attention-zone form";
    const action =
      support >= pressure + 18 ? "Protect existing habitat and keep this MSOA connected to nearby blue-green corridors." :
      pressure >= support + 18 ? "Prioritise retrofit: reduce lighting spill, add vegetation, and soften hard urban edges." :
      "Manage the balance: strengthen green-blue links while monitoring disturbance and night-light pressure.";
    const rows = [
      ["habitat", "Habitat support", "Green capacity inside the MSOA", m.habitat],
      ["connectivity", "Connectivity", "How well it works as a stepping stone", m.connectivity],
      ["disturbance", "Disturbance", "Built/activity pressure on habitat", m.disturbance],
      ["light", "Night light", "Artificial light pressure", m.light]
    ];
    const hHeight = Math.round(52 + m.habitat * 96);
    const cHeight = Math.round(56 + m.connectivity * 110);
    const dHeight = Math.round(64 + m.disturbance * 128);
    const lHeight = Math.round(48 + m.light * 120);

    panel.innerHTML = `
      <div class="urban3d-card">
        <div class="urban3d-head">
          <div>
            <span>Interactive 3D reading</span>
            <strong>Support vs pressure block</strong>
          </div>
          <div class="urban3d-controls" aria-label="3D layer controls">
            <button class="active" type="button" data-layer="all">All</button>
            <button type="button" data-layer="support">Support</button>
            <button type="button" data-layer="pressure">Pressure</button>
          </div>
        </div>
        <div class="urban3d-scene show-all" style="--hH:${hHeight}px; --hC:${cHeight}px; --hD:${dHeight}px; --hL:${lHeight}px;" aria-label="3D urban-form model">
          <div class="urban3d-base"></div>
          <div class="urban3d-water"><span>corridor</span></div>
          <div class="urban3d-park"><span>habitat</span></div>
          <div class="urban3d-tower habitat"><b>Habitat</b></div>
          <div class="urban3d-tower connectivity"><b>Connectivity</b></div>
          <div class="urban3d-tower disturbance"><b>Disturbance</b></div>
          <div class="urban3d-tower light"><b>Light</b></div>
          <div class="urban3d-route">bird movement route</div>
        </div>
        <div class="urban3d-key">
          <span><i class="support-dot"></i>Green/blue = support</span>
          <span><i class="pressure-dot"></i>Amber/purple = pressure</span>
        </div>
      </div>
      <div class="readout-hero ${pressure > support ? "pressure" : "support"}">
        <span>${verdict}</span>
        <strong>${name}</strong>
        <p>${cls} · BHP ${Math.round(m.score)} · ${Math.round(m.birds).toLocaleString()} bird records</p>
      </div>
      <div class="balance-card" aria-label="Ecological support versus urban pressure">
        <div class="balance-head">
          <span>Ecological support</span>
          <strong>${support}</strong>
        </div>
        <div class="balance-track">
          <i class="support-fill" style="width:${balance}%"></i>
          <i class="balance-pin" style="left:${balance}%"></i>
        </div>
        <div class="balance-foot">
          <span>Support</span>
          <span>Pressure</span>
        </div>
        <div class="pressure-score"><span>Urban pressure</span><strong>${pressure}</strong></div>
      </div>
      <div class="diagnosis-grid">
        ${rows.map(([key, label, help, value]) => `
          <div class="diagnosis-row ${key}">
            <div>
              <span>${label}</span>
              <small>${help}</small>
            </div>
            <strong>${Math.round(value * 100)}</strong>
            <i><b style="width:${Math.round(value * 100)}%; background:${metricMeta[key].color}"></b></i>
          </div>
        `).join("")}
      </div>
      <div class="planning-translation">
        <span>Planning translation</span>
        <p>${action}</p>
      </div>
    `;

    panel.querySelectorAll(".urban3d-controls button").forEach(button => {
      button.addEventListener("click", () => {
        panel.querySelectorAll(".urban3d-controls button").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        const scene = panel.querySelector(".urban3d-scene");
        scene.classList.remove("show-all", "show-support", "show-pressure");
        scene.classList.add(`show-${button.dataset.layer}`);
      });
    });
  }

  function updatePanel(feature, columns) {
    const p = feature.properties || {};
    const cls = getClass(feature);
    const name = getName(p);
    const m = getMetrics(feature);

    const stats = document.getElementById("msoa3dStats");
    if (stats) {
      stats.innerHTML = `
        <div><span>Selected area</span><strong>${name}</strong></div>
        <div><span>BHP class</span><strong>${cls}</strong></div>
        <div><span>BHP score</span><strong>${Math.round(m.score)}</strong></div>
        <div><span>Bird records</span><strong>${Math.round(m.birds).toLocaleString()}</strong></div>
      `;
    }

    const clsEl = document.getElementById("msoa3dClass");
    if (clsEl) clsEl.textContent = cls;

    const text = document.getElementById("msoa3dInterpretation");
    if (text) {
      text.textContent =
        `${name} is read through four variables: habitat support, ecological connectivity, disturbance, and night light. The balance below explains whether the area feels more supportive or more pressured.`;
    }

    renderReadoutPanel(feature);
  }

  function selectFeature(feature) {
    const c = centroid(feature);
    const columns = makeSelectedColumns(feature);

    map.getSource("selected-msoa").setData({
      type: "FeatureCollection",
      features: [feature]
    });

    map.getSource("selected-columns").setData(columns);

    updatePanel(feature, columns);

    map.flyTo({
      center: c,
      zoom: 14.4,
      pitch: 68,
      bearing: -34,
      duration: 900
    });
  }

  function addLegend() {
    const old = document.querySelector(".msoa3d-legend");
    if (old) old.remove();

    const legend = document.createElement("div");
    legend.className = "msoa3d-legend";
    legend.innerHTML = `
      <h3>How to read this page</h3>
      <div><i class="select-icon"></i><span>Click one MSOA polygon</span></div>
      <div><i class="water-icon"></i><span>Right panel compares support and pressure</span></div>
      <div><i class="height-icon"></i><span>Use the result as a planning diagnosis</span></div>
    `;
    el.appendChild(legend);
  }

  map.on("load", () => {
    fetch("data/London_BHP_Results_2025.geojson")
      .then(r => r.json())
      .then(data => {
        data.features.forEach((f, i) => {
          f.id = i;
          f.properties.__id = i;
        });

        map.addSource("msoa", { type: "geojson", data });

        map.addLayer({
          id: "msoa-fill",
          type: "fill",
          source: "msoa",
          paint: {
            "fill-color": [
              "match",
              ["get", "BHP_Class"],
              "Stable Habitat Core", palette["Stable Habitat Core"],
              "Potential Corridor", palette["Potential Corridor"],
              "Attention Zone", palette["Attention Zone"],
              "Urban Pressure Area", palette["Urban Pressure Area"],
              "#dfe6da"
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false], 0.72,
              0.42
            ]
          }
        });

        map.addLayer({
          id: "msoa-line",
          type: "line",
          source: "msoa",
          paint: {
            "line-color": "rgba(35,48,39,.58)",
            "line-width": 0.75
          }
        });

        map.addSource("selected-msoa", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });

        map.addLayer({
          id: "selected-msoa-fill",
          type: "fill",
          source: "selected-msoa",
          paint: {
            "fill-color": "#dfe873",
            "fill-opacity": 0.35
          }
        });

        map.addLayer({
          id: "selected-msoa-line",
          type: "line",
          source: "selected-msoa",
          paint: {
            "line-color": "#263128",
            "line-width": 3
          }
        });

        map.addSource("selected-columns", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });

        map.addLayer({
          id: "selected-columns-3d",
          type: "fill-extrusion",
          source: "selected-columns",
          paint: {
            "fill-extrusion-color": ["get", "color"],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.9,
            "fill-extrusion-vertical-gradient": true
          }
        });

        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 16,
          className: "msoa3d-popup"
        });

        let hoveredId = null;

        map.on("click", "msoa-fill", e => {
          if (e.features && e.features[0]) selectFeature(e.features[0]);
        });

        map.on("mousemove", "msoa-fill", e => {
          map.getCanvas().style.cursor = "pointer";
          const feature = e.features && e.features[0];
          if (!feature) return;
          if (hoveredId !== null) map.setFeatureState({ source: "msoa", id: hoveredId }, { hover: false });
          hoveredId = feature.id;
          map.setFeatureState({ source: "msoa", id: hoveredId }, { hover: true });
          const p = feature.properties || {};
          popup
            .setLngLat(e.lngLat)
            .setHTML(`<strong>${getName(p)}</strong><span>${getClass(feature)} · BHP ${Math.round(getValue(p, ["BHP_Score"], 0))}</span>`)
            .addTo(map);
        });

        map.on("mouseleave", "msoa-fill", () => {
          map.getCanvas().style.cursor = "";
          if (hoveredId !== null) map.setFeatureState({ source: "msoa", id: hoveredId }, { hover: false });
          hoveredId = null;
          popup.remove();
        });

        addLegend();

        const first =
          data.features.find(f => getName(f.properties).includes("Waltham")) ||
          data.features[0];

        if (first) setTimeout(() => selectFeature(first), 600);
      });
  });

  const section = document.getElementById("msoa-3d");
  if (section) {
    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => map.resize(), 300);
          setTimeout(() => map.resize(), 900);
        }
      });
    }, { threshold: 0.12 }).observe(section);
  }
})();
