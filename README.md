# Urban Flyways in London

### A Spatiotemporal Analysis of Migratory Bird Distribution, Urban Habitat Conditions and Ecological Attention Zones

🔗 **Live Website:** https://hhyoloo.github.io/CASA0029-group-project/

📍 **Module:** CASA0029 Data Visualisation, UCL
👥 **Project:** Group 5
🧩 **Project Type:** Collaborative Group Project

---

## My Contribution

As a member of Group 5, my main contributions focused on the development of the **Bird Habitat Pressure (BHP) framework**, the **Attention Zones interface**, **Interactive Visualisation 3 — Habitat Comparison Tool**, and the **3D interactive visualisation** within the Attention Zones section.

### Key Contributions

* Developed the **Bird Habitat Pressure (BHP) framework**, combining habitat quality, ecological connectivity, human disturbance and light pollution indicators into an interpretable spatial measure.
* Designed and implemented the **Attention Zones interface**, translating BHP values into spatial categories for ecological interpretation.
* Designed and implemented **Interactive Visualisation 3 — Habitat Comparison Tool**, allowing users to compare two habitat profiles and explore differences in their environmental characteristics.
* Developed the **3D interactive visualisation** within the Attention Zones section, using indicator values associated with the selected MSOA to create an interactive 3D representation.
* Implemented interactive components including **profile selection, dynamic visual updates and spatial interaction**.
* Contributed to the integration of these interactive components into the final web-based visualisation and to the interpretation of spatial patterns and ecological attention areas.

---

## Project Overview

This project explores how migratory bird observations vary across London over time, and how these patterns relate to urban environmental conditions and potential ecological pressure.

Using bird observation data from NBN Atlas, combined with environmental layers derived from OpenStreetMap and aggregated at the MSOA level, we developed an interactive web-based application that integrates spatial exploration, comparative analysis and planning-oriented interpretation.

Three migratory species — **Swift, Swallow and House Martin** — were selected from the ten most frequently recorded species due to their distinct seasonal behaviour and different relationships with urban environments.

Rather than simply mapping observations, the project aims to interpret where ecological attention may be needed in London.

---

## Research Questions

The project addresses four main questions:

1. Why were Swift, Swallow and House Martin selected as focal species?
2. How do bird hotspots vary across seasons in London?
3. What urban environmental conditions distinguish hotspot and non-hotspot areas?
4. Which areas may require ecological attention under stronger habitat pressure?

---

## Website Structure

The website is organised into five sections:

* **Overview**
* **Flight Patterns**
* **Urban Habitat**
* **Attention Zones**
* **Future**

The analytical flow follows:

**species selection → seasonal patterns → hotspot identification → environmental comparison → habitat pressure → ecological attention**

---

## Main Interactive Components

### Interactive Visualisation 1 — Spatial Hotspots

This section explores where bird observations concentrate across London over time.

Main interactions include:

* species switching
* seasonal switching
* MSOA-level hotspot comparison
* hover-based spatial exploration

---

### Interactive Visualisation 2 — Urban Habitat Explorer

This section examines the environmental characteristics of bird hotspot areas.

The visualisation compares three key environmental dimensions:

* green coverage
* water proximity
* built intensity

It is designed to support comparison between hotspot profiles and their surrounding urban environmental conditions.

---

### Interactive Visualisation 3 — Habitat Comparison Tool

This module allows users to directly compare different habitat profiles and examine how their environmental conditions differ.

Main interactions include:

* dual habitat profile selection
* dynamic chart comparison
* difference interpretation (A − B)
* interactive exploration of environmental characteristics

The tool helps users understand how environmental conditions vary between different hotspot or habitat profiles.

---

### Interactive Visualisation 4 — Attention Zones

This section introduces the **Bird Habitat Pressure (BHP)** indicator as a simplified framework for identifying areas that may warrant ecological attention.

The BHP framework combines four dimensions:

* **Habitat Quality**
* **Connectivity**
* **Human Disturbance**
* **Light Pollution**

The framework provides an interpretable way of combining ecological and urban pressure indicators into a spatial measure.

Outputs include:

* pressure classification
* ecological attention zones
* planning-oriented interpretation

The BHP framework provides a way of combining environmental conditions with bird-related spatial patterns to support interpretation of potential ecological pressure.

---

## Statistical Visualisations

### Top 10 Migratory Species

Used to examine the frequency of recorded migratory species and provide the basis for selecting the three focal species.

### Monthly Seasonal Pattern

Used to examine temporal variation in bird observations and identify seasonal patterns across the selected species.

---

## Data Sources

| Data                 | Variables                  | Source        |
| -------------------- | -------------------------- | ------------- |
| Bird observations    | species, date, coordinates | NBN Atlas     |
| Green infrastructure | parks, woodland            | OpenStreetMap |
| Blue infrastructure  | rivers, lakes              | OpenStreetMap |
| Built environment    | roads, buildings           | OpenStreetMap |
| Boundary             | MSOA polygons              | ONS Geography |

---

## Methods

The project combines spatial analysis, environmental data integration and interactive web-based visualisation.

The main analytical workflow includes:

1. Processing bird observation records
2. Identifying frequently recorded migratory species
3. Examining seasonal patterns
4. Aggregating observations to MSOA-level spatial units
5. Identifying bird hotspot areas
6. Comparing environmental characteristics of hotspot areas
7. Developing the Bird Habitat Pressure (BHP) indicator
8. Identifying potential ecological attention zones
9. Developing interactive habitat comparison functionality
10. Developing the 3D interactive visualisation
11. Integrating the analyses into an interactive web application

---

## Repository Structure

```text
├── index.html
├── style.css
├── scripts/
│   ├── bhp.js
│   ├── chart.js
│   ├── map.js
│   ├── msoa3d.js
│   ├── site.js
│   ├── ui.js
├── data/
│   ├── bird_hotspot.geojson
│   ├── birds_msoa_hotspots.geojson
│   ├── urban_condition_summary.json
│   ├── woodland_final.geojson
│   ├── water_final.geojson
│   ├── building_centroid_10.geojson
├── images/
│   ├── swift.jpg
│   ├── swallow.jpg
│   ├── house-martin.jpg
│   ├── bird-cursor.svg
│   ├── bird-cursor-open.svg
├── README.md
```
