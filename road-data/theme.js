(() => {
  const root = document.documentElement;
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "theme-toggle";
  toggle.innerHTML =
    '<span class="theme-toggle-icon" aria-hidden="true"></span><span class="theme-toggle-label"></span>';
  const nav = topbar.querySelector(".primary-nav");
  if (nav) nav.before(toggle);
  else topbar.append(toggle);

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let switching = false;

  function inkFrames(point) {
    const width = window.innerWidth,
      height = window.innerHeight;
    const farthest = Math.max(
      Math.hypot(point.x, point.y),
      Math.hypot(width - point.x, point.y),
      Math.hypot(point.x, height - point.y),
      Math.hypot(width - point.x, height - point.y),
    );
    const seed = Math.random() * Math.PI * 2;
    const frames = [];
    const steps = 42,
      vertices = 128;
    for (let step = 0; step <= steps; step++) {
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      const radius = farthest * 1.55 * eased;
      const points = [];
      for (let i = 0; i < vertices; i++) {
        const angle = (i / vertices) * Math.PI * 2;
        const drift = progress * 2.3;
        const lobes =
          Math.sin(angle * 7 + seed + drift) * 0.1 +
          Math.sin(angle * 13 - seed * 0.7 - drift * 0.6) * 0.065 +
          Math.sin(angle * 29 + seed * 1.3 + drift) * 0.025;
        const tendril = Math.pow(Math.max(0, Math.sin(angle * 17 + seed * 2 - drift)), 14) * 0.19;
        const reach = radius * (1 + lobes + tendril);
        points.push(
          `${(point.x + Math.cos(angle) * reach).toFixed(1)}px ${(point.y + Math.sin(angle) * reach).toFixed(1)}px`,
        );
      }
      frames.push({ clipPath: `polygon(${points.join(",")})`, offset: progress });
    }
    return frames;
  }

  function updateButton() {
    const dark = root.dataset.theme === "dark";
    toggle.querySelector(".theme-toggle-label").textContent = dark ? "Light mode" : "Dark mode";
    toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    toggle.setAttribute("aria-pressed", String(dark));
    toggle.title = dark ? "Switch to light mode" : "Switch to dark mode";
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem("road-data-theme", theme);
    } catch {}
    updateButton();
  }

  updateButton();
  toggle.addEventListener("click", async (event) => {
    if (switching) return;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    if (reduced.matches || !document.startViewTransition) {
      setTheme(next);
      return;
    }
    switching = true;
    toggle.disabled = true;
    root.classList.add("theme-switching");
    const bounds = toggle.getBoundingClientRect();
    const point =
      event.detail === 0
        ? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
        : { x: event.clientX, y: event.clientY };
    root.style.setProperty("--ink-x", `${point.x}px`);
    root.style.setProperty("--ink-y", `${point.y}px`);
    try {
      const transition = document.startViewTransition(() => setTheme(next));
      await transition.ready;
      try {
        const ink = root.animate(inkFrames(point), {
          duration: 1400,
          easing: "linear",
          fill: "both",
          pseudoElement: "::view-transition-new(root)",
        });
        root.classList.add("ink-native");
        await ink.finished;
      } catch {
        root.classList.remove("ink-native");
      }
      await transition.finished;
    } catch {
      setTheme(next);
    } finally {
      root.classList.remove("theme-switching");
      root.classList.remove("ink-native");
      root.style.removeProperty("--ink-x");
      root.style.removeProperty("--ink-y");
      toggle.disabled = false;
      switching = false;
    }
  });
})();
