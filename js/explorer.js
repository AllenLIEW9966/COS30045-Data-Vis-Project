(() => {
  const rows = window.ROAD_SAFETY_DATA.years,
    keys = ["NSW", "Vic", "Qld", "SA", "WA", "Tas", "NT", "ACT"];
  const names = {
    NSW: "New South Wales",
    Vic: "Victoria",
    Qld: "Queensland",
    SA: "South Australia",
    WA: "Western Australia",
    Tas: "Tasmania",
    NT: "Northern Territory",
    ACT: "Australian Capital Territory",
  };
  let state = new URLSearchParams(location.search).get("state");
  if (!keys.includes(state)) state = "Vic";
  let rival = state === "NSW" ? "Vic" : "NSW",
    sort = "year",
    direction = 1;
  const f = (n) => n.toLocaleString("en-AU"),
    p = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%",
    el = (id) => document.getElementById(id);
  function node(svg, tag, attrs, text) {
    const mark = d3.select(svg).append(tag);
    Object.entries(attrs).forEach(([k, v]) => mark.attr(k, v));
    if (text !== undefined) mark.text(text);
    return mark.node();
  }
  // Round the scale up to readable integer intervals without clipping any values.
  function axisStep(max) {
    const raw = max / 4,
      power = 10 ** Math.floor(Math.log10(Math.max(1, raw)));
    return Math.max(1, Math.ceil(raw / power) * power);
  }
  const tip = document.createElement("div");
  tip.className = "explorer-tooltip";
  tip.id = "explorer-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.append(tip);
  function hideTip() {
    tip.hidden = true;
  }
  function barTooltip(mark, label) {
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-label", label);
    function show(event) {
      tip.textContent = label;
      tip.hidden = false;
      const box = mark.getBoundingClientRect(),
        x = event?.clientX ?? box.left + box.width / 2,
        y = event?.clientY ?? box.top;
      const bounds = tip.getBoundingClientRect();
      tip.style.left = Math.max(8, Math.min(x + 14, innerWidth - bounds.width - 8)) + "px";
      tip.style.top =
        Math.max(8, Math.min(y - bounds.height - 14, innerHeight - bounds.height - 8)) + "px";
    }
    mark.addEventListener("pointerenter", show);
    mark.addEventListener("pointermove", show);
    mark.addEventListener("pointerleave", hideTip);
    mark.addEventListener("focus", () => show());
    mark.addEventListener("blur", hideTip);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideTip();
  });
  window.addEventListener("scroll", hideTip, { passive: true });
  function setup(id, max) {
    max = axisStep(max) * 4;
    const svg = el(id),
      w = Math.max(280, svg.clientWidth),
      h = 330;
    d3.select(svg).selectAll("*").remove();
    d3.select(svg).attr("viewBox", `0 0 ${w} ${h}`);
    const inset = id === "annual-bars" ? 20 : 0;
    const x = d3
        .scaleLinear()
        .domain([0, rows.length - 1])
        .range([52 + inset, w - 23 - inset]),
      y = d3.scaleLinear().domain([0, max]).range([285, 45]);
    for (let i = 0; i <= 4; i++) {
      const v = (max * i) / 4;
      node(svg, "line", { x1: 52, x2: w - 20, y1: y(v), y2: y(v), class: "gridline" });
      node(
        svg,
        "text",
        { x: 45, y: y(v) + 4, "text-anchor": "end", class: "axis-label" },
        f(Math.round(v)),
      );
    }
    rows.forEach((d, i) => {
      node(svg, "line", {
        x1: x(i),
        x2: x(i),
        y1: 45,
        y2: 285,
        class: "gridline gridline-vertical",
      });
      if (w > 500 || i % 3 === 0)
        node(
          svg,
          "text",
          { x: x(i), y: 310, "text-anchor": "middle", class: "axis-label" },
          d.year,
        );
    });
    return { svg, w, x, y };
  }
  function renderComparison() {
    el("compare-title").textContent = `${names[state]} vs ${names[rival]}`;
    const chart = setup(
      "comparison-chart",
      Math.max(...rows.flatMap((d) => [d[state], d[rival]])) * 1.12,
    );
    [state, rival].forEach((k, j) => {
      const color = j ? "#d96e4d" : "#32c9b4",
        line = d3
          .line()
          .x((d, i) => chart.x(i))
          .y((d) => chart.y(d[k]));
      node(chart.svg, "path", { d: line(rows), fill: "none", stroke: color, "stroke-width": 3 });
      rows.forEach((d, i) => {
        const n = node(chart.svg, "circle", {
          cx: chart.x(i),
          cy: chart.y(d[k]),
          r: 4,
          fill: color,
        });
        node(n, "title", {}, `${names[k]} · ${d.year}: ${f(d[k])}`);
      });
    });
    const last = rows.at(-1);
    el("compare-summary").textContent =
      `Teal: ${names[state]} (${f(last[state])} in 2021). Orange: ${names[rival]} (${f(last[rival])} in 2021). Count difference: ${f(Math.abs(last[state] - last[rival]))}.`;
  }
  function draw() {
    hideTip();
    const values = rows.map((d) => d[state]),
      first = values[0],
      last = values.at(-1),
      total = values.reduce((a, b) => a + b, 0),
      peak = Math.max(...values),
      peakYear = rows[values.indexOf(peak)].year;
    el("state-title").textContent = names[state];
    el("state-story").textContent =
      `${names[state]} recorded ${f(last)} hospitalisations in 2021, ${p((last / first - 1) * 100)} compared with 2012. The highest annual count in this period was ${f(peak)} in ${peakYear}.`;
    el("state-picker").innerHTML = keys
      .map(
        (k) =>
          `<button type="button" data-state="${k}" aria-pressed="${k === state}">${k}</button>`,
      )
      .join("");
    el("state-picker")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            if (state === b.dataset.state) return;
            state = b.dataset.state;
            if (state === rival) rival = keys.find((k) => k !== state);
            history.pushState(null, "", `?state=${state}`);
            draw();
            el("state-picker")
              .querySelector(`[data-state="${state}"]`)
              .focus({ preventScroll: true });
            document.dispatchEvent(new CustomEvent("explorer:change"));
          }),
      );
    el("state-stats").innerHTML = [
      ["Period total", f(total), "2012–2021 hospitalisations"],
      ["2021 count", f(last), "hospitalisations"],
      ["Change since 2012", p((last / first - 1) * 100), "change in counts"],
      ["Peak year", peakYear, f(peak) + " hospitalisations"],
    ]
      .map(
        ([label, value, note]) =>
          `<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`,
      )
      .join("");
    let chart = setup("annual-bars", peak * 1.12);
    values.forEach((v, i) => {
      const n = node(chart.svg, "rect", {
        x: chart.x(i) - 8,
        y: chart.y(v),
        width: 16,
        height: 285 - chart.y(v),
        fill: "#32c9b4",
        rx: 2,
      });
      barTooltip(n, `${rows[i].year} · ${names[state]}: ${f(v)} hospitalisations`);
    });
    const ranked = keys
        .map((k) => ({ key: k, value: rows.at(-1)[k] }))
        .sort((a, b) => b.value - a.value),
      svg = el("state-ranking"),
      w = Math.max(280, svg.clientWidth);
    d3.select(svg).selectAll("*").remove();
    d3.select(svg).attr("viewBox", `0 0 ${w} 330`);
    for (let i = 0; i <= 4; i++) {
      const xx = 40 + (i * (w - 130)) / 4;
      node(svg, "line", { x1: xx, x2: xx, y1: 20, y2: 303, class: "gridline gridline-vertical" });
    }
    ranked.forEach((d, i) => {
      const yy = 35.5 + i * 36;
      node(svg, "line", { x1: 40, x2: w - 90, y1: yy, y2: yy, class: "gridline" });
    });
    const rankWidth = d3
      .scaleLinear()
      .domain([0, ranked[0].value])
      .range([0, w - 130]);
    ranked.forEach((d, i) => {
      const yy = 25 + i * 36,
        bw = rankWidth(d.value);
      node(svg, "text", { x: 0, y: yy + 14, "font-size": 12 }, d.key);
      const b = node(svg, "rect", {
        x: 40,
        y: yy,
        width: bw,
        height: 21,
        fill: d.key === state ? "#32c9b4" : "#6681a5",
        rx: 3,
      });
      barTooltip(b, `${names[d.key]} · 2021: ${f(d.value)} hospitalisations`);
      node(svg, "text", { x: 47 + bw, y: yy + 15, "font-size": 11 }, f(d.value));
    });
    el("compare-state").innerHTML = keys
      .filter((k) => k !== state)
      .map((k) => `<option value="${k}" ${k === rival ? "selected" : ""}>${names[k]}</option>`)
      .join("");
    renderComparison();
    const data = rows.map((d, i) => ({
      year: d.year,
      count: d[state],
      change: i ? (d[state] / rows[i - 1][state] - 1) * 100 : null,
      share: (d[state] / d.Australia) * 100,
    }));
    data.sort((a, b) => direction * ((a[sort] ?? -Infinity) - (b[sort] ?? -Infinity)));
    el("annual-table").innerHTML = data
      .map(
        (d) =>
          `<tr><td>${d.year}</td><td>${f(d.count)}</td><td>${d.change === null ? "—" : p(d.change)}</td><td>${d.share.toFixed(1)}%</td></tr>`,
      )
      .join("");
  }
  el("compare-state").onchange = (e) => {
    rival = e.target.value;
    hideTip();
    renderComparison();
    document.dispatchEvent(new CustomEvent("explorer:comparison-change"));
  };
  document.querySelectorAll("[data-sort]").forEach(
    (b) =>
      (b.onclick = () => {
        direction = sort === b.dataset.sort ? -direction : 1;
        sort = b.dataset.sort;
        draw();
      }),
  );
  window.addEventListener("popstate", () => {
    const k = new URLSearchParams(location.search).get("state");
    state = keys.includes(k) ? k : "Vic";
    if (rival === state) rival = keys.find((x) => x !== state);
    draw();
    document.dispatchEvent(new CustomEvent("explorer:change"));
  });
  window.addEventListener("resize", draw);
  draw();
})();
