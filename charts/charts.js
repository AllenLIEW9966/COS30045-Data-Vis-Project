/* ===========================================================
   charts.js — trend (streamgraph/line), genre heatmap,
   scatter (score vs sales), Steam live panel.
   =========================================================== */

/* ---------- 1. TREND: stacked area or lines ---------- */
(function () {
    document.addEventListener("DOMContentLoaded", init);
    function init() {
        const sel = "#trend-chart";
        if (!document.querySelector(sel)) return;
        const M = { top: 24, right: 110, bottom: 56, left: 78 };
        const S = makeSvg(sel, 1000, 440, M);
        if (!S) return;
        const { g, width, height } = S;

        DATA.load().then((data) => {
            let shape = "stack";
            let metric = "sales_m";

            const x = d3.scaleLinear().domain(d3.extent(data.years)).range([0, width]);
            const y = d3.scaleLinear().range([height, 0]);
            const gridG = g.append("g").attr("class", "grid");
            const body = g.append("g");
            const xAxisG = g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
            const yAxisG = g.append("g").attr("class", "y-axis");
            const endG = g.append("g");
            const cross = g.append("line").attr("class", "crosshair").attr("y1", 0).attr("y2", height).style("opacity", 0);

            g.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)")
                .attr("y", -58).attr("x", -height / 2).attr("text-anchor", "middle")
                .attr("id", "trend-ylab").text("Units sold (millions)");

            function series() {
                return PLATFORMS.map((p) => ({
                    p,
                    values: data.years.map((yr) => ({
                        year: yr,
                        v: metric === "sales_m" ? data.salesAt(p, yr)
                           : metric === "cum" ? data.cumAt(p, yr)
                           : (data.platIdx.get(p + "|" + yr) || {})[metric] || 0,
                    })),
                }));
            }

            function render() {
                const S2 = series();
                const wide = data.years.map((yr) => {
                    const o = { year: yr };
                    S2.forEach((s) => (o[s.p] = s.values.find((d) => d.year === yr).v));
                    return o;
                });

                d3.select("#trend-ylab").text(
                    metric === "avg_score" ? "Average review score"
                    : metric === "titles" ? "Titles released"
                    : metric === "cum" ? "Cumulative units (M)"
                    : "Units sold (millions)"
                );

                const t = d3.transition().duration(700);

                if (shape === "stack" && metric !== "avg_score") {
                    const stacked = d3.stack().keys(PLATFORMS).order(d3.stackOrderInsideOut)(wide);
                    /* stackOrderInsideOut reorders layers, so the last array is NOT
                       necessarily the top one — scan every layer for the true max. */
                    const topMax = d3.max(stacked, (layer) => d3.max(layer, (d) => d[1])) || 1;
                    y.domain([0, topMax * 1.05]);
                    const area = d3.area().curve(d3.curveBasis)
                        .x((d) => x(d.data.year)).y0((d) => y(d[0])).y1((d) => y(d[1]));
                    body.selectAll("path.layer").data(stacked, (d) => d.key)
                        .join("path").attr("class", "layer")
                        .attr("fill", (d) => PLATFORM_COLOR(d.key))
                        .attr("opacity", 0.92)
                        .on("mousemove", function (e, d) {
                            body.selectAll("path.layer").attr("opacity", (l) => (l.key === d.key ? 1 : 0.22));
                            const yr = Math.round(x.invert(d3.pointer(e, this)[0]));
                            const rec = wide.find((w) => w.year === yr);
                            Tip.show(`<strong>${PLATFORM_NAME[d.key]}</strong><span class="tip-sub">${yr}</span><hr>
                <div class="tip-row"><span>Value</span><b>${rec ? rec[d.key].toFixed(2) : "–"}</b></div>`, e);
                        })
                        .on("mouseleave", () => { body.selectAll("path.layer").attr("opacity", 0.92); Tip.hide(); })
                        .transition(t).attr("d", area);
                    body.selectAll("path.lineser").remove();
                    endG.selectAll("*").remove();
                } else {
                    const allv = S2.flatMap((s) => s.values.map((d) => d.v));
                    y.domain(metric === "avg_score" ? [d3.min(allv) - 5, d3.max(allv) + 5] : [0, d3.max(allv) * 1.1]);
                    const line = d3.line().curve(d3.curveMonotoneX).x((d) => x(d.year)).y((d) => y(d.v));
                    body.selectAll("path.layer").remove();
                    body.selectAll("path.lineser").data(S2, (d) => d.p)
                        .join("path").attr("class", "lineser")
                        .attr("fill", "none").attr("stroke-width", 3.5).attr("stroke-linecap", "round")
                        .attr("stroke", (d) => PLATFORM_COLOR(d.p))
                        .transition(t).attr("d", (d) => line(d.values));
                    endG.selectAll("text").data(S2, (d) => d.p)
                        .join("text").attr("class", "end-label")
                        .attr("fill", (d) => PLATFORM_COLOR(d.p)).attr("x", width + 8)
                        .transition(t).attr("y", (d) => y(d.values[d.values.length - 1].v) + 4)
                        .text((d) => d.p);
                }

                xAxisG.transition(t).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));
                yAxisG.transition(t).call(d3.axisLeft(y).ticks(6));
                gridG.transition(t).call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(""));

                g.selectAll("rect.hover-surface").data([0]).join("rect")
                    .attr("class", "hover-surface").attr("width", width).attr("height", height)
                    .style("fill", "transparent")
                    .on("mousemove", function (e) {
                        const yr = Math.round(x.invert(d3.pointer(e, this)[0]));
                        if (!data.years.includes(yr)) return;
                        cross.style("opacity", 1).attr("x1", x(yr)).attr("x2", x(yr));
                        const rows = S2.map((s) => ({ p: s.p, v: s.values.find((d) => d.year === yr).v }))
                            .sort((a, b) => d3.descending(a.v, b.v));
                        Tip.show(`<strong>${yr}</strong><hr>` + rows.map((r) =>
                            `<div class="tip-row"><span><i class="swatch" style="background:${PLATFORM_COLOR(r.p)}"></i>${PLATFORM_NAME[r.p]}</span><b>${r.v.toFixed(2)}</b></div>`).join(""), e);
                    })
                    .on("mouseleave", () => { cross.style("opacity", 0); Tip.hide(); });
            }

            /* ---- timeline sweep: clip the plot to the current year ---- */
            const clipId = "trend-clip";
            const clipRect = S.svg.append("defs").append("clipPath").attr("id", clipId)
                .append("rect").attr("x", -2).attr("y", -10)
                .attr("height", height + 20).attr("width", width + 4);
            body.attr("clip-path", `url(#${clipId})`);

            const sweep = g.append("line").attr("class", "sweep-line")
                .attr("y1", -6).attr("y2", height).style("opacity", 0);
            const sweepDot = g.append("circle").attr("class", "sweep-dot").attr("r", 4).style("opacity", 0);

            Timeline.on((yr, playing) => {
                const px = x(yr);
                clipRect.attr("width", Math.max(0, px + 2));
                const showing = playing || yr < Timeline.Y1 - 0.001;
                sweep.style("opacity", showing ? 0.9 : 0).attr("x1", px).attr("x2", px);
                sweepDot.style("opacity", showing ? 0.9 : 0).attr("cx", px).attr("cy", -6);
                endG.style("opacity", showing ? 0 : 1);
            });

            htmlLegendP("#trend-legend", PLATFORMS);
            d3.selectAll("[data-trend-shape]").on("click", function () {
                d3.selectAll("[data-trend-shape]").classed("active", false);
                d3.select(this).classed("active", true);
                shape = this.getAttribute("data-trend-shape");
                render();
            });
            d3.selectAll("[data-trend-metric]").on("click", function () {
                d3.selectAll("[data-trend-metric]").classed("active", false);
                d3.select(this).classed("active", true);
                metric = this.getAttribute("data-trend-metric");
                render();
            });
            render();
        });
    }
})();

