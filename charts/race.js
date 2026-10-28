/* ===========================================================
   race.js — THE CONSOLE WAR
   A genuinely animated race: cumulative sales grow smoothly,
   bars overtake each other, rank medals swap, a running
   odometer counts up, and era captions fire on key years.
   Interpolates BETWEEN years so motion is continuous.
   =========================================================== */

(function () {
    document.addEventListener("DOMContentLoaded", init);

    /* narrative beats keyed to the data */
    const BEATS = {
        2004: "Nintendo DS launches. Dual screens, stylus, and nobody is sure it will work.",
        2005: "Xbox 360 arrives first out of the gate — a full year ahead of its rivals.",
        2006: "Wii and PS3 both land. Motion controls versus raw horsepower.",
        2007: "The Wii goes supernova. Casual players flood in and Nintendo takes the lead.",
        2008: "Peak seventh generation — the DS and Wii together dominate the industry.",
    };

    function init() {
        const sel = "#race-chart";
        if (!document.querySelector(sel)) return;

        const M = { top: 20, right: 150, bottom: 54, left: 200 };
        const S = makeSvg(sel, 1000, 470, M);
        if (!S) return;
        const { g, width, height } = S;

        DATA.load().then((data) => {
            const years = data.years;
            const Y0 = years[0], Y1 = years[years.length - 1];
            let t = Y0;              // continuous year position (float)
            let playing = false;
            let raf = null;
            let last = 0;
            let mode = "cum";        // cum | annual
            let prevOrder = [];

            const x = d3.scaleLinear().range([0, width]);
            const y = d3.scaleBand().range([0, height]).padding(0.25);

            const ghost = g.append("text").attr("class", "ghost-year")
                .attr("x", width).attr("y", height - 4).attr("text-anchor", "end");

            const gridG = g.append("g").attr("class", "grid");
            const xAxisG = g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
            const barsG = g.append("g");
            const labelG = g.append("g");

            g.append("text").attr("class", "axis-label")
                .attr("x", width / 2).attr("y", height + 44).attr("text-anchor", "middle")
                .attr("id", "race-xlabel").text("Cumulative units sold (millions)");

            /* value at a fractional year — this is the trick that makes it smooth */
            function valAt(p, tt) {
                const lo = Math.max(Y0, Math.floor(tt)), hi = Math.min(Y1, lo + 1);
                const f = tt - lo;
                const get = mode === "cum" ? data.cumAt : data.salesAt;
                const a = get(p, lo), b = get(p, hi);
                return a + (b - a) * f;
            }

            function frame(tt) {
                const rows = PLATFORMS.map((p) => ({ p, v: valAt(p, tt) }))
                    .sort((a, b) => d3.descending(a.v, b.v));

                x.domain([0, d3.max(rows, (d) => d.v) * 1.12 || 1]);
                y.domain(rows.map((d) => d.p));

                gridG.call(d3.axisBottom(x).ticks(6).tickSize(height).tickFormat(""));
                xAxisG.call(d3.axisBottom(x).ticks(6).tickFormat((v) => v.toFixed(0)));

                barsG.selectAll("rect")
                    .data(rows, (d) => d.p)
                    .join("rect")
                    .attr("class", "race-bar")
                    .attr("x", 0).attr("rx", 6)
                    .attr("fill", (d) => PLATFORM_COLOR(d.p))
                    .attr("y", (d) => y(d.p))
                    .attr("height", y.bandwidth())
                    .attr("width", (d) => Math.max(0, x(d.v)))
                    .on("mousemove", (e, d) => {
                        const yr = Math.round(tt);
                        const rk = rows.findIndex((r) => r.p === d.p) + 1;
                        Tip.show(
                            `<strong>${PLATFORM_NAME[d.p]}</strong><span class="tip-sub">${PLATFORM_MAKER[d.p]} · ${yr}</span><hr>
               <div class="tip-row"><span>${mode === "cum" ? "Cumulative" : "That year"}</span><b>${d.v.toFixed(2)}M</b></div>
               <div class="tip-row"><span>Rank</span><b>#${rk} of 5</b></div>
               <div class="tip-row"><span>Titles released</span><b>${(data.platIdx.get(d.p + "|" + yr) || {}).titles || 0}</b></div>`,
                            e
                        );
                    })
                    .on("mouseleave", Tip.hide)
                    .on("click", (e, d) => {
                        location.href = "platform.html?platform=" + d.p;
                    });
                const lab = labelG.selectAll("g.race-lab").data(rows, (d) => d.p)
                    .join((en) => {
                        const gg = en.append("g").attr("class", "race-lab");
                        gg.append("text").attr("class", "race-name").attr("text-anchor", "end").attr("x", -14);
                        gg.append("text").attr("class", "race-medal").attr("text-anchor", "end").attr("x", -170);
                        gg.append("text").attr("class", "race-val").attr("dy", "0.35em");
                        return gg;
                    });

                lab.select(".race-name")
                    .attr("y", (d) => y(d.p) + y.bandwidth() / 2 + 5)
                    .text((d) => PLATFORM_NAME[d.p]);
                lab.select(".race-medal")
                    .attr("y", (d) => y(d.p) + y.bandwidth() / 2 + 6)
                    .text((d, i) => (i === 0 ? "👑" : ""));
                lab.select(".race-val")
                    .attr("x", (d) => x(d.v) + 12)
                    .attr("y", (d) => y(d.p) + y.bandwidth() / 2)
                    .text((d) => d.v.toFixed(2) + "M");

                /* overtake flash */
                const order = rows.map((r) => r.p).join(",");
                if (prevOrder.length && order !== prevOrder.join(",")) {
                    const leader = rows[0].p;
                    if (prevOrder[0] !== leader) flashLeader(leader);
                }
                prevOrder = rows.map((r) => r.p);

                /* readouts */
                const yr = Math.round(tt);
                ghost.text(yr);
                d3.select("#race-year-out").text(yr);
                d3.select("#race-slider").property("value", tt);
                d3.select("#race-total").text(
                    d3.sum(rows, (d) => d.v).toFixed(1) + "M"
                );
                d3.select("#race-leader")
                    .text(PLATFORM_NAME[rows[0].p])
                    .style("color", PLATFORM_COLOR(rows[0].p));
                const beat = BEATS[yr];
                if (beat) d3.select("#race-beat").html(`<b>${yr}</b> — ${beat}`);
            }

            function flashLeader(p) {
                const box = d3.select("#race-flash");
                box.html(`👑 <b>${PLATFORM_NAME[p]}</b> takes the lead!`)
                    .style("border-color", PLATFORM_COLOR(p))
                    .classed("show", true);
                clearTimeout(box.node()._t);
                box.node()._t = setTimeout(() => box.classed("show", false), 1800);
            }

            /* ---- animation loop (rAF, speed-controlled) ---- */
            function tick(now) {
                if (!playing) return;
                const dt = last ? (now - last) / 1000 : 0;
                last = now;
                const speed = +d3.select("#race-speed").property("value") || 1;
                t += dt * 0.9 * speed;
                if (t >= Y1) {
                    t = Y1;
                    frame(t);
                    stop();
                    return;
                }
                frame(t);
                raf = requestAnimationFrame(tick);
            }
            function start() {
                if (t >= Y1) t = Y0;
                playing = true;
                last = 0;
                d3.select("#race-play").text("❚❚ Pause");
                raf = requestAnimationFrame(tick);
            }
            function stop() {
                playing = false;
                cancelAnimationFrame(raf);
                d3.select("#race-play").text("▶ Play the console war");
            }

            d3.select("#race-play").on("click", () => (playing ? stop() : start()));
            d3.select("#race-replay").on("click", () => {
                t = Y0;
                prevOrder = [];
                stop();
                start();
            });

            d3.select("#race-slider")
                .attr("min", Y0).attr("max", Y1).attr("step", 0.01).property("value", Y0)
                .on("input", function () {
                    stop();
                    t = +this.value;
                    frame(t);
                });

            d3.selectAll("[data-race-mode]").on("click", function () {
                d3.selectAll("[data-race-mode]").classed("active", false);
                d3.select(this).classed("active", true);
                mode = this.getAttribute("data-race-mode");
                d3.select("#race-xlabel").text(
                    mode === "cum" ? "Cumulative units sold (millions)" : "Units sold that year (millions)"
                );
                frame(t);
            });

            frame(Y0);
            /* auto-start once scrolled into view */
            if ("IntersectionObserver" in window) {
                const io = new IntersectionObserver(
                    (en) => {
                        if (en[0].isIntersecting) {
                            start();
                            io.disconnect();
                        }
                    },
                    { threshold: 0.45 }
                );
                io.observe(document.querySelector(sel));
            }
        });
    }
})();
