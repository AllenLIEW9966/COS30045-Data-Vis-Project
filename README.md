# Allen GameDV — The Console War

Interactive D3.js v7 dashboard on the **seventh-generation console war (2004–2008)** —
Nintendo DS, Wii, Sony PSP, PS3 and Xbox 360 — plus a live snapshot of what the world
is playing on Steam today.

No build step. No installs. Pure HTML + CSS + D3 from CDN.

---

## Run it

Double-click **`START HERE.bat`**, or:

```bash
cd "Allen GameDV"
python -m http.server 8100
# open http://localhost:8100
```

Port **8100** is the games dashboard; the road safety folder uses **8200**, so both can
run at once without clashing. If you ever see the wrong dashboard, it's browser cache —
press **Ctrl+F5**.

Serving over HTTP is required — `d3.csv()` is blocked on `file://`. If you open the file
directly the page shows an explanatory screen rather than silently empty charts.

---

## The five visualisations

**1. The console war race** — the centrepiece. Cumulative sales bars grow *continuously*
(interpolated between years on a `requestAnimationFrame` loop, not snapped year to year),
overtake each other, and swap rank live. A 👑 marks the leader, a banner fires when the
lead changes, and era captions describe each real hardware launch. Play / pause / replay /
scrub / speed control, and cumulative-vs-annual toggle.

**2. Market split** — stacked area or lines, switchable between sales, cumulative, titles
released and average review score. Crosshair tooltip compares all five platforms at once.
**Has its own ▶ Play years control**: a sweep line moves across the chart and the area
draws in behind it.

**3. Genre heatmap** — genre × platform matrix showing each machine's personality.
Switch the cell metric between sales, title count and average score. **Play** rebuilds the
matrix cumulatively year by year so you can watch genres appear.

**4. Score vs sales scatter** — 1,212 games, position by review score, size by units sold.
Click legend entries to filter platforms; swap the Y axis to story length. **Play** pops
games in as their release year arrives (22 games by 2004 → 1,212 by 2008).

> The trend, heatmap and scatter share **one synchronised year clock** (`js/timeline.js`).
> Press play on any of the three and all three animate together. Axis scales and row
> ordering stay fixed during playback so nothing jumps around. `⟳ All` resets to the
> full range.


**5. Steam live** — top titles by concurrent players / owners / review count, with bar
colour encoding positive-review percentage.

**6. Platform Explorer** (`platform.html`) — the drill-down page. Pick any console to get
its own profile: KPI cards (total software, titles, avg score, share of generation,
best-selling game), an auto-written narrative computed from the data, sales-by-year bars,
a genre donut, an ESRB audience split, a sortable top-20 games table, and a head-to-head
cumulative race against any rival console you choose. Platform choice lives in the URL
(`platform.html?platform=X360`) so links are shareable, and browser back/forward works.

Reach it from the hero button, the nav, or by **clicking any bar in the console war race**.

---

## Structure

```
Allen GameDV/
├── index.html          main dashboard
├── platform.html       per-console deep dive
├── about.html          method, sources, limitations
├── START HERE.bat      one-click launcher
├── css/style.css       dark-first gaming theme, light mode, responsive
├── js/data.js          shared loader + file:// guard
├── js/timeline.js      shared year clock (trend/heatmap/scatter play in sync)
├── js/ui.js            tooltip, svg scaffold, legends, theme, exports
├── charts/race.js      the animated console war
├── charts/charts.js    trend, heatmap, scatter, steam
├── charts/platform.js  platform deep-dive page
└── assets/             7 derived CSVs
```

---

## Data — all real, nothing invented

| Source | What it gives |
|---|---|
| [CORGIS Video Games](https://corgis-edu.github.io/corgis/csv/video_games/) | 1,212 titles, 2004–2008: sales, review scores, genre, publisher, playtime |
| [SteamSpy API](https://steamspy.com/api.php) | 2,953 Steam titles: concurrent players, owner estimates, review ratios, price |

Derived files in `assets/`: `platform_year.csv`, `genre_year_platform.csv`, `games.csv`,
`publisher_year.csv`, `steam_games.csv`, `steam_publishers.csv`, `steam_price_buckets.csv`.

Multi-genre strings are reduced to their primary genre. SteamSpy owner ranges are converted
to midpoints.

**Limitations:** CORGIS covers only 2004–2008 and skews toward Metacritic-covered titles.
Steam owner counts are SteamSpy estimates, not Valve figures — treat as order-of-magnitude.
The Steam data is a point-in-time snapshot, not a live feed.

---

## Verified

Served locally and tested in-browser: **zero JS console errors**. All charts populate
(5 stacked layers, 40 heatmap cells, 1,212 scatter points, 15–25 Steam bars). The race was
confirmed genuinely animating — bar widths measured growing across frames
(`[580,178,0,0,0] → [580,253,102,23,7] → [580,333,282,258,102]`) with a real lead change
and a final cumulative total of **609.8M**, matching the source data exactly. Every toggle,
slider and legend filter exercised and working.