function htmlLegendP(sel, items) {
    const box = d3.select(sel);
    if (!box.node()) return;
    box.html("");
    const r = box.selectAll("span").data(items).join("span").attr("class", "legend-item");
    r.append("i").attr("class", "swatch").style("background", (d) => PLATFORM_COLOR(d));
    r.append("span").text((d) => PLATFORM_NAME[d]);
}

/* ---------- 2. GENRE HEATMAP ---------- */
(function () {
    document.addEventListener("DOMContentLoaded", init);
    function init() {
        const sel = "#heat-chart";
        if (!document.querySelector(sel)) return;
        const M = { top: 30, right: 20, bottom: 120, left: 110 };
        const S = makeSvg(sel, 1000, 420, M);
        if (!S) return;
        const { g, width, height } = S;

        DATA.load().then((data) => {
            let metric = "sales_m";
            let upto = 9999;   // cumulative year cutoff driven by the timeline

            function buildAgg() {
                const rows = data.genre.filter((d) => d.year <= upto);
                return d3.rollup(rows, (v) => ({
                    sales_m: d3.sum(v, (d) => d.sales_m),
                    titles: d3.sum(v, (d) => d.titles),
                    avg_score: d3.mean(v, (d) => d.avg_score),
                }), (d) => d.genre, (d) => d.platform);
            }
            let agg = buildAgg();

            /* fixed genre order from the full dataset so rows don't jump while playing */
            const fullAgg = d3.rollup(data.genre, (v) => d3.sum(v, (d) => d.sales_m),
                (d) => d.genre);
            const genres = [...fullAgg.keys()].sort((a, b) =>
                d3.descending(fullAgg.get(a), fullAgg.get(b)));

            const x = d3.scaleBand().domain(PLATFORMS).range([0, width]).padding(0.06);
            const y = d3.scaleBand().domain(genres).range([0, height]).padding(0.06);
            const color = d3.scaleSequential(d3.interpolateInferno);

            g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).tickFormat((d) => PLATFORM_NAME[d]))
                .selectAll("text").attr("transform", "rotate(-28)").style("text-anchor", "end");
            g.append("g").attr("class", "y-axis").call(d3.axisLeft(y));

            function render(fast) {
                const cells = [];
                genres.forEach((gn) => PLATFORMS.forEach((p) => {
                    const o = agg.get(gn) && agg.get(gn).get(p);
                    cells.push({ gn, p, v: o ? o[metric] || 0 : 0, o });
                }));
                color.domain([0, d3.max(cells, (d) => d.v) || 1]);

                g.selectAll("rect.cell").data(cells, (d) => d.gn + d.p)
                    .join("rect").attr("class", "cell")
                    .attr("x", (d) => x(d.p)).attr("y", (d) => y(d.gn))
                    .attr("width", x.bandwidth()).attr("height", y.bandwidth()).attr("rx", 3)
                    .on("mousemove", (e, d) => Tip.show(
                        `<strong>${d.gn}</strong><span class="tip-sub">${PLATFORM_NAME[d.p]}${upto < 9999 ? " · up to " + upto : ""}</span><hr>
             <div class="tip-row"><span>Sales</span><b>${d.o ? d.o.sales_m.toFixed(2) + "M" : "–"}</b></div>
             <div class="tip-row"><span>Titles</span><b>${d.o ? d.o.titles : 0}</b></div>
             <div class="tip-row"><span>Avg score</span><b>${d.o && d.o.avg_score ? d.o.avg_score.toFixed(0) : "–"}</b></div>`, e))
                    .on("mouseleave", Tip.hide)
                    .transition().duration(fast ? 0 : 600)
                    .attr("fill", (d) => (d.v ? color(d.v) : "rgba(128,128,128,.12)"));
            }

            Timeline.on((yr, playing) => {
                const cut = Math.round(yr);
                if (cut === upto) return;
                upto = cut;
                agg = buildAgg();
                render(true);
                d3.select("#heat-year").text(upto >= Timeline.Y1 ? "all years" : "2004–" + upto);
            });

            d3.selectAll("[data-heat-metric]").on("click", function () {
                d3.selectAll("[data-heat-metric]").classed("active", false);
                d3.select(this).classed("active", true);
                metric = this.getAttribute("data-heat-metric");
                render();
            });
            render();
        });
    }
})();

