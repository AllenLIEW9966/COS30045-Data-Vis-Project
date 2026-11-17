/* Native HTML adaptation of Bklit's AreaChartLoading visual. */
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const selector =
    "#trend-grid > svg,#trend-grid .chart-loading-stage > svg,#age-chart,#users-chart,#remote-chart,#fn-chart,#annual-bars,#state-ranking,#comparison-chart";
  const timers = new WeakMap();
  function prepare(svg) {
    if (svg.parentElement.classList.contains("chart-loading-stage")) return svg.parentElement;
    const stage = document.createElement("div");
    stage.className = "chart-loading-stage";
    svg.before(stage);
    stage.append(svg);
    const overlay = document.createElement("div");
    overlay.className = "chart-loading-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="loading-grid"></div><svg class="loading-pulse-svg" viewBox="0 0 600 160" preserveAspectRatio="none"><path class="loading-track" d="M0 122 C45 122 53 112 88 113 S137 149 173 102 S223 19 265 62 S322 132 362 72 S416 38 455 58 S536 25 600 34"/><path class="loading-pulse" pathLength="100" d="M0 122 C45 122 53 112 88 113 S137 149 173 102 S223 19 265 62 S322 132 362 72 S416 38 455 58 S536 25 600 34"/></svg><span class="loading-label">Loading</span>';
    stage.append(overlay);
    return stage;
  }
  function show(svg) {
    const stage = prepare(svg);
    clearTimeout(timers.get(stage));
    stage.classList.add("is-chart-loading");
    stage.setAttribute("aria-busy", "true");
    timers.set(
      stage,
      setTimeout(
        () => {
          stage.classList.remove("is-chart-loading");
          stage.setAttribute("aria-busy", "false");
          svg.dispatchEvent(new Event("chart:ready"));
        },
        reduced.matches ? 0 : 650,
      ),
    );
  }
  document.querySelectorAll(selector).forEach(show);
  document.addEventListener("click", (event) => {
    if (event.target.closest(".combined-legend button"))
      document
        .querySelectorAll("#trend-grid > svg,#trend-grid .chart-loading-stage > svg")
        .forEach(show);
  });
  // State buttons are replaced during rendering, so use the completed-render event.
  document.addEventListener("explorer:change", () =>
    document.querySelectorAll("#annual-bars,#state-ranking,#comparison-chart").forEach(show),
  );
  document.addEventListener("explorer:comparison-change", () =>
    document.querySelectorAll("#comparison-chart").forEach(show),
  );
  // Trend rendering replaces its SVG on resize. Restore its shell without replaying loading.
  let resizeTimer;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => document.querySelectorAll(selector).forEach(prepare), 200);
  });
  reduced.addEventListener("change", (e) => {
    if (e.matches)
      document.querySelectorAll(".chart-loading-stage").forEach((stage) => {
        clearTimeout(timers.get(stage));
        stage.classList.remove("is-chart-loading");
        stage.setAttribute("aria-busy", "false");
      });
  });
})();
