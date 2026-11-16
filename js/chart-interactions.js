(() => {
  const host = document.getElementById("trend-grid");
  if (!host) return;
  const box = document.createElement("div");
  box.className = "series-tooltip";
  box.hidden = true;
  box.setAttribute("role", "status");
  host.append(box);
  const names = {
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
  function show(event) {
    const svg = host.querySelector("svg");
    if (!svg) return;
    const r = svg.getBoundingClientRect(),
      xx = event.clientX - r.left,
      yy = event.clientY - r.top;
    if (xx < 56 || xx > r.width - 22 || yy < 30 || yy > 364) {
      box.hidden = true;
      return;
    }
    const data = window.ROAD_SAFETY_DATA.years,
      index = Math.max(
        0,
        Math.min(data.length - 1, Math.round(((xx - 56) / (r.width - 78)) * (data.length - 1))),
      ),
      d = data[index];
    const selected = [...host.querySelectorAll("button[aria-pressed=true]")].map(
      (b) => b.textContent,
    );
    box.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = d.year;
    box.append(title);
    selected.forEach((k) => {
      const row = document.createElement("div"),
        label = document.createElement("span"),
        value = document.createElement("b");
      label.textContent = names[k] || k;
      value.textContent = d[k].toLocaleString("en-AU");
      row.append(label, value);
      box.append(row);
    });
    if (!box.isConnected) host.append(box);
    box.hidden = false;
    box.style.left = Math.max(8, Math.min(host.clientWidth - box.offsetWidth - 8, xx + 14)) + "px";
    box.style.top = "80px";
  }
  host.addEventListener("pointermove", show);
  host.addEventListener("pointerleave", () => (box.hidden = true));
  host.addEventListener("click", (e) => {
    if (e.target.closest("button")) box.hidden = true;
  });
})();
