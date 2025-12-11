/* main.js — lightweight interactions (mobile nav, filters, modal, particles)
   Respect prefers-reduced-motion and aim for small footprint.
*/

(() => {
  // ---- helpers ----
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---- mobile nav toggle ----
  const navToggle = $('#navToggle');
  const primaryNav = $('#primaryNav');
  if(navToggle && primaryNav){
    navToggle.addEventListener('click', () => {
      const open = primaryNav.style.display === 'flex';
      primaryNav.style.display = open ? 'none' : 'flex';
      primaryNav.style.flexDirection = 'column';
      primaryNav.style.gap = '8px';
      primaryNav.setAttribute('aria-hidden', open ? 'true' : 'false');
      navToggle.setAttribute('aria-expanded', String(!open));
    });
  }

  // ---- fade-up reveal for .section and .project-card ----
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!prefersReduced){
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if(e.isIntersecting){
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, {threshold: 0.12});
    $$('.section, .project-card, .hero').forEach(el => {
      el.classList.add('reveal');
      io.observe(el);
    });
  } else {
    // if reduced motion, simply mark visible
    $$('.section, .project-card, .hero').forEach(el => el.classList.add('in'));
  }

  // ---- project filters & search ----
  const filterBtns = $$('.filter-btn');
  const projectsGrid = $('#projectsGrid');
  const projects = $$('.project-card');
  const searchInput = $('#projectSearch');

  function applyFilter(tag, query=''){
    const q = query.trim().toLowerCase();
    projects.forEach(card => {
      const tags = (card.dataset.tags || '').toLowerCase();
      const text = (card.innerText || '').toLowerCase();
      const tagMatch = (tag === 'all') || tags.includes(tag);
      const queryMatch = q === '' || text.includes(q);
      if(tagMatch && queryMatch){
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
    // set aria-live summary (optional)
    primaryNav && primaryNav.setAttribute('aria-hidden', primaryNav.style.display === 'flex' ? 'false' : 'true');
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tag = btn.dataset.filter;
      applyFilter(tag, searchInput?.value || '');
    });
  });

  if(searchInput){
    searchInput.addEventListener('input', e => {
      const active = filterBtns.find(b => b.classList.contains('active')) || filterBtns[0];
      const tag = active?.dataset?.filter || 'all';
      applyFilter(tag, e.target.value);
    });
  }

  // ---- accessible modal for project details ----
  const modal = $('#projectModal');
  const modalTitle = $('#modalTitle');
  const modalDesc = $('#modalDesc');
  const modalOpenLink = $('#modalOpenLink');
  const modalClose = $('#modalClose');
  const modalShare = $('#modalShare');

  $$('.detail-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const title = btn.dataset.title || 'Project';
      const desc = btn.dataset.desc || '';
      modalTitle.textContent = title;
      modalDesc.textContent = desc;
      modalOpenLink.href = '#'; // leave blank; user can edit to actual resource
      modal.setAttribute('aria-hidden','false');
      modal.style.display = 'grid';
      setTimeout(()=> modal.classList.add('visible'), 20);
    });
  });

  const closeModal = () => {
    modal.setAttribute('aria-hidden','true');
    modal.style.display = 'none';
    modal.classList.remove('visible');
  };
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

  // copy modal text to clipboard
  if(modalShare){
    modalShare.addEventListener('click', async () => {
      const text = `${modalTitle.textContent}\n\n${modalDesc.textContent}`;
      try {
        await navigator.clipboard.writeText(text);
        modalShare.textContent = 'Copied!';
        setTimeout(()=> modalShare.textContent = 'Copy summary', 1400);
      } catch (err) {
        modalShare.textContent = 'Copy failed';
      }
    });
  }

  // ---- lightweight particle background (canvas) ----
  // small, optimized particle engine: dots and subtle lines
  (function particleSystem(){
    const canvas = document.getElementById('particle-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = innerWidth;
    let h = canvas.height = innerHeight;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * DPR; canvas.height = h * DPR; canvas.style.width = w+'px'; canvas.style.height = h+'px';
    ctx.scale(DPR, DPR);

    const particles = [];
    const NUM = Math.max(24, Math.floor((w * h) / 120000)); // adapt to screen size

    function rand(min,max){return Math.random()*(max-min)+min}

    for(let i=0;i<NUM;i++){
      particles.push({
        x: rand(0,w),
        y: rand(0,h),
        r: rand(0.6,2.4),
        vx: rand(-0.3,0.3),
        vy: rand(-0.15,0.15),
        hue: rand(320,345),
        alpha: rand(0.06,0.22)
      });
    }

    function update(){
      for(const p of particles){
        p.x += p.vx;
        p.y += p.vy;
        if(p.x < -10) p.x = w+10;
        if(p.x > w+10) p.x = -10;
        if(p.y < -10) p.y = h+10;
        if(p.y > h+10) p.y = -10;
      }
    }

    function draw(){
      ctx.clearRect(0,0,w,h);
      // subtle radial vignette
      const g = ctx.createRadialGradient(w*0.25,h*0.2,50,w,h,Math.max(w,h));
      g.addColorStop(0,'rgba(244,143,177,0.02)');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

      for(const p of particles){
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}deg 60% 60% / ${p.alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
      }

      // draw subtle lines between nearby particles
      for(let i=0;i<NUM;i++){
        for(let j=i+1;j<NUM;j++){
          const a = particles[i], b = particles[j];
          const dx = a.x-b.x, dy = a.y-b.y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if(d < 110){
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${a.hue}deg 60% 60% / ${0.02 + (0.12*(1 - d/110))})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
          }
        }
      }
    }

    let raf;
    function loop(){
      update(); draw(); raf = requestAnimationFrame(loop);
    }
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) loop();

    window.addEventListener('resize', () => {
      w = canvas.width = innerWidth;
      h = canvas.height = innerHeight;
      canvas.width = w * DPR; canvas.height = h * DPR;
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
      ctx.scale(DPR, DPR);
    });
  })();

  // ---- tiny UX niceties ----
  // smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if(href.length > 1){
        e.preventDefault();
        document.querySelector(href)?.scrollIntoView({behavior:'smooth', block:'start'});
        history.replaceState(null,'',href);
      }
    });
  });

})();
