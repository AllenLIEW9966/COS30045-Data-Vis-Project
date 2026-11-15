/* Chart motion begins when the loading layer releases each chart. */
(() => {
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const active=new Map();
 const supported=new Set(['age-chart','users-chart','remote-chart','fn-chart','annual-bars','state-ranking','comparison-chart']);
 function cancel(svg){active.get(svg)?.();active.delete(svg);}
 function animateChart(svg){
  cancel(svg);if(preference.matches)return;
  const restorers=[],updates=[];let frame=0,observer=null;
  const attr=(node,name,from,to,delay=0)=>{
   const original=node.getAttribute(name);restorers.push(()=>original===null?node.removeAttribute(name):node.setAttribute(name,original));
   node.setAttribute(name,from);
   updates.push(t=>{const progress=Math.max(0,Math.min(1,(t-delay)/(1-delay)));const eased=1-Math.pow(1-progress,3);node.setAttribute(name,from+(to-from)*eased);});
  };
  const finish=()=>{cancelAnimationFrame(frame);observer?.disconnect();restorers.forEach(fn=>fn());active.delete(svg);};
  active.set(svg,finish);
  if(['age-chart','users-chart','annual-bars','state-ranking'].includes(svg.id)){
   const bars=[...svg.querySelectorAll('rect')];
   bars.forEach((bar,i)=>{
    const delay=Math.min(.22,i*.018),width=+bar.getAttribute('width'),height=+bar.getAttribute('height'),x=+bar.getAttribute('x'),y=+bar.getAttribute('y');
    if(svg.id==='annual-bars'){attr(bar,'height',0,height,delay);attr(bar,'y',y+height,y,delay);}
    else {attr(bar,'width',0,width,delay);}
   });
  }else if(svg.id==='remote-chart'){
   const bounds=svg.viewBox.baseVal,cx=bounds.width/2,cy=bounds.height/2;
   svg.querySelectorAll('path').forEach((path,i)=>{
    attr(path,'opacity',0,1,i*.12);
    const original=path.getAttribute('transform');
    restorers.push(()=>original===null?path.removeAttribute('transform'):path.setAttribute('transform',original));
    const grow=t=>{const u=Math.max(0,Math.min(1,(t-i*.12)/(1-i*.12))),scale=.8+.2*(1-Math.pow(1-u,3));path.setAttribute('transform',original?`${original} scale(${scale})`:`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`);};
    grow(0);updates.push(grow);
   });
   // Draw each arc's outline briefly as its segment arrives.
   svg.querySelectorAll('path').forEach((path,i)=>{const len=path.getTotalLength();attr(path,'stroke-dasharray',len,len);attr(path,'stroke-dashoffset',len,0,i*.12);});
  }else if(svg.id==='fn-chart'){
   svg.querySelectorAll('line:not(.gridline)').forEach(line=>attr(line,'x2',+line.getAttribute('x1'),+line.getAttribute('x2')));
   svg.querySelectorAll('circle').forEach((dot,i)=>attr(dot,'r',0,+dot.getAttribute('r'),Math.min(.3,i*.035)));
  }else if(svg.id==='comparison-chart'){
   svg.querySelectorAll('path').forEach(line=>{const len=line.getTotalLength();attr(line,'stroke-dasharray',len,len);attr(line,'stroke-dashoffset',len,0);});
   svg.querySelectorAll('circle').forEach((dot,i)=>attr(dot,'r',0,+dot.getAttribute('r'),(i%10)*.055));
  }
  function start(){const began=performance.now();function tick(now){if(!svg.isConnected){finish();return;}const t=Math.min(1,(now-began)/1100);updates.forEach(fn=>fn(t));if(t<1)frame=requestAnimationFrame(tick);else finish();}frame=requestAnimationFrame(tick);}
  if('IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();start();}},{threshold:.15});observer.observe(svg);}else start();
 }
 document.addEventListener('chart:ready',event=>{if(supported.has(event.target.id))animateChart(event.target);},true);
 // Restore original geometry before any synchronous redraw replaces marks.
 window.addEventListener('resize',()=>[...active.keys()].forEach(cancel));
 document.addEventListener('click',e=>{if(e.target.closest('#state-picker button,[data-sort]'))[...active.keys()].forEach(cancel);},true);
 document.addEventListener('change',e=>{if(e.target.id==='compare-state')cancel(document.getElementById('comparison-chart'));},true);
 document.addEventListener('explorer:change',()=>[...active.keys()].forEach(cancel));
 preference.addEventListener('change',e=>{if(e.matches)[...active.keys()].forEach(cancel);});
})();
