(() => {
    const rows = window.ROAD_SAFETY_DATA.years;
    const get = id => document.getElementById(id);
    const range = get("year-range"), play = get("year-play");
    const states = Object.keys(rows[0]).filter(key => !["year","Australia"].includes(key));
    const maximum = Math.max(...rows.flatMap(row => states.map(key => row[key])));
    const format = value => value.toLocaleString("en-AU");
    let timer;
    range.max = rows.length - 1;
    function render() {
        const row = rows[Number(range.value)];
        const ranked = [...states].sort((a,b) => row[b] - row[a]);
        range.setAttribute("aria-valuetext", row.year);
        get("rank-year").textContent = row.year;
        get("rank-total").textContent = format(row.Australia);
        get("rank-first").textContent = ranked[0];
        get("rank-bars").replaceChildren(...ranked.map(key => {
            const link = document.createElement("a"), bar = document.createElement("i");
            const count = document.createElement("strong");
            link.href = "platform.html?state=" + encodeURIComponent(key);
            link.setAttribute("aria-label", key + ", " + format(row[key]) + " hospitalisations in " + row.year + ". Open State Explorer.");
            bar.style.width = (100 * row[key] / maximum) + "%";
            count.textContent = format(row[key]);
            link.append(key, bar, count);
            return link;
        }));
    }
    function stop() { clearInterval(timer); timer = null; play.textContent = "▶ Play"; }
    function start() {
        stop();
        if (+range.value === rows.length - 1) range.value = 0;
        render();
        play.textContent = "Pause";
        timer = setInterval(() => {
            range.value = +range.value + 1;
            render();
            if (+range.value === rows.length - 1) stop();
        }, 1000);
    }
    play.onclick = () => timer ? stop() : start();
    get("year-replay").onclick = () => { range.value = 0; start(); };
    range.oninput = () => { stop(); render(); };
    render();
})();
