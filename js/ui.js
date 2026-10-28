/* ===========================================================
   ui.js — shared helpers: tooltip, responsive svg, legends,
   number animation, scrollytelling reveal, theme toggle.
   =========================================================== */

/* ---------- singleton tooltip ---------- */
const Tip = (function () {
    let el = null;
    function node() {
        if (!el) {
            el = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
        }
        return el;
    }
    return {
        show(html, event) {
            node()
                .html(html)
                .style("opacity", 1)
                .style("left", event.pageX + 16 + "px")
                .style("top", event.pageY - 12 + "px");
        },
        move(event) {
            node()
                .style("left", event.pageX + 16 + "px")
                .style("top", event.pageY - 12 + "px");
        },
        hide() {
            node().style("opacity", 0);
        },
    };
})();

/* ---------- responsive svg scaffold ---------- */
function makeSvg(selector, W, H, margin) {
    const container = d3.select(selector);
    if (!container.node()) return null;
    container.selectAll("svg").remove();
    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("role", "img");
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    return {
        svg,
        g,
        width: W - margin.left - margin.right,
        height: H - margin.top - margin.bottom,
    };
}

/* ---------- swatch legend (html, wraps nicely) ---------- */
function htmlLegend(selector, items, colorFn, onClick) {
    const box = d3.select(selector);
    if (!box.node()) return;
    box.html("");
    const rows = box
        .selectAll("span.legend-item")
        .data(items)
        .join("span")
        .attr("class", "legend-item")
        .classed("clickable", !!onClick);
    rows.append("i")
        .attr("class", "swatch")
        .style("background", (d) => colorFn(d));
    rows.append("span").text((d) => (JURIS_NAME[d] ? JURIS_NAME[d] : d));
    if (onClick) rows.on("click", (e, d) => onClick(d, rows));
    return rows;
}

/* ---------- count-up animated number ---------- */
function animateNumber(sel, value, formatter = fmtInt) {
    const node = d3.select(sel);
    if (!node.node()) return;
    const start = +node.attr("data-val") || 0;
    node.attr("data-val", value)
        .transition()
        .duration(900)
        .tween("t", function () {
            const i = d3.interpolateNumber(start, value);
            return (t) => {
                this.textContent = formatter(i(t));
            };
        });
}

/* ---------- reveal-on-scroll ---------- */
function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
        els.forEach((e) => e.classList.add("visible"));
        return;
    }
    const io = new IntersectionObserver(
        (entries) =>
            entries.forEach((en) => {
                if (en.isIntersecting) {
                    en.target.classList.add("visible");
                    io.unobserve(en.target);
                }
            }),
        { threshold: 0.12 }
    );
    els.forEach((e) => io.observe(e));
}

/* ---------- scroll progress bar ---------- */
function initProgress() {
    const bar = document.getElementById("scroll-progress");
    if (!bar) return;
    window.addEventListener(
        "scroll",
        () => {
            const h = document.documentElement;
            const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
            bar.style.width = p * 100 + "%";
        },
        { passive: true }
    );
}

/* ---------- dark / light theme ---------- */
function initTheme() {
    const btn = document.getElementById("theme-toggle");
    const saved = localStorage.getItem("dv-theme");
    if (saved === "dark") document.body.classList.add("dark");
    if (!btn) return;
    const sync = () =>
        (btn.textContent = document.body.classList.contains("dark") ? "☀︎ Light" : "☾ Dark");
    sync();
    btn.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        localStorage.setItem(
            "dv-theme",
            document.body.classList.contains("dark") ? "dark" : "light"
        );
        sync();
        window.dispatchEvent(new Event("themechange"));
    });
}

/* ---------- CSV download of any array of objects ---------- */
function downloadCsv(filename, rows) {
    if (!rows || !rows.length) return;
    const csv = d3.csvFormat(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

/* ---------- save any inline svg as .svg file ---------- */
function downloadSvg(selector, filename) {
    const node = document.querySelector(selector + " svg");
    if (!node) return;
    const clone = node.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const src = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([src], { type: "image/svg+xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initProgress();
    initTheme();
    /* mobile nav */
    const burger = document.getElementById("nav-toggle");
    if (burger)
        burger.addEventListener("click", () =>
            document.getElementById("nav-links").classList.toggle("open")
        );
});
