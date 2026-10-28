/* ===========================================================
   platform.js — deep-dive page for a single console.
   URL state (?platform=Wii), KPI cards, genre donut, yearly
   bars, top-games table with sorting, ESRB split, and a
   head-to-head comparison against any other platform.
   =========================================================== */

(function () {
    document.addEventListener("DOMContentLoaded", init);

    function getParam() {
        const p = new URLSearchParams(location.search).get("platform");
        return PLATFORMS.includes(p) ? p : "Wii";
    }

    function init() {
        if (!document.querySelector("#pf-page")) return;
        let current = getParam();
        let rival = current === "DS" ? "Wii" : "DS";
        let sortKey = "sales_m";
        let sortDir = -1;

        DATA.load().then((data) => {
            buildPills(data);
            buildRivalSelect();
            renderAll(data);

            window.addEventListener("popstate", () => {
                current = getParam();
                renderAll(data);
            });
        });

        /* ---------- platform switcher ---------- */
        function buildPills(data) {
            const box = d3.select("#pf-pills");
            box.selectAll("button").data(PLATFORMS).join("button")
                .attr("class", (d) => "pill" + (d === current ? " active" : ""))
                .style("--pc", (d) => PLATFORM_COLOR(d))
                .text((d) => PLATFORM_NAME[d])
                .on("click", (e, d) => {
                    current = d;
                    if (rival === current) rival = PLATFORMS.find((p) => p !== current);
                    history.pushState({}, "", "?platform=" + d);
                    renderAll(data);
                });
        }

        function buildRivalSelect() {
            d3.select("#pf-rival").on("change", function () {
                rival = this.value;
                DATA.load().then((data) => drawVersus(data));
            });
        }

        /* ---------- master render ---------- */
        function renderAll(data) {
            d3.selectAll("#pf-pills .pill").classed("active", (d) => d === current);

            const rows = data.games.filter((g) => g.platform === current);
            const py = data.plat.filter((d) => d.platform === current);

            /* hero */
            d3.select("#pf-name").text(PLATFORM_NAME[current]).style("color", PLATFORM_COLOR(current));
            d3.select("#pf-maker").text(PLATFORM_MAKER[current]);
            d3.select("#pf-blurb").html(narrative(data, current, rows, py));

            /* KPIs */
            const totalSales = d3.sum(py, (d) => d.sales_m);
            const allSales = d3.sum(data.plat, (d) => d.sales_m);
            const best = rows.slice().sort((a, b) => d3.descending(a.sales_m, b.sales_m))[0];
            animateNumber("#pf-kpi-sales", totalSales, (v) => v.toFixed(1) + "M");
            animateNumber("#pf-kpi-titles", rows.length, fmtInt);
            animateNumber("#pf-kpi-score", d3.mean(rows.filter((r) => r.score > 0), (r) => r.score) || 0, (v) => v.toFixed(0));
            d3.select("#pf-kpi-share").text(fmtPct(totalSales / allSales));
            d3.select("#pf-kpi-best").text(best ? best.title : "–");
            d3.select("#pf-kpi-best-sub").text(best ? best.sales_m.toFixed(2) + "M · " + best.year : "");

            /* rival dropdown options */
            const sel = d3.select("#pf-rival");
            sel.selectAll("option").data(PLATFORMS.filter((p) => p !== current))
                .join("option").attr("value", (d) => d).text((d) => PLATFORM_NAME[d]);
            if (rival === current) rival = PLATFORMS.find((p) => p !== current);
            sel.property("value", rival);

            drawYearBars(py);
            drawGenreDonut(rows);
            drawRatings(rows);
            drawTable(rows);
            drawVersus(data);
        }

        /* ---------- auto narrative ---------- */
        function narrative(data, p, rows, py) {
            const totals = PLATFORMS.map((q) => ({
                q, v: d3.sum(data.plat.filter((d) => d.platform === q), (d) => d.sales_m),
            })).sort((a, b) => d3.descending(a.v, b.v));
            const rank = totals.findIndex((t) => t.q === p) + 1;
            const mine = totals.find((t) => t.q === p).v;
            const peak = py.slice().sort((a, b) => d3.descending(a.sales_m, b.sales_m))[0];
            const topGenre = d3.rollups(rows, (v) => d3.sum(v, (d) => d.sales_m), (d) => d.genre)
                .sort((a, b) => d3.descending(a[1], b[1]))[0];
            const topPub = d3.rollups(rows.filter((r) => r.publisher !== "Unknown"),
                (v) => d3.sum(v, (d) => d.sales_m), (d) => d.publisher)
                .sort((a, b) => d3.descending(a[1], b[1]))[0];
            const avg = d3.mean(rows.filter((r) => r.score > 0), (r) => r.score);
            const allAvg = d3.mean(data.games.filter((r) => r.score > 0), (r) => r.score);
            const cmp = avg > allAvg + 1.5 ? "better reviewed than the generation average"
                : avg < allAvg - 1.5 ? "worse reviewed than the generation average"
                : "reviewed almost exactly at the generation average";

            return `The <b>${PLATFORM_NAME[p]}</b> ranks <b>#${rank} of 5</b> for software sales in this
        window with <b>${mine.toFixed(1)}M</b> units across <b>${rows.length}</b> tracked titles.
        Its strongest year was <b>${peak ? peak.year : "–"}</b>
        (${peak ? peak.sales_m.toFixed(1) : "0"}M), its biggest genre was
        <b>${topGenre ? topGenre[0] : "–"}</b>, and
        <b>${topPub ? topPub[0] : "–"}</b> was its most successful publisher.
        Games on the platform were ${cmp} (${avg ? avg.toFixed(0) : "–"} vs ${allAvg.toFixed(0)}).`;
        }

        /* ---------- yearly bars ---------- */
        function drawYearBars(py) {
            const sel = "#pf-year-chart";
            d3.select(sel).selectAll("*").remove();
            const S = makeSvg(sel, 620, 300, { top: 18, right: 18, bottom: 44, left: 62 });
            if (!S) return;
            const { g, width, height } = S;
            const years = py.map((d) => d.year).sort(d3.ascending);
            const x = d3.scaleBand().domain(years).range([0, width]).padding(0.28);
            const y = d3.scaleLinear().domain([0, d3.max(py, (d) => d.sales_m) * 1.15 || 1]).range([height, 0]);

            g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));
            g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
            g.append("g").attr("class", "y-axis").call(d3.axisLeft(y).ticks(5));

            g.selectAll("rect").data(py).join("rect")
                .attr("x", (d) => x(d.year)).attr("width", x.bandwidth()).attr("rx", 5)
                .attr("fill", PLATFORM_COLOR(current))
                .attr("y", height).attr("height", 0)
                .on("mousemove", (e, d) => Tip.show(
                    `<strong>${d.year}</strong><hr>
           <div class="tip-row"><span>Sales</span><b>${d.sales_m.toFixed(2)}M</b></div>
           <div class="tip-row"><span>Titles</span><b>${d.titles}</b></div>
           <div class="tip-row"><span>Avg score</span><b>${d.avg_score ? d.avg_score.toFixed(0) : "–"}</b></div>`, e))
                .on("mouseleave", Tip.hide)
                .transition().duration(700).delay((d, i) => i * 70)
                .attr("y", (d) => y(d.sales_m)).attr("height", (d) => height - y(d.sales_m));
        }

        /* ---------- genre donut ---------- */
        function drawGenreDonut(rows) {
            const sel = "#pf-genre-chart";
            d3.select(sel).selectAll("*").remove();
            const S = makeSvg(sel, 620, 300, { top: 10, right: 10, bottom: 10, left: 10 });
            if (!S) return;
            const { g, width, height } = S;
            const R = Math.min(width, height) / 2 - 6;
            const c = g.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

            const dataG = d3.rollups(rows, (v) => d3.sum(v, (d) => d.sales_m), (d) => d.genre)
                .map(([genre, v]) => ({ genre, v }))
                .sort((a, b) => d3.descending(a.v, b.v));
            const total = d3.sum(dataG, (d) => d.v);
            const pie = d3.pie().sort(null).value((d) => d.v)(dataG);
            const arc = d3.arc().innerRadius(R * 0.58).outerRadius(R).cornerRadius(3).padAngle(0.012);

            c.selectAll("path").data(pie).join("path")
                .attr("fill", (d) => GENRE_COLOR(d.data.genre))
                .attr("stroke", "var(--surface)").attr("stroke-width", 2)
                .on("mousemove", (e, d) => Tip.show(
                    `<strong>${d.data.genre}</strong><hr>
           <div class="tip-row"><span>Sales</span><b>${d.data.v.toFixed(2)}M</b></div>
           <div class="tip-row"><span>Share</span><b>${fmtPct(d.data.v / total)}</b></div>`, e))
                .on("mouseleave", Tip.hide)
                .transition().duration(750)
                .attrTween("d", function (d) {
                    const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
                    return (t) => arc(i(t));
                });

            c.append("text").attr("class", "donut-center").attr("text-anchor", "middle")
                .attr("dy", "-0.1em").style("font-size", "26px").style("font-weight", 800)
                .style("fill", "var(--ink)").text(total.toFixed(0) + "M");
            c.append("text").attr("text-anchor", "middle").attr("dy", "1.5em")
                .style("font-size", "12px").style("fill", "var(--ink-2)").text("total software");

            const leg = d3.select("#pf-genre-legend");
            leg.html("");
            const it = leg.selectAll("span").data(dataG).join("span").attr("class", "legend-item");
            it.append("i").attr("class", "swatch").style("background", (d) => GENRE_COLOR(d.genre));
            it.append("span").text((d) => `${d.genre} ${fmtPct(d.v / total)}`);
        }

        /* ---------- ESRB rating split ---------- */
        function drawRatings(rows) {
            const sel = "#pf-rating-chart";
            d3.select(sel).selectAll("*").remove();
            const S = makeSvg(sel, 620, 210, { top: 14, right: 20, bottom: 40, left: 52 });
            if (!S) return;
            const { g, width, height } = S;
            const agg = d3.rollups(rows.filter((r) => r.rating), (v) => ({
                titles: v.length, sales: d3.sum(v, (d) => d.sales_m),
            }), (d) => d.rating).map(([rating, o]) => ({ rating, ...o }))
                .sort((a, b) => d3.descending(a.sales, b.sales));

            if (!agg.length) { g.append("text").attr("class", "no-data").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").text("No rating data"); return; }

            const x = d3.scaleBand().domain(agg.map((d) => d.rating)).range([0, width]).padding(0.3);
            const y = d3.scaleLinear().domain([0, d3.max(agg, (d) => d.sales) * 1.15]).range([height, 0]);
            const rc = { E: "#5CB85C", "E10+": "#00B3E6", T: "#F0A020", M: "#E8544A" };

            g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
            g.append("g").attr("class", "y-axis").call(d3.axisLeft(y).ticks(4));
            g.selectAll("rect").data(agg).join("rect")
                .attr("x", (d) => x(d.rating)).attr("width", x.bandwidth()).attr("rx", 5)
                .attr("fill", (d) => rc[d.rating] || "#8E7CE8")
                .attr("y", height).attr("height", 0)
                .on("mousemove", (e, d) => Tip.show(
                    `<strong>ESRB ${d.rating}</strong><hr>
           <div class="tip-row"><span>Sales</span><b>${d.sales.toFixed(2)}M</b></div>
           <div class="tip-row"><span>Titles</span><b>${d.titles}</b></div>`, e))
                .on("mouseleave", Tip.hide)
                .transition().duration(650).delay((d, i) => i * 80)
                .attr("y", (d) => y(d.sales)).attr("height", (d) => height - y(d.sales));
        }

        /* ---------- sortable top-games table ---------- */
        function drawTable(rows) {
            const sorted = rows.slice().sort((a, b) =>
                sortDir * d3.ascending(a[sortKey] ?? 0, b[sortKey] ?? 0)).slice(0, 20);

            d3.select("#pf-table tbody").selectAll("tr").data(sorted, (d) => d.title)
                .join("tr")
                .html((d) => `
          <td class="t-title">${d.title}</td>
          <td>${d.year}</td>
          <td>${d.genre}</td>
          <td>${d.publisher}</td>
          <td class="num"><b>${d.sales_m.toFixed(2)}M</b></td>
          <td class="num">${d.score || "–"}</td>
          <td class="num">${d.hours || "–"}h</td>`);

            d3.selectAll("#pf-table th[data-key]")
                .classed("sorted", function () { return this.dataset.key === sortKey; })
                .attr("data-dir", function () {
                    return this.dataset.key === sortKey ? (sortDir < 0 ? "desc" : "asc") : null;
                })
                .on("click", function () {
                    const k = this.dataset.key;
                    if (k === sortKey) sortDir *= -1;
                    else { sortKey = k; sortDir = -1; }
                    DATA.load().then((data) =>
                        drawTable(data.games.filter((g) => g.platform === current)));
                });
        }

        /* ---------- head-to-head ---------- */
        function drawVersus(data) {
            const sel = "#pf-vs-chart";
            d3.select(sel).selectAll("*").remove();
            const S = makeSvg(sel, 620, 320, { top: 18, right: 22, bottom: 44, left: 62 });
            if (!S) return;
            const { g, width, height } = S;

            d3.select("#pf-vs-a").text(PLATFORM_NAME[current]).style("color", PLATFORM_COLOR(current));
            d3.select("#pf-vs-b").text(PLATFORM_NAME[rival]).style("color", PLATFORM_COLOR(rival));

            const years = data.years;
            const x = d3.scalePoint().domain(years).range([0, width]).padding(0.5);
            const both = [current, rival];
            const maxV = d3.max(both, (p) => d3.max(years, (y) => data.cumAt(p, y)));
            const y = d3.scaleLinear().domain([0, maxV * 1.1 || 1]).range([height, 0]);

            g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));
            g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
            g.append("g").attr("class", "y-axis").call(d3.axisLeft(y).ticks(5));
            g.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)")
                .attr("y", -46).attr("x", -height / 2).attr("text-anchor", "middle")
                .text("Cumulative units (M)");

            const line = d3.line().curve(d3.curveMonotoneX)
                .x((d) => x(d.year)).y((d) => y(d.v));

            both.forEach((p) => {
                const series = years.map((yr) => ({ year: yr, v: data.cumAt(p, yr) }));
                const path = g.append("path").datum(series).attr("fill", "none")
                    .attr("stroke", PLATFORM_COLOR(p)).attr("stroke-width", 3.5)
                    .attr("stroke-linecap", "round").attr("d", line);
                const L = path.node().getTotalLength();
                path.attr("stroke-dasharray", `${L} ${L}`).attr("stroke-dashoffset", L)
                    .transition().duration(900).attr("stroke-dashoffset", 0);

                g.selectAll(null).data(series).join("circle")
                    .attr("cx", (d) => x(d.year)).attr("cy", (d) => y(d.v)).attr("r", 4)
                    .attr("fill", PLATFORM_COLOR(p))
                    .on("mousemove", (e, d) => Tip.show(
                        `<strong>${PLATFORM_NAME[p]}</strong><span class="tip-sub">${d.year}</span><hr>
             <div class="tip-row"><span>Cumulative</span><b>${d.v.toFixed(2)}M</b></div>`, e))
                    .on("mouseleave", Tip.hide);
            });

            /* verdict line */
            const endYear = years[years.length - 1];
            const a = data.cumAt(current, endYear), b = data.cumAt(rival, endYear);
            const diff = Math.abs(a - b);
            const win = a >= b ? current : rival;
            const lose = a >= b ? rival : current;
            const winV = Math.max(a, b), loseV = Math.min(a, b);
            d3.select("#pf-vs-verdict").html(
                `By ${endYear}, <b style="color:${PLATFORM_COLOR(win)}">${PLATFORM_NAME[win]}</b>
         leads by <b>${diff.toFixed(1)}M</b> —
         ${winV.toFixed(1)}M vs ${PLATFORM_NAME[lose]}'s ${loseV.toFixed(1)}M.`
            );
        }
    }
})();
