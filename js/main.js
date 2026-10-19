(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  document.documentElement.classList.add('js');

  // menu: degradê no topo, translúcido ao rolar
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // menu mobile
  const burger = $('#burger'), drawer = $('#drawer');
  const setMenu = open => { drawer.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); };
  burger.addEventListener('click', () => setMenu(!drawer.classList.contains('open')));
  $$('a', drawer).forEach(a => a.addEventListener('click', () => setMenu(false)));

  // títulos aparecem ao entrar na tela
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .4 });
  $$('.title').forEach(t => io.observe(t));

  // vídeos: só carregam e tocam quando estão visíveis
  const vo = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) {
      if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src;
      v.play().catch(() => {});
    } else v.pause();
  }), { threshold: .35 });
  $$('.space-bg').forEach(v => vo.observe(v));

  // vídeos em carrossel infinito: só o do centro toca
  // vídeo da segunda seção: nunca pausa
  const sbg = $('.specials-bg');
  const keep = () => sbg.paused && sbg.play().catch(() => {});
  sbg.addEventListener('pause', keep);
  addEventListener('load', keep);
  document.addEventListener('visibilitychange', keep);
  addEventListener('pointerdown', keep, { once: true });
  keep();

  const strip = $('#strip'), cnt = $('#count');
  const base = $$('.clip', strip), n = base.length;
  const copy = () => base.map(c => { const k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); return k; });
  copy().forEach(k => strip.insertBefore(k, base[0]));
  copy().forEach(k => strip.appendChild(k));
  const clips = $$('.clip', strip), vids = clips.map(c => $('video', c));
  const total = clips.length;
  const mid = c => c.offsetLeft + c.offsetWidth / 2 - strip.clientWidth / 2;
  const setW = () => clips[n].offsetLeft - clips[0].offsetLeft;
  const go = i => strip.scrollTo({ left: mid(clips[Math.max(0, Math.min(total - 1, i))]), behavior: 'smooth' });
  let cur = -1, raf = 0, inView = false, resume = null, idle = 0, down = false;

  vids.forEach((v, i) => v.addEventListener('timeupdate', () => {
    if (v.duration) clips[i].style.setProperty('--p', (v.currentTime / v.duration).toFixed(3));
  }));

  const play = i => vids.forEach((v, k) => {
    if (k === i && inView) {
      if (!v.getAttribute('src')) v.src = v.dataset.src;
      if (resume != null) {
        const t = resume; resume = null;
        const seek = () => { try { v.currentTime = t; } catch (e) {} };
        v.readyState > 0 ? seek() : v.addEventListener('loadedmetadata', seek, { once: true });
      }
      v.play().catch(() => {});
    } else v.pause();
  });

  const refresh = () => {
    raf = 0;
    const c0 = strip.scrollLeft + strip.clientWidth / 2, span = clips[0].offsetWidth * 1.4;
    let best = 0, bd = 1e9;
    clips.forEach((c, i) => {
      const off = (c.offsetLeft + c.offsetWidth / 2 - c0) / span;
      c.style.setProperty('--o', off.toFixed(3));
      c.style.setProperty('--d', Math.min(Math.abs(off), 1).toFixed(3));
      if (Math.abs(off) < bd) { bd = Math.abs(off); best = i; }
    });
    if (best !== cur) {
      cur = best;
      clips.forEach((c, k) => c.classList.toggle('on', k === best));
      cnt.textContent = `${best % n + 1} / ${n}`;
      play(best);
    }
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(refresh); };

  // quando a rolagem para, volta para o conjunto do meio sem que se perceba
  const recenter = () => {
    if (down) return;
    if (cur < n || cur >= 2 * n) {
      const shift = cur < n ? setW() : -setW();
      resume = vids[cur].currentTime;
      strip.style.scrollSnapType = 'none';
      strip.scrollLeft += shift;
      cur = -1; refresh();
      requestAnimationFrame(() => { strip.style.scrollSnapType = ''; });
    }
  };
  strip.addEventListener('scroll', () => { queue(); clearTimeout(idle); idle = setTimeout(recenter, 150); }, { passive: true });
  addEventListener('resize', () => { strip.scrollLeft = mid(clips[cur < 0 ? n : cur]); queue(); });
  new IntersectionObserver(es => { inView = es[0].isIntersecting; play(cur); }, { threshold: .3 }).observe(strip);

  $('#next').addEventListener('click', () => go(cur + 1));
  $('#prev').addEventListener('click', () => go(cur - 1));
  let sx = 0, sl = 0, moved = 0;
  clips.forEach((c, i) => c.addEventListener('click', () => { if (moved < 5) go(i); }));
  strip.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = strip.scrollLeft; });
  addEventListener('pointermove', e => {
    if (!down) return;
    moved = Math.abs(e.clientX - sx);
    if (moved > 4) strip.classList.add('drag');
    strip.scrollLeft = sl - (e.clientX - sx);
  });
  addEventListener('pointerup', () => {
    if (!down) return; down = false;
    if (strip.classList.contains('drag')) { strip.classList.remove('drag'); go(cur); }
  });

  strip.scrollLeft = mid(clips[n]);
  refresh();

  // horário de funcionamento
  const hours = { 0: null, 1: [10, 19], 2: [10, 19], 3: [10, 19], 4: [10, 19], 5: [10, 19], 6: [7, 13] };
  const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const fmt = h => String(h).padStart(2, '0') + ':00';
  const now = new Date(), d = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
  $$('#hoursList li').find(li => li.dataset.d.split(',').includes(String(d)))?.classList.add('today');
  const today = hours[d];
  let txt;
  if (today && h >= today[0] && h < today[1]) {
    txt = `Estamos abertos até ${fmt(today[1])}.`;
  } else {
    let nd = today && h < today[0] ? d : (d + 1) % 7, add = nd === d ? 0 : 1;
    while (!hours[nd]) { nd = (nd + 1) % 7; add++; }
    const when = add === 0 ? 'hoje' : add === 1 ? 'amanhã' : names[nd];
    txt = `Fechados agora. Abrimos ${when} às ${fmt(hours[nd][0])}.`;
  }
  $('#openText').textContent = txt;
  const live = $('#heroStatus');
  const isOpenNow = !!(today && h >= today[0] && h < today[1]);
  live.classList.toggle('closed', !isOpenNow);
  $('span', live).textContent = isOpenNow ? `Aberto agora, até ${fmt(today[1])}` : txt.replace('Fechados agora. ', 'Fechado agora. ').replace(/\.$/, '');


  // logo: sai do cartão do hero e viaja até o menu ao rolar
  const fly = $('#fly'), seal = $('.seal'), navLogo = $('.logo img');
  const lerp = (a, b, t) => a + (b - a) * t;
  const place = () => {
    const sr = seal.getBoundingClientRect(), nr = navLogo.getBoundingClientRect();
    const sy = sr.top + sr.height / 2, ny = nr.top + nr.height / 2;
    const dist = Math.max(sy + scrollY - ny, 1);
    const t = Math.min(Math.max(1 - (sy - ny) / dist, 0), 1);
    const size = lerp(sr.width, nr.width, t);
    const cx = lerp(sr.left + sr.width / 2, nr.left + nr.width / 2, t);
    const cy = Math.max(sy, ny);
    fly.style.width = fly.style.height = size + 'px';
    fly.style.transform = `translate(${cx - size / 2}px,${cy - size / 2}px)`;
    const ring = lerp(5, 0, t);
    fly.style.boxShadow = `0 0 0 ${ring}px var(--paper), 0 10px 24px rgba(0,0,0,${lerp(.3, 0, t)})`;
    fly.style.opacity = 1;
  };
  let fr = 0;
  const loopPlace = () => { if (!fr) fr = requestAnimationFrame(() => { fr = 0; place(); }); };
  addEventListener('scroll', loopPlace, { passive: true });
  addEventListener('resize', loopPlace);
  addEventListener('load', place);
  document.fonts && document.fonts.ready.then(place);
  place();

  // destaca no menu a seção visível
  const navLinks = $$('.links a[href^="#"]:not(.navcta)');
  const secs = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const so = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(x => so.observe(x));

  $('#year').textContent = now.getFullYear();
})();

