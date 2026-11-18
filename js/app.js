(() => {
  const D = window.ROAD_SAFETY_DATA;
  const colors = {
    NSW: "#16826f",
    Vic: "#d96e4d",
    Qld: "#6681a5",
    WA: "#d2a13d",
    SA: "#8d79a4",
    Tas: "#4f9c92",
    NT: "#bf7e6a",
    ACT: "#70836c",
    Australia: "#17322d",
    Male: "#16826f",
    Female: "#d96e4d",
    "Vulnerable road users": "#16826f",
    "Car occupants": "#6681a5",
    "Other vehicle occupants": "#d2a13d",
    "Other or unknown": "#a6aea6",
    "Major Cities": "#16826f",
    Regional: "#d2a13d",
    Remote: "#d96e4d",
    "First Nations": "#16826f",
    "Non-Indigenous": "#d96e4d",
    "Unknown / excluded": "#a6aea6",
  };
  const jurisdictionNames = {
    NSW: "New South Wales",
    Vic: "Victoria",
    Qld: "Queensland",
    WA: "Western Australia",
    SA: "South Australia",
    Tas: "Tasmania",
    NT: "Northern Territory",
    ACT: "Australian Capital Territory",
    Australia: "Australia",
  };
  const fmt = (n) => Number(n).toLocaleString("en-AU");
  const pct = (n) => `${n.toFixed(1)}%`;
  const add = (parent, tag, attrs = {}, label = "") => {
    const mark = d3.select(parent).append(tag);
    Object.entries(attrs).forEach(([key, value]) => mark.attr(key, value));
    if (label !== "") mark.text(label);
    return mark.node();
  };
  const setSvg = (svg, width, height) => {
    d3.select(svg).selectAll("*").remove();
    d3.select(svg).attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "none");
  };
  const tip = document.getElementById("tooltip");
  function showTip(node, x, y, override) {
    if (node.tagName?.toLowerCase() === "circle" && node.closest("#fn-chart") && fnPairArea)
      hideFnPairTips();
    const message = override || node.getAttribute("data-tip");
    if (!message) return;
    tip.textContent = message;
    tip.setAttribute("aria-hidden", "false");
    tip.classList.add("visible");
    const rect = node.getBoundingClientRect();
    const px = Number.isFinite(x) ? x : rect.left + rect.width / 2;
    const py = Number.isFinite(y) ? y : rect.top;
    const left = Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, px + 12));
    const top = Math.max(8, py - 48);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }
  function hideTip() {
    tip.classList.remove("visible");
    tip.setAttribute("aria-hidden", "true");
  }
  function bindTips(root = document) {
    root.querySelectorAll("[data-tip]").forEach((node) => {
      node.addEventListener("pointerenter", (e) => showTip(node, e.clientX, e.clientY));
      node.addEventListener("pointermove", (e) => showTip(node, e.clientX, e.clientY));
      node.addEventListener("pointerleave", hideTip);
      node.addEventListener("focus", () => showTip(node));
      node.addEventListener("blur", hideTip);
    });
  }

  const activeStates = new Set(["NSW", "Vic", "Qld", "WA", "SA", "Tas", "NT", "ACT"]);
  function renderTrend() {
    const host = document.getElementById("trend-grid");
    host.innerHTML =
      '<div class="combined-legend"></div><svg role="img" aria-label="Combined annual hospitalisation lines by jurisdiction"></svg>';
    const legend = host.querySelector(".combined-legend");
    ["NSW", "Vic", "Qld", "WA", "SA", "Tas", "NT", "ACT", "Australia"].forEach((key) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = key;
      button.title = jurisdictionNames[key];
      button.setAttribute("aria-label", jurisdictionNames[key]);
      button.style.borderColor = colors[key];
      button.setAttribute("aria-pressed", activeStates.has(key));
      button.onclick = () => {
        activeStates.has(key) ? activeStates.delete(key) : activeStates.add(key);
        renderTrend();
        bindTips(host);
      };
      legend.appendChild(button);
    });
    const svg = host.querySelector("svg"),
      w = Math.max(300, host.clientWidth),
      h = 410;
    setSvg(svg, w, h);
    svg.style.width = "100%";
    svg.style.height = h + "px";
    const m = { l: 56, r: 22, t: 30, b: 46 },
      keys = [...activeStates];
    const max = Math.max(1000, ...D.years.flatMap((d) => keys.map((k) => d[k])));
    const ceiling = Math.ceil(max / 1000) * 1000;
    const x = d3
      .scaleLinear()
      .domain([0, D.years.length - 1])
      .range([m.l, w - m.r]);
    const y = d3
      .scaleLinear()
      .domain([0, ceiling])
      .range([h - m.b, m.t]);
    D.years.forEach((d, i) => {
      add(svg, "line", {
        x1: x(i),
        x2: x(i),
        y1: m.t,
        y2: h - m.b,
        class: "gridline gridline-vertical",
      });
    });
    for (let i = 0; i <= 4; i++) {
      const v = (ceiling * i) / 4;
      add(svg, "line", { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), class: "gridline" });
      add(
        svg,
        "text",
        { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", class: "axis-label" },
        fmt(v),
      );
    }
    D.years.forEach((d, i) => {
      if (w > 600 || i % 3 === 0 || i === 9)
        add(
          svg,
          "text",
          { x: x(i), y: h - 20, "text-anchor": "middle", class: "axis-label" },
          d.year,
        );
    });
    add(svg, "text", { x: m.l, y: 15, class: "axis-label" }, "Hospitalisations");
    const defs = add(svg, "defs", {});
    const clip = add(defs, "clipPath", {
      id: "trend-line-reveal",
      clipPathUnits: "userSpaceOnUse",
    });
    const curtain = add(clip, "rect", { x: m.l - 6, y: 0, width: w - m.l + 6, height: h });
    const series = add(svg, "g", { "clip-path": "url(#trend-line-reveal)" });
    keys.forEach((key) => {
      const line = d3
        .line()
        .x((d, i) => x(i))
        .y((d) => y(d[key]));
      add(series, "path", {
        d: line(D.years),
        fill: "none",
        stroke: colors[key],
        "stroke-width": 2.5,
        "stroke-dasharray": key === "Australia" ? "6 4" : "none",
        "pointer-events": "none",
      });
    });
    keys.forEach((key) =>
      D.years.forEach((d, i) => {
        const label = `${key} · ${d.year}: ${fmt(d[key])} hospitalisations`;
        add(series, "circle", {
          cx: x(i),
          cy: y(d[key]),
          r: 4,
          fill: colors[key],
          tabindex: "0",
          "aria-label": label,
          "data-tip": label,
        });
      }),
    );
    // Animate a shared horizontal reveal so every series reaches each year together.
    // The clip preserves the dashed Australia line and reveals its markers in sequence.
    svg.addEventListener(
      "chart:ready",
      () => {
        const preference = matchMedia("(prefers-reduced-motion: reduce)");
        const full = w - m.l + 6;
        if (preference.matches) return;
        curtain.setAttribute("width", "0");
        let frame = 0,
          observer;
        function finish() {
          cancelAnimationFrame(frame);
          curtain.setAttribute("width", full);
          observer?.disconnect();
          preference.removeEventListener("change", onPreference);
        }
        function onPreference(e) {
          if (e.matches) finish();
        }
        preference.addEventListener("change", onPreference);
        function start() {
          const began = performance.now();
          function step(now) {
            if (!svg.isConnected) {
              finish();
              return;
            }
            const t = Math.min(1, (now - began) / 1400);
            const eased = t * t * (3 - 2 * t);
            curtain.setAttribute("width", String(full * eased));
            if (t < 1) frame = requestAnimationFrame(step);
            else finish();
          }
          frame = requestAnimationFrame(step);
        }
        if ("IntersectionObserver" in window) {
          observer = new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting)) {
                observer.disconnect();
                start();
              }
            },
            { threshold: 0.15 },
          );
          observer.observe(svg);
        } else start();
      },
      { once: true },
    );
  }

  function renderAge() {
    const svg = document.getElementById("age-chart");
    const w = Math.max(300, Math.floor(svg.getBoundingClientRect().width || 900)),
      h = 366;
    setSvg(svg, w, h);
    const compact = w < 560,
      left = compact ? 49 : 85,
      right = compact ? 78 : 150,
      top = 32,
      bottom = 38;
    const maxV = 9000,
      x = d3
        .scaleLinear()
        .domain([0, maxV])
        .range([left, w - right]);
    [0, 3000, 6000, 9000].forEach((v) => {
      add(svg, "line", { x1: x(v), y1: top - 9, x2: x(v), y2: h - bottom + 2, class: "gridline" });
      add(
        svg,
        "text",
        {
          x: x(v),
          y: h - 12,
          "text-anchor": v === 0 ? "start" : v === 9000 ? "end" : "middle",
          class: "axis-label",
        },
        fmt(v),
      );
    });
    const rowH = (h - top - bottom) / D.ageSex.length;
    D.ageSex.forEach((d, i) => {
      const cy = top + rowH * i + rowH / 2;
      add(
        svg,
        "text",
        { x: left - 9, y: cy + 3, "text-anchor": "end", class: "axis-label" },
        d.age,
      );
      [
        ["Male", cy - 11],
        ["Female", cy + 3],
      ].forEach(([group, y]) => {
        add(svg, "rect", {
          x: left,
          y,
          width: x(d[group]) - left,
          height: 10,
          fill: colors[group],
          rx: 2,
          "data-tip": `${d.age} · ${group}: ${fmt(d[group])} hospitalisations`,
          tabindex: "0",
          "aria-label": `${d.age}, ${group}: ${fmt(d[group])} hospitalisations`,
        });
      });
      add(svg, "text", { x: w - right + 9, y: cy - 2, class: "value-label" }, fmt(d.Male));
      add(svg, "text", { x: w - right + 9, y: cy + 12, class: "value-label" }, fmt(d.Female));
    });
  }

  function renderUsers() {
    const rows = [...D.roadUsers].sort((a, b) => b.count - a.count);
    const total = D.roadUsers.reduce((sum, d) => sum + d.count, 0);
    const svg = document.getElementById("users-chart"),
      w = Math.max(290, Math.floor(svg.getBoundingClientRect().width || 850)),
      h = 530;
    setSvg(svg, w, h);
    const compact = w < 600,
      left = compact ? 112 : 222,
      right = compact ? 52 : 128,
      top = 29,
      bottom = 37,
      maxV = 14000;
    const x = d3
      .scaleLinear()
      .domain([0, maxV])
      .range([left, w - right]);
    [0, 5000, 10000].forEach((v) => {
      add(svg, "line", { x1: x(v), y1: top - 10, x2: x(v), y2: h - bottom + 4, class: "gridline" });
      add(
        svg,
        "text",
        { x: x(v), y: h - 12, "text-anchor": v === 0 ? "start" : "middle", class: "axis-label" },
        fmt(v),
      );
    });
    const rowH = (h - top - bottom) / rows.length;
    rows.forEach((d, i) => {
      const cy = top + rowH * i + rowH / 2;
      const label = compact
        ? d.role
            .replace("Heavy transport", "Heavy")
            .replace("Pick-up truck or van occupant", "Pick-up / van")
            .replace("Car unknown position", "Car unknown")
            .replace(" unknown position", " unknown")
        : d.role;
      add(
        svg,
        "text",
        { x: left - 9, y: cy + 4, "text-anchor": "end", "font-size": compact ? 9 : 11 },
        label,
      );
      add(svg, "rect", {
        x: left,
        y: cy - 9,
        width: x(d.count) - left,
        height: 18,
        fill: i < 5 ? "var(--road-user-top)" : "var(--road-user-rest)",
        rx: 3,
        "data-tip": `${d.role}: ${fmt(d.count)} hospitalisations (${pct((d.count / total) * 100)})`,
        tabindex: "0",
        "aria-label": `${d.role}: ${fmt(d.count)} hospitalisations, ${pct((d.count / total) * 100)}`,
      });
      add(
        svg,
        "text",
        { x: w - right + 9, y: cy + 4, class: "value-label" },
        compact ? fmt(d.count) : `${fmt(d.count)} · ${pct((d.count / total) * 100)}`,
      );
    });
  }

  let selectedRemoteArea = null;
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideTip();
      if (selectedRemoteArea) selectRemoteArea(selectedRemoteArea);
      if (selectedFnArea) selectFnArea(selectedFnArea);
    }
  });
  function selectRemoteArea(area) {
    selectedRemoteArea = selectedRemoteArea === area ? null : area;
    document.querySelectorAll("#remote-chart path[data-area]").forEach((path) => {
      const selected = path.dataset.area === selectedRemoteArea;
      path.classList.toggle("is-selected", selected);
      path.classList.toggle("is-dimmed", !!selectedRemoteArea && !selected);
      path.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll("#remote-legend button[data-area]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.area === selectedRemoteArea));
    });
  }
  function renderRemote() {
    const total = D.remoteness.reduce((s, d) => s + d.count, 0);
    const svg = document.getElementById("remote-chart"),
      w = Math.max(290, Math.floor(svg.getBoundingClientRect().width || 490)),
      h = 315;
    setSvg(svg, w, h);
    const cx = w / 2,
      cy = h / 2,
      r = Math.min(117, (h - 22) / 2, (w - 28) / 2),
      ri = r * 0.69;
    const pie = d3
      .pie()
      .sort(null)
      .value((d) => d.count)(D.remoteness);
    const arc = d3.arc().innerRadius(ri).outerRadius(r);
    pie.forEach((slice) => {
      const d = slice.data;
      const path = add(svg, "path", {
        d: arc(slice),
        transform: `translate(${cx} ${cy})`,
        fill: colors[d.area] || colors["Other or unknown"],
        stroke: "var(--white)",
        "stroke-width": 2,
        "data-area": d.area,
        "data-tip": `${d.area}: ${fmt(d.count)} hospitalisations (${pct((d.count / total) * 100)})`,
        tabindex: "0",
        role: "button",
        "aria-pressed": "false",
        "aria-label": `${d.area}: ${fmt(d.count)} hospitalisations, ${pct((d.count / total) * 100)}. Select for details.`,
      });
      path.addEventListener("click", () => {
        selectRemoteArea(d.area);
        showTip(path);
      });
      path.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectRemoteArea(d.area);
          showTip(path);
        }
      });
    });
    add(
      svg,
      "text",
      {
        x: cx,
        y: cy - 2,
        "text-anchor": "middle",
        fill: "var(--ink)",
        "font-family": "Manrope",
        "font-size": 26,
        "font-weight": 700,
      },
      fmt(total),
    );
    add(
      svg,
      "text",
      { x: cx, y: cy + 18, "text-anchor": "middle", class: "axis-label" },
      "TOTAL CASES",
    );
    const legend = document.getElementById("remote-legend");
    legend.replaceChildren();
    D.remoteness.forEach((d) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "remote-legend-item";
      item.dataset.area = d.area;
      item.setAttribute("aria-pressed", "false");
      item.innerHTML = `<i style="background:${colors[d.area] || colors["Other or unknown"]}"></i><span>${d.area}</span><strong>${fmt(d.count)}</strong><small>${pct((d.count / total) * 100)} of all cases</small>`;
      item.addEventListener("click", () => {
        selectRemoteArea(d.area);
        showTip(svg.querySelector(`path[data-area="${d.area}"]`));
      });
      item.addEventListener("pointerenter", () => {
        const path = svg.querySelector(`path[data-area="${d.area}"]`);
        path.classList.add("is-hovered");
        showTip(path);
      });
      item.addEventListener("pointerleave", () => {
        svg.querySelector(`path[data-area="${d.area}"]`)?.classList.remove("is-hovered");
        hideTip();
      });
      item.addEventListener("blur", hideTip);
      legend.appendChild(item);
    });
    if (selectedRemoteArea) {
      const area = selectedRemoteArea;
      selectedRemoteArea = null;
      selectRemoteArea(area);
    }
  }

  let selectedFnArea = null,
    fnPairArea = null;
  const fnPairTips = ["First Nations", "Non-Indigenous"].map((group) => {
    const node = document.createElement("div");
    node.className = "fn-point-tooltip";
    node.setAttribute("role", "tooltip");
    node.dataset.group = group;
    node.hidden = true;
    document.querySelector(".fn-frame").append(node);
    return node;
  });
  function hideFnPairTips() {
    fnPairArea = null;
    fnPairTips.forEach((tip) => (tip.hidden = true));
  }
  function showFnPairTips(area) {
    fnPairArea = area;
    const frame = document.querySelector(".fn-frame"),
      frameRect = frame.getBoundingClientRect();
    const dots = fnPairTips.map((tip) =>
      document.querySelector(
        `#fn-chart circle[data-area="${area}"][data-group="${tip.dataset.group}"]`,
      ),
    );
    fnPairTips.forEach((tip, i) => {
      const dot = dots[i],
        rect = dot.getBoundingClientRect();
      tip.textContent = dot.getAttribute("data-tip");
      tip.hidden = false;
      const center = rect.left + rect.width / 2 - frameRect.left;
      tip.style.left = `${Math.max(8, Math.min(frame.clientWidth - tip.offsetWidth - 8, center + 12))}px`;
      tip.style.top = `${rect.top + rect.height / 2 - frameRect.top + (i === 1 ? 16 : -tip.offsetHeight - 14)}px`;
    });
  }
  function selectFnArea(area) {
    hideFnPairTips();
    selectedFnArea = selectedFnArea === area ? null : area;
    document.querySelectorAll("#fn-chart [data-area]").forEach((mark) => {
      const selected = mark.dataset.area === selectedFnArea;
      mark.classList.toggle("is-selected", selected);
      mark.classList.toggle("is-dimmed", !!selectedFnArea && !selected);
      if (mark.tagName.toLowerCase() === "circle")
        mark.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll("#fn-table button[data-area]").forEach((button) => {
      const selected = button.dataset.area === selectedFnArea;
      button.setAttribute("aria-pressed", String(selected));
      button.closest("tr").classList.toggle("is-selected", selected);
    });
  }
  function renderFirstNations() {
    const areas = ["Major Cities", "Regional", "Remote", "Unknown / excluded"];
    const lookup = (area, group) =>
      D.firstNations.find((d) => d.area === area && d.group === group)?.count || 0;
    const svg = document.getElementById("fn-chart"),
      w = Math.max(300, Math.floor(svg.getBoundingClientRect().width || 850)),
      h = 310;
    setSvg(svg, w, h);
    const left = w < 480 ? 113 : 160,
      right = 18,
      top = 27,
      bottom = 42,
      plotW = w - left - right;
    const min = 10,
      max = 30000;
    const x = d3
      .scaleLog()
      .domain([min, max])
      .range([left, w - right])
      .clamp(true);
    const rows = areas.map((area) => ({
      area,
      fn: lookup(area, "First Nations"),
      non: lookup(area, "Non-Indigenous"),
    }));
    const rowH = (h - top - bottom) / rows.length;
    [10, 100, 1000, 10000, 30000].forEach((v) => {
      const xx = x(v);
      add(svg, "line", { x1: xx, y1: top - 6, x2: xx, y2: h - bottom + 2, class: "gridline" });
      add(
        svg,
        "text",
        {
          x: xx,
          y: h - 12,
          "text-anchor": v === 10 ? "start" : v === 30000 ? "end" : "middle",
          class: "axis-label",
        },
        v >= 1000 ? `${v / 1000}k` : fmt(v),
      );
    });
    rows.forEach((d, i) => {
      const cy = top + rowH * i + rowH / 2;
      add(
        svg,
        "text",
        { x: left - 10, y: cy + 4, "text-anchor": "end", "font-size": w < 480 ? 10 : 11 },
        d.area.replace(" / excluded", ""),
      );
      add(svg, "line", {
        x1: x(d.fn),
        y1: cy,
        x2: x(d.non),
        y2: cy,
        stroke: "#b8c4b8",
        "stroke-width": 2,
        "data-area": d.area,
      });
      [
        ["First Nations", d.fn, cy - 6],
        ["Non-Indigenous", d.non, cy + 6],
      ].forEach(([group, count, dotY]) => {
        const dot = add(svg, "circle", {
          cx: x(count),
          cy: dotY,
          r: 5,
          fill: colors[group],
          "data-area": d.area,
          "data-group": group,
          "data-tip": `${d.area} · ${group}: ${fmt(count)} hospitalisations`,
          tabindex: "0",
          role: "button",
          "aria-pressed": "false",
          "aria-label": `${d.area}, ${group}: ${fmt(count)} hospitalisations. Select for details.`,
        });
        dot.addEventListener("click", () => {
          selectFnArea(d.area);
          showTip(dot);
        });
        dot.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectFnArea(d.area);
            showTip(dot);
          }
        });
      });
    });
    const tbody = document.getElementById("fn-table");
    tbody.replaceChildren();
    rows.forEach((d) => {
      const tr = document.createElement("tr");
      const label =
        d.area === "Unknown / excluded" ? "Unknown / excluded from remoteness table" : d.area;
      tr.innerHTML = `<td><button type="button" data-area="${d.area}" aria-pressed="false">${label}</button></td><td><button type="button" data-area="${d.area}" data-group="First Nations" aria-pressed="false" aria-label="${d.area}, First Nations: ${fmt(d.fn)} hospitalisations">${fmt(d.fn)}</button></td><td><button type="button" data-area="${d.area}" data-group="Non-Indigenous" aria-pressed="false" aria-label="${d.area}, Non-Indigenous: ${fmt(d.non)} hospitalisations">${fmt(d.non)}</button></td>`;
      const matchingDot = (group) =>
        [...svg.querySelectorAll(`circle[data-area="${d.area}"]`)].find(
          (dot) => dot.dataset.group === group,
        );
      tr.addEventListener("click", () => {
        selectFnArea(d.area);
        hideTip();
        if (selectedFnArea) showFnPairTips(d.area);
      });
      tr.addEventListener("pointerenter", () => {
        svg.querySelectorAll("[data-area]").forEach((mark) => {
          if (mark.dataset.area === d.area) mark.classList.add("is-hovered");
        });
      });
      tr.querySelectorAll("button[data-group]").forEach((button) => {
        button.addEventListener("pointerenter", () => showTip(matchingDot(button.dataset.group)));
        button.addEventListener("pointerleave", hideTip);
        button.addEventListener("focus", () => showTip(matchingDot(button.dataset.group)));
      });
      tr.addEventListener("pointerleave", () => {
        svg.querySelectorAll(".is-hovered").forEach((mark) => mark.classList.remove("is-hovered"));
        hideTip();
      });
      tr.addEventListener("focusout", hideTip);
      tbody.appendChild(tr);
    });
    if (selectedFnArea) {
      const area = selectedFnArea,
        showPair = fnPairArea === area;
      selectedFnArea = null;
      selectFnArea(area);
      if (showPair) showFnPairTips(area);
    }
  }

  function renderSummary() {
    const first = D.years[0].Australia,
      last = D.years.at(-1).Australia;
    const change = (last / first - 1) * 100;
    document.getElementById("change-2012").textContent = `+${change.toFixed(1)}%`;
    const vru = D.roadUsers
      .filter((d) => d.group === "Vulnerable road users")
      .reduce((s, d) => s + d.count, 0);
    const total = D.roadUsers.reduce((s, d) => s + d.count, 0);
    document.getElementById("vru-share").textContent = pct((vru / total) * 100);
  }
  let resizeTimer;
  function renderAll() {
    renderSummary();
    renderTrend();
    renderAge();
    renderUsers();
    renderRemote();
    renderFirstNations();
    bindTips();
  }
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAll, 120);
  });
  window.addEventListener("scroll", hideTip, { passive: true });
  renderAll();
})();