/* ---------- 3. SCATTER: review score vs sales ---------- */
(function () {
    document.addEventListener("DOMContentLoaded", init);
    function init() {
        const sel = "#scatter-chart";
        if (!document.querySelector(sel)) return;
        const M = { top: 24, right: 24, bottom: 62, left: 74 };
        const S = makeSvg(sel, 1000, 460, M);
        if (!S) return;
        const { g, width, height } = S;

        DATA.load().then((data) => {
            const active = new Set(PLATFORMS);
            let yAxis = "sales_m";
            let upto = 9999;   // release-year cutoff driven by the timeline

            const x = d3.scaleLinear().domain([20, 100]).range([0, width]);
            const y = d3.scaleLinear().range([height, 0]);
            const r = d3.scaleSqrt().range([3, 22]);

            g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(""));
            const xAxisG = g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
            const yAxisG = g.append("g").attr("class", "y-axis");
            const gridG = g.select(".grid");

            g.append("text").attr("class", "axis-label").attr("x", width / 2).attr("y", height + 46)
                .attr("text-anchor", "middle").text("Review score (Metacritic-style, 0–100)");
            const ylab = g.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)")
                .attr("y", -56).attr("x", -height / 2).attr("text-anchor", "middle").text("Units sold (millions)");

            function render(fast) {
                const pts = data.games.filter((d) => active.has(d.platform) && d.score > 0 && d.year <= upto);
                y.domain([0, d3.max(data.games.filter((d)=>d.score>0), (d) => d[yAxis]) * 1.08 || 1]);
                r.domain([0, d3.max(data.games, (d) => d.sales_m) || 1]);
                ylab.text(yAxis === "sales_m" ? "Units sold (millions)" : "Main story length (hours)");

                const t = d3.transition().duration(fast ? 220 : 650);
                xAxisG.transition(t).call(d3.axisBottom(x).ticks(8));
                yAxisG.transition(t).call(d3.axisLeft(y).ticks(6));
                gridG.transition(t).call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(""));

                g.selectAll("circle.pt").data(pts, (d) => d.title + d.platform)
                    .join(
                        (en) => en.append("circle").attr("class", "pt")
                            .attr("cx", (d) => x(d.score)).attr("cy", (d) => y(d[yAxis])).attr("r", 0),
                        (u) => u,
                        (ex) => ex.transition(t).attr("r", 0).remove()
                    )
                    .attr("fill", (d) => PLATFORM_COLOR(d.platform))
                    .attr("fill-opacity", 0.55)
                    .attr("stroke", (d) => PLATFORM_COLOR(d.platform))
                    .on("mousemove", (e, d) => Tip.show(
                        `<strong>${d.title}</strong><span class="tip-sub">${PLATFORM_NAME[d.platform]} · ${d.year} · ${d.genre}</span><hr>
             <div class="tip-row"><span>Sales</span><b>${d.sales_m.toFixed(2)}M</b></div>
             <div class="tip-row"><span>Review score</span><b>${d.score}</b></div>
             <div class="tip-row"><span>Main story</span><b>${d.hours}h</b></div>
             <div class="tip-row"><span>Publisher</span><b>${d.publisher}</b></div>`, e))
                    .on("mouseleave", Tip.hide)
                    .transition(t)
                    .attr("cx", (d) => x(d.score)).attr("cy", (d) => y(d[yAxis]))
                    .attr("r", (d) => r(d.sales_m));

                d3.select("#scatter-count").text(
                    pts.length + " games" + (upto < 9999 ? " released by " + upto : " shown")
                );
            }

            Timeline.on((yr) => {
                const cut = Math.round(yr);
                if (cut === upto) return;
                upto = cut;
                render(true);
            });

            const rows = d3.select("#scatter-legend").selectAll("span").data(PLATFORMS)
                .join("span").attr("class", "legend-item clickable")
                .on("click", function (e, d) {
                    active.has(d) ? active.delete(d) : active.add(d);
                    if (!active.size) PLATFORMS.forEach((p) => active.add(p));
                    d3.select(this).classed("off", !active.has(d));
                    render();
                });
            rows.append("i").attr("class", "swatch").style("background", (d) => PLATFORM_COLOR(d));
            rows.append("span").text((d) => PLATFORM_NAME[d]);

            d3.selectAll("[data-scatter-y]").on("click", function () {
                d3.selectAll("[data-scatter-y]").classed("active", false);
                d3.select(this).classed("active", true);
                yAxis = this.getAttribute("data-scatter-y");
                render();
            });
            render();
        });
    }
})();

