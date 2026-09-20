/* Interaction 3: BHP Attention Areas */
(function(){
  const mapEl = document.getElementById("bhpMap");
  if (!mapEl || typeof L === "undefined") return;

  let bhpData = null;
  let bhpLayer = null;
  let selectedLayer = null;
  let activeFilter = "all";
  const birdMarkerLayer = L.layerGroup();

  const palette = {
    "Stable Habitat Core": "#91BE7C",
    "Potential Corridor": "#86CFD2",
    "Attention Zone": "#F0CF6F",
    "Urban Pressure Area": "#D99673"
  };

  const actionCopy = {
    "Stable Habitat Core": { level: "High-value ecosystem preservation", action: "Protect existing habitat assets, avoid canopy loss, minimise light spill, and treat these areas as anchors in the wider flyway network." },
    "Potential Corridor": { level: "Strategic connectivity optimisation", action: "Strengthen blue-green stepping stones, improve native planting continuity, and reduce gaps between existing habitat patches." },
    "Attention Zone": { level: "Targeted improvement and monitoring", action: "Maintain current ecological value while reducing local stressors. These areas are suitable for focused greening, monitoring, and bird-sensitive retrofit." },
    "Urban Pressure Area": { level: "Critical restoration priority", action: "Prioritise de-paving, acoustic and light mitigation, building-sensitive biodiversity measures, and new green infrastructure." }
  };

  function classify(score){ score = Number(score || 0); if (score >= 70) return "Stable Habitat Core"; if (score >= 55) return "Potential Corridor"; if (score >= 40) return "Attention Zone"; return "Urban Pressure Area"; }
  function getClass(feature){ return feature.properties.BHP_Class || classify(feature.properties.BHP_Score); }
  function shouldDim(feature){ return activeFilter !== "all" && getClass(feature) !== activeFilter; }
  function colorFor(feature){ return palette[getClass(feature)] || palette["Attention Zone"]; }
  function styleFeature(feature){
    const dim = shouldDim(feature);
    return {
      fillColor: dim ? "#F7F0E2" : colorFor(feature),
      fillOpacity: dim ? 0.16 : 0.72,
      color: dim ? "rgba(73,86,69,.20)" : "rgba(39,62,50,.58)",
      weight: dim ? 0.55 : 0.95,
      opacity: 1
    };
  }
  function safeNumber(value, digits = 2){ const n = Number(value || 0); return Number.isFinite(n) ? n.toFixed(digits) : "0.00"; }

  function metricRow(label, value, color){
    const n = Math.max(0, Math.min(1, Number(value || 0)));
    return `<div class="bhp-metric-row"><span>${label}</span><div class="bhp-metric-track"><div class="bhp-metric-fill" style="width:${Math.round(n*100)}%; background:${color};"></div></div><strong>${n.toFixed(2)}</strong></div>`;
  }

  function updateInspector(feature){
    const p = feature.properties;
    const cls = getClass(feature);
    const score = Number(p.BHP_Score || 0);
    const action = actionCopy[cls];
    const inspector = document.getElementById("bhpInspector");
    if (!inspector) return;
    const habitat = Math.max(0.12, Math.min(1, Number(p.Hi_final || 0)));
    const connect = Math.max(0.12, Math.min(1, Number(p.Ci_n || 0)));
    const disturb = Math.max(0.12, Math.min(1, Number(p.Di_n || 0)));
    const light = Math.max(0.12, Math.min(1, Number(p.Li_n ?? p.Ei_n ?? p.Si_n ?? 0)));
    const built = Math.max(0.18, Math.min(1, (disturb * .62 + light * .38)));
    const green = Math.max(0.18, Math.min(1, (habitat * .7 + connect * .3)));
    inspector.innerHTML = `<p class="kicker">Area Inspector</p>
      <h3>${p.msoa21nm || "Unknown MSOA"}</h3>
      <p>${p.lad22nm || "London"} · ${Number(p.bird_count || 0).toLocaleString()} bird records</p>
      <div class="bhp-score-large" style="color:${palette[cls]};">${score.toFixed(1)}</div>
      <span class="bhp-class-pill" style="background:${palette[cls]};">${cls}</span>
      <div class="bhp-metric-list">
        ${metricRow("Habitat", habitat, "#91BE7C")}
        ${metricRow("Connect", connect, "#86CFD2")}
        ${metricRow("Disturb", disturb, "#D99673")}
        ${metricRow("Light pollution", light, "#F0CF6F")}
      </div>
      <div class="morphology-3d-card selected">
        <div class="morphology-head"><span>3D morphology profile</span><strong>${cls}</strong></div>
        <div class="mini-3d-scene" style="--green:${green}; --built:${built};" aria-label="Pseudo 3D urban morphology profile">
          <i style="--h:${Math.round(20 + built*54)}%;--x:8%;--d:0"></i>
          <i style="--h:${Math.round(28 + built*62)}%;--x:24%;--d:1"></i>
          <i class="green-block" style="--h:${Math.round(14 + green*38)}%;--x:43%;--d:2"></i>
          <i style="--h:${Math.round(22 + light*58)}%;--x:61%;--d:3"></i>
          <i class="water-block" style="--h:${Math.round(12 + connect*36)}%;--x:79%;--d:4"></i>
          <b class="flyway-line"></b>
        </div>
        <p class="morphology-note">The 3D card reads the selected MSOA as urban form: taller blocks mean stronger pressure, green/blue blocks indicate habitat support and corridor potential.</p>
      </div>
      <div class="bhp-action-card"><strong>${action.level}</strong><p>${action.action}</p></div>`;
  }

  function onEachFeature(feature, layer){
    const p = feature.properties;
    layer.bindTooltip(`<strong>${p.msoa21nm || "Unknown MSOA"}</strong><br>BHP: ${safeNumber(p.BHP_Score, 1)} · ${getClass(feature)}`, { sticky: true });
    layer.on({
      mouseover: e => { e.target.setStyle({ weight: 2.3, color: "#1f3126", fillOpacity: shouldDim(feature) ? 0.36 : 0.88 }); e.target.bringToFront(); birdMarkerLayer.bringToFront(); },
      mouseout: e => { if (e.target !== selectedLayer && bhpLayer) bhpLayer.resetStyle(e.target); },
      click: e => { if (selectedLayer && bhpLayer) bhpLayer.resetStyle(selectedLayer); selectedLayer = e.target; e.target.setStyle({ weight: 3, color: "#1f3126", fillOpacity: 0.92 }); updateInspector(feature); }
    });
  }

  const bhpMap = L.map("bhpMap", { zoomControl: false, preferCanvas: false }).setView([51.5072, -0.1276], 10);
  bhpMap.createPane("bhpPolygons"); bhpMap.getPane("bhpPolygons").style.zIndex = 420;
  bhpMap.createPane("bhpMarkers"); bhpMap.getPane("bhpMarkers").style.zIndex = 620;
  L.control.zoom({ position: "topright" }).addTo(bhpMap);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { attribution: "&copy; OpenStreetMap &copy; CARTO", opacity: 0.60, subdomains: "abcd", maxZoom: 19 }).addTo(bhpMap);

  function buildSummary(){
    if (!bhpData) return; const counts = { "Stable Habitat Core":0, "Potential Corridor":0, "Attention Zone":0, "Urban Pressure Area":0 };
    bhpData.features.forEach(f => counts[getClass(f)] = (counts[getClass(f)] || 0) + 1);
    const box = document.getElementById("bhpSummary"); if (!box) return;
    box.innerHTML = Object.entries(counts).map(([label,count]) => `<div class="bhp-summary-row"><i style="background:${palette[label]}"></i><span>${label}</span><strong>${count}</strong></div>`).join("");
  }

  function addBirdMarkers(){
    birdMarkerLayer.clearLayers(); if (!bhpData) return;
    const top = [...bhpData.features].filter(f => Number(f.properties.bird_count || 0) > 20).sort((a,b)=>Number(b.properties.bird_count||0)-Number(a.properties.bird_count||0)).slice(0,70);
    top.forEach(feature => { const layer = bhpLayer.getLayers().find(l => l.feature === feature); if (!layer) return; const center = layer.getBounds().getCenter(); const size = Math.max(14, Math.min(23, Number(feature.properties.bird_count || 0) / 48)); const marker = L.marker(center, { pane:"bhpMarkers", icon:L.divIcon({ className:"bhp-bird-marker", html:`<span class="bhp-swallow-pin" style="--s:${size}px;"><svg viewBox="0 0 64 64" aria-hidden="true"><path class="halo" d="M32 4a28 28 0 1 1 0 56 28 28 0 0 1 0-56Z"/><path class="body" d="M10 37c8-13 23-18 39-13 4 1.2 7 3 10 6-7 0-12 1.8-17 5 5 4 9 9 12 16-8-5-17-8-29-6-8 1.2-13-1.6-15-8Z"/><path class="wing" d="M23 36c7-8 17-9 26-7-8 2-15 7-21 16-2.4-2-4-4.6-5-9Z"/><path class="beak" d="M56 29l8 3-8 4Z"/></svg></span>`, iconSize:[size+16,size+16] }) }); marker.on("click", () => updateInspector(feature)); birdMarkerLayer.addLayer(marker); });
    birdMarkerLayer.addTo(bhpMap);
  }

  function updateFilter(filter){ activeFilter = filter; document.querySelectorAll("[data-bhp-filter]").forEach(btn => btn.classList.toggle("active", btn.dataset.bhpFilter === filter)); if (bhpLayer) bhpLayer.setStyle(styleFeature); }
  function refreshBhpMap(){ setTimeout(() => { bhpMap.invalidateSize(true); if (bhpLayer) { try { bhpMap.fitBounds(bhpLayer.getBounds(), { padding:[28,28], maxZoom:10 }); } catch(e){} } }, 180); }

  fetch("data/London_BHP_Results_2025.geojson").then(r => { if (!r.ok) throw new Error("Cannot load BHP GeoJSON"); return r.json(); }).then(data => {
    bhpData = data;
    bhpLayer = L.geoJSON(bhpData, { pane:"bhpPolygons", style:styleFeature, onEachFeature }).addTo(bhpMap);
    buildSummary(); addBirdMarkers(); refreshBhpMap();
    const status = document.getElementById("bhpMapStatus"); if (status) { status.textContent = `${bhpData.features.length.toLocaleString()} BHP polygons loaded`; status.classList.add("ready"); }
  }).catch(err => { console.error(err); const status = document.getElementById("bhpMapStatus"); if (status) status.textContent = "Cannot load data/London_BHP_Results_2025.geojson"; });

  document.querySelectorAll("[data-bhp-filter]").forEach(btn => btn.addEventListener("click", () => updateFilter(btn.dataset.bhpFilter)));
  const section = document.getElementById("attention-areas"); if (section) new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) refreshBhpMap(); }), {threshold:.15}).observe(section);
  window.bhpMap = bhpMap;
})();
