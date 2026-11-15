(() => {
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const nativeNavigation = 'onpageswap' in window && 'onpagereveal' in window;
 const active = new Set();
 const perElement = new WeakMap();
 let leaving = false;
 function animate(element, frames, options) {
  if (!element || reduced.matches) return;
  perElement.get(element)?.cancel();
  const animation = element.animate(frames, options);
  perElement.set(element, animation);
  active.add(animation);
  animation.finished.catch(() => {}).finally(() => active.delete(animation));
  return animation;
 }
 function enter() {
  leaving = false;
  if (!nativeNavigation) animate(document.body, [{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}], {duration:380,easing:'cubic-bezier(.22,1,.36,1)'});
 }
 enter();
 // Keep the navigation out of the way while scrolling down, and reveal it
 // when the reader reverses direction to move back through the page.
 const nav = document.querySelector('.topbar');
 let lastY = window.scrollY;
 let ticking = false;
 function updateNavigation() {
  const y = window.scrollY;
  const delta = y - lastY;
  if (y < 80) {
   nav?.classList.add('nav-visible');
   nav?.classList.remove('nav-hidden');
  } else if (delta < -3) {
   nav?.classList.add('nav-visible');
   nav?.classList.remove('nav-hidden');
  } else if (delta > 3) {
   nav?.classList.add('nav-hidden');
   nav?.classList.remove('nav-visible');
  }
  lastY = y;
  ticking = false;
 }
 addEventListener('scroll', () => {
  if (!ticking) { requestAnimationFrame(updateNavigation); ticking = true; }
 }, {passive:true});
 updateNavigation();
 addEventListener('pageshow', event => { if (event.persisted) enter(); });
 document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
  const destination = new URL(link.href, location.href);
  if (destination.origin !== location.origin || !['http:','https:','file:'].includes(destination.protocol)) return;
  const samePage = destination.pathname === location.pathname && destination.search === location.search;
  if (samePage) {
   if (destination.hash) {
    let target;
    try { target = document.getElementById(decodeURIComponent(destination.hash.slice(1))); } catch { return; }
    // Leave anchor navigation and browser history intact.
    animate(target?.querySelector('h2') || target, [{opacity:.45,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}], {duration:600,easing:'ease-out'});
   }
   return;
  }
  if (nativeNavigation || reduced.matches) return;
  event.preventDefault();
  if (leaving) return;
  leaving = true;
  const exit = animate(document.body, [{opacity:1},{opacity:0}], {duration:160,easing:'ease-out'});
  (exit?.finished || Promise.resolve()).catch(() => {}).then(() => location.assign(destination.href));
 });
 document.addEventListener('explorer:change', () => {
  document.querySelectorAll('#state-title,#state-story,#state-stats article,#compare-title,#compare-summary,#annual-table tr').forEach((element, index) => {
   animate(element, [{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}], {duration:380,delay:Math.min(index*25,180),easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
  });
 });
 reduced.addEventListener('change', () => { if (reduced.matches) active.forEach(animation => animation.cancel()); });
})();