/* ---------- 4. STEAM LIVE PANEL ---------- */
(function () {
    document.addEventListener("DOMContentLoaded", init);
    function init() {
        const sel = "#steam-chart";
        if (!document.querySelector(sel)) return;
        const M = { top: 20, right: 90, bottom: 50, left: 210 };
        const S = makeSvg(sel, 1000, 460, M);
        if (!S) return;
        const { g, width, height } = S;

        DATA.load().then((data) => {
            let metric = "ccu";
            let n = 15;

            const x = d3.scaleLinear().range([0, width]);
            const y = d3.scaleBand().range([0, height]).padding(0.22);
            const xAxisG = g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
            const yAxisG = g.append("g").attr("class", "y-axis");
            const color = d3.scaleSequential(d3.interpolateTurbo).domain([60, 100]);

            function render() {
                const rows = data.steam.slice().sort((a, b) => d3.descending(a[metric], b[metric])).slice(0, n);
                x.domain([0, d3.max(rows, (d) => d[metric]) * 1.1 || 1]);
                y.domain(rows.map((d) => d.name));

                const t = d3.transition().duration(700);
                xAxisG.transition(t).call(d3.axisBottom(x).ticks(6).tickFormat(fmtCompact));
                yAxisG.transition(t).call(d3.axisLeft(y).tickSize(0));

                g.selectAll("rect.sbar").data(rows, (d) => d.appid)
                    .join("rect").attr("class", "sbar").attr("x", 0).attr("rx", 4)
                    .attr("fill", (d) => color(d.rating_pct))
                    .on("mousemove", (e, d) => Tip.show(
                        `<strong>${d.name}</strong><span class="tip-sub">${d.publisher}</span><hr>
             <div class="tip-row"><span>Players right now</span><b>${fmtInt(d.ccu)}</b></div>
             <div class="tip-row"><span>Owners (est.)</span><b>${fmtCompact(d.owners_est)}</b></div>
             <div class="tip-row"><span>Positive reviews</span><b>${d.rating_pct}%</b></div>
             <div class="tip-row"><span>Price</span><b>${d.price_usd ? "$" + d.price_usd : "Free"}</b></div>`, e))
                    .on("mouseleave", Tip.hide)
                    .transition(t)
                    .attr("y", (d) => y(d.name)).attr("height", y.bandwidth())
                    .attr("width", (d) => x(d[metric]));

                g.selectAll("text.sval").data(rows, (d) => d.appid)
                    .join("text").attr("class", "sval race-val").attr("dy", "0.35em")
                    .transition(t)
                    .attr("x", (d) => x(d[metric]) + 9)
                    .attr("y", (d) => y(d.name) + y.bandwidth() / 2)
                    .text((d) => fmtCompact(d[metric]));
            }

            d3.selectAll("[data-steam-metric]").on("click", function () {
                d3.selectAll("[data-steam-metric]").classed("active", false);
                d3.select(this).classed("active", true);
                metric = this.getAttribute("data-steam-metric");
                render();
            });
            d3.select("#steam-n").on("input", function () {
                n = +this.value;
                d3.select("#steam-n-out").text(n);
                render();
            });
            render();
        });
    }
})();
