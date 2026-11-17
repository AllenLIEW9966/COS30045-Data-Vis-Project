(() => {
  if (!window.Motion) return;
  const preference = matchMedia("(prefers-reduced-motion: reduce)"),
    running = [];
  if (preference.matches) return;
  const { animate, stagger } = Motion;
  const targets = document.querySelectorAll(".overview-stat,.explorer-stats article");
  if (targets.length)
    running.push(
      animate(
        targets,
        { opacity: [0, 1], y: [12, 0] },
        { duration: 0.55, delay: stagger(0.07), ease: "easeOut" },
      ),
    );
  document.querySelectorAll(".scroll-cue,.state-picker").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      if (!preference.matches)
        running.push(
          animate(el, { scale: 1.015 }, { type: "spring", stiffness: 300, damping: 24 }),
        );
    });
    el.addEventListener("pointerleave", () => animate(el, { scale: 1 }, { duration: 0.2 }));
  });
  preference.addEventListener("change", (e) => {
    if (e.matches) running.forEach((a) => a.complete());
  });
})();
