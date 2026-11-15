(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const progress=document.createElement('div');progress.className='scroll-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);
 let scheduled=false;
 function update(){const max=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${max>0?scrollY/max:0})`;scheduled=false;}
 addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true});update();
 if(!reduced.matches&&'IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('motion-visible');observer.unobserve(e.target);}}),{threshold:.06});document.querySelectorAll('.question-section,.explorer-grid,.comparison,.overview-strip,.explorer-stats,.method-footer').forEach(el=>{el.classList.add('motion-ready');observer.observe(el);});reduced.addEventListener('change',e=>{if(e.matches){document.querySelectorAll('.motion-ready').forEach(el=>el.classList.add('motion-visible'));observer.disconnect();}});}
 if(matchMedia('(pointer:fine)').matches){document.querySelectorAll('.chart-frame,#trend-grid').forEach(el=>el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.setProperty('--pointer-x',`${e.clientX-r.left}px`);el.style.setProperty('--pointer-y',`${e.clientY-r.top}px`);}));}
 const links=[...document.querySelectorAll('.question-nav a[href^="#"]')];
 if('IntersectionObserver' in window){const sections=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)links.forEach(a=>{const current=a.hash===`#${e.target.id}`;a.classList.toggle('is-current',current);if(current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}),{rootMargin:'-15% 0px -65% 0px'});document.querySelectorAll('.question-section').forEach(s=>sections.observe(s));}
 // A shared vertical guide helps trace values across the combined chart.
 const host=document.getElementById('trend-grid');
 if(host){host.addEventListener('pointermove',e=>{const svg=host.querySelector('svg');if(!svg)return;const r=svg.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;if(x<56||x>r.width-22||y<30||y>364)return;let guide=svg.querySelector('.chart-focus');if(!guide){guide=document.createElementNS('http://www.w3.org/2000/svg','line');guide.setAttribute('class','chart-focus');svg.append(guide);}guide.setAttribute('x1',x);guide.setAttribute('x2',x);guide.setAttribute('y1',30);guide.setAttribute('y2',364);});host.addEventListener('pointerleave',()=>host.querySelector('.chart-focus')?.remove());}
})();
