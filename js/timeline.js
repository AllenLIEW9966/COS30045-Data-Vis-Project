/* ===========================================================
   timeline.js — one shared year clock that charts subscribe to.
   Gives trend / heatmap / scatter their own play controls that
   all read the same continuous year position.
   =========================================================== */

const Timeline = (function () {
    let Y0 = 2004, Y1 = 2008;
    let t = 2008;            // continuous year position
    let playing = false;
    let raf = null, last = 0;
    let speed = 1;
    const subs = [];

    function setRange(a, b) { Y0 = a; Y1 = b; t = b; }
    function on(fn) { subs.push(fn); return fn; }
    function year() { return t; }
    function isPlaying() { return playing; }
    function atEnd() { return t >= Y1 - 0.001; }

    function emit() { subs.forEach((f) => f(t, playing)); syncUI(); }

    function set(v, fromUser) {
        t = Math.max(Y0, Math.min(Y1, v));
        if (fromUser) stop();
        emit();
    }

    function tick(now) {
        if (!playing) return;
        const dt = last ? (now - last) / 1000 : 0;
        last = now;
        t += dt * 0.85 * speed;
        if (t >= Y1) { t = Y1; emit(); stop(); return; }
        emit();
        raf = requestAnimationFrame(tick);
    }

    function play() {
        if (atEnd()) t = Y0;          // replay from the start
        playing = true; last = 0;
        raf = requestAnimationFrame(tick);
        emit();
    }
    function stop() {
        playing = false;
        cancelAnimationFrame(raf);
        syncUI();
    }
    function toggle() { playing ? stop() : play(); }
    function setSpeed(s) { speed = s; }

    /* keep every registered control strip in sync */
    function syncUI() {
        document.querySelectorAll("[data-tl-play]").forEach((b) => {
            b.textContent = playing ? "❚❚ Pause" : "▶ Play years";
            b.classList.toggle("active", playing);
        });
        document.querySelectorAll("[data-tl-slider]").forEach((s) => {
            if (document.activeElement !== s) s.value = t;
        });
        document.querySelectorAll("[data-tl-out]").forEach((o) => {
            o.textContent = Math.round(t);
        });
    }

    /* build a play + scrub strip inside a toolbar */
    function mount(sel) {
        const host = document.querySelector(sel);
        if (!host) return;
        const wrap = document.createElement("span");
        wrap.className = "tl-strip";
        wrap.innerHTML = `
      <button class="icon-btn" data-tl-play>▶ Play years</button>
      <input type="range" data-tl-slider min="${Y0}" max="${Y1}" step="0.01" value="${t}" />
      <span class="year-out" data-tl-out>${Math.round(t)}</span>
      <button class="icon-btn" data-tl-reset title="Show all years">⟳ All</button>`;
        host.appendChild(wrap);

        wrap.querySelector("[data-tl-play]").addEventListener("click", toggle);
        wrap.querySelector("[data-tl-slider]").addEventListener("input", function () {
            set(+this.value, true);
        });
        wrap.querySelector("[data-tl-reset]").addEventListener("click", () => {
            stop(); set(Y1);
        });
    }

    return { setRange, on, year, isPlaying, play, stop, toggle, set, setSpeed, mount, syncUI,
             get Y0() { return Y0; }, get Y1() { return Y1; } };
})();
