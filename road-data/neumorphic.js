(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const mesh = document.createElement("div");
  mesh.className = "ambient-mesh";
  mesh.setAttribute("aria-hidden", "true");
  document.body.prepend(mesh);
  const nav = document.querySelector(".topbar");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "menu-toggle";
  toggle.textContent = "Menu";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "mobile-menu");
  nav.append(toggle);
  const menu = document.createElement("nav");
  menu.id = "mobile-menu";
  menu.className = "mobile-menu";
  menu.hidden = true;
  menu.setAttribute("aria-label", "Mobile navigation");
  nav.querySelectorAll(".primary-nav a").forEach((link) => menu.append(link.cloneNode(true)));
  document.body.append(menu);
  function close() {
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle.onclick = () => {
    const open = menu.hidden;
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open && !reduced.matches)
      menu.animate(
        [
          { opacity: 0, transform: "translateY(-8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 220, easing: "ease-out" },
      );
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      close();
      toggle.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== toggle) close();
  });
  menu.addEventListener("click", close);
  const heading = document.querySelector("h1");
  if (heading && !reduced.matches)
    heading.animate(
      [
        { opacity: 0, filter: "blur(8px)", transform: "translateY(12px)" },
        { opacity: 1, filter: "blur(0)", transform: "translateY(0)" },
      ],
      { duration: 700, easing: "cubic-bezier(.2,.7,.2,1)" },
    );
})();
