/* ===========================================================
   data.js — shared data layer, Game Industry dashboard
   =========================================================== */

const PLATFORMS = ["DS", "Wii", "PSP", "X360", "PS3"];

const PLATFORM_NAME = {
    DS: "Nintendo DS",
    Wii: "Nintendo Wii",
    PSP: "Sony PSP",
    X360: "Xbox 360",
    PS3: "PlayStation 3",
};

const PLATFORM_MAKER = { DS: "Nintendo", Wii: "Nintendo", PSP: "Sony", X360: "Microsoft", PS3: "Sony" };

/* brand-ish but colour-blind distinguishable */
const PLATFORM_COLOR = d3
    .scaleOrdinal()
    .domain(PLATFORMS)
    .range(["#E8544A", "#00B3E6", "#F0A020", "#5CB85C", "#8E7CE8"]);

const GENRE_COLOR = d3
    .scaleOrdinal()
    .range([
        "#4F79A7", "#F28E2B", "#59A14F", "#E15759", "#B07AA1",
        "#76B7B2", "#FF9DA7", "#9C755F", "#EDC948", "#BAB0AC",
    ])
    .unknown("#8c8c8c");

const fmtInt = d3.format(",d");
const fmtM = (n) => d3.format(".2f")(n) + "M";
const fmtCompact = (n) =>
    n >= 1e9 ? d3.format(".1f")(n / 1e9) + "B"
    : n >= 1e6 ? d3.format(".1f")(n / 1e6) + "M"
    : n >= 1e3 ? d3.format(".0f")(n / 1e3) + "k"
    : d3.format(",d")(n);
const fmtPct = d3.format(".1%");

const DATA = (function () {
    let promise = null;

    function fileGuard() {
        if (location.protocol !== "file:") return false;
        const bar = document.createElement("div");
        bar.style.cssText =
            "position:fixed;inset:0;z-index:99999;background:rgba(8,10,18,.97);color:#fff;" +
            "display:flex;align-items:center;justify-content:center;padding:2rem;" +
            "font-family:Inter,Segoe UI,system-ui,sans-serif;line-height:1.7";
        bar.innerHTML =
            '<div style="max-width:640px">' +
            '<div style="font-size:.78rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#ff8a6b">Cannot load data</div>' +
            '<h2 style="font-size:1.8rem;margin:.5rem 0 1rem">This page must be served over HTTP</h2>' +
            '<p style="color:#9aa9c0;margin:0 0 1rem">You opened the file directly from disk (<code>file://</code>). Browsers block <code>d3.csv()</code> from reading local files, so every chart stays empty.</p>' +
            '<p style="color:#9aa9c0;margin:0 0 .6rem"><b style="color:#fff">Fix — double-click <code>START HERE.bat</code></b>, or run:</p>' +
            '<pre style="background:#161e2d;border:1px solid #2a3648;padding:.9rem 1rem;border-radius:10px;color:#cfe3ff;font-size:.86rem">cd "Allen GameDV"\npython -m http.server 8000</pre>' +
            '<p style="color:#9aa9c0;margin:.8rem 0 0">Then open <b style="color:#7fd4ff">http://localhost:8000</b></p></div>';
        const add = () => document.body && document.body.appendChild(bar);
        document.addEventListener("DOMContentLoaded", add);
        add();
        return true;
    }

    function load() {
        if (promise) return promise;
        if (fileGuard()) {
            promise = new Promise(() => {});
            return promise;
        }

        promise = Promise.all([
            d3.csv("assets/platform_year.csv", d3.autoType),
            d3.csv("assets/genre_year_platform.csv", d3.autoType),
            d3.csv("assets/games.csv", d3.autoType),
            d3.csv("assets/publisher_year.csv", d3.autoType),
            d3.csv("assets/steam_games.csv", d3.autoType),
            d3.csv("assets/steam_publishers.csv", d3.autoType),
            d3.csv("assets/steam_price_buckets.csv", d3.autoType),
        ]).then(([plat, genre, games, pubs, steam, steamPubs, buckets]) => {
            const years = [...new Set(plat.map((d) => d.year))].sort(d3.ascending);

            /* cumulative sales per platform per year — this is what makes the race move */
            const cum = new Map();
            PLATFORMS.forEach((p) => {
                let run = 0;
                years.forEach((y) => {
                    const hit = plat.find((d) => d.platform === p && d.year === y);
                    run += hit ? hit.sales_m : 0;
                    cum.set(p + "|" + y, run);
                });
            });

            const platIdx = new Map(plat.map((d) => [d.platform + "|" + d.year, d]));
            const genres = [...new Set(genre.map((d) => d.genre))].sort();
            GENRE_COLOR.domain(genres);

            return {
                plat, genre, games, pubs, steam, steamPubs, buckets,
                years, genres, platIdx, cum,
                salesAt: (p, y) => (platIdx.get(p + "|" + y) || {}).sales_m || 0,
                cumAt: (p, y) => cum.get(p + "|" + y) || 0,
                genreFor: (y, plats) =>
                    genre.filter((d) => d.year === y && plats.includes(d.platform)),
                gamesFor: (plats, y) =>
                    games.filter((d) => plats.includes(d.platform) && (!y || d.year === y)),
                totalAt: (y) => d3.sum(PLATFORMS, (p) => cum.get(p + "|" + y) || 0),
            };
        });
        return promise;
    }

    return { load };
})();
