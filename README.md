# Australian road injury dashboard

Interactive D3.js dashboard for hospitalised road crash injuries in Australia. The dashboard covers five questions and includes a State Explorer for comparing jurisdictions. Annual jurisdiction figures span 2012–2021; age, road-user, remoteness, and First Nations breakdowns show 2021.

## Run locally

Open `index.html` in a browser. If local-file restrictions prevent scripts from loading, run a static server from this folder:

```powershell
python -m http.server 8200
```

Then open `http://localhost:8200/`. The site has no build step. D3.js and Motion browser bundles are included under `js/vendor/`.

## Pages and charts

- `index.html` — five-question dashboard: jurisdiction line chart, grouped age-and-sex bars, sorted road-user bars, remoteness donut, and log-scale First Nations dumbbell with a count table.
- `platform.html` — State Explorer: annual bars, jurisdiction ranking, and a two-jurisdiction line comparison. Changing “Compare against” redraws only the line chart.
- `about.html` — data interpretation, coverage notes, and links to the project Excel workbooks.

The charts are drawn as SVG with D3.js selections, scales, lines, and arcs. The dashboard includes chart tooltips and selectable jurisdictions, remoteness categories, and First Nations rows. A light/dark switch is shared across the pages and remembers the choice locally.

## Folder layout

```text
index.html                  dashboard
platform.html               State Explorer
about.html                  data and notes
README.md                   this guide
js/ and css/                dashboard scripts and styles
  app.js                    five dashboard charts and interactions
  explorer.js               State Explorer charts and interactions
  data.js                   prepared chart data
  vendor/                   bundled D3.js and Motion, with licenses
assets/                     Question1.xlsx through Question5.xlsx
charts/, css/, js/          earlier project implementation, retained for reference
```

## Reading the data

These are hospitalisation **counts**, not population-adjusted rates. The published Australia total may differ from the sum of reported jurisdictions. The age-by-sex rows sum to 39,504, one below the 2021 national total of 39,505. The remoteness chart includes “Other or unknown”. The First Nations unknown-area figures are residuals derived from group totals; the two reported group totals sum to 38,975, leaving 530 cases outside them.

The five assignment workbooks remain in `assets/`. The displayed chart values are in `js/road-data.js`; the dashboard lists the AIHW publication workbooks underlying those values. See `about.html` for coverage details.
