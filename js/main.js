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

  // vídeos de fundo (2ª seção e espaço): carregam depois da página, versão leve no celular, nunca pausam
  const conn = navigator.connection || {};
  const lowData = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  const noMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smallScreen = matchMedia('(max-width: 700px)');
  const always = $$('.specials-bg, .space-bg');
  const startBg = () => always.forEach(v => {
    if (noMotion || lowData || v.getAttribute('src')) return;
    v.src = smallScreen.matches && v.dataset.srcM ? v.dataset.srcM : v.dataset.src;
    v.play().catch(() => {});
  });
  const keep = () => always.forEach(v => v.getAttribute('src') && v.paused && v.play().catch(() => {}));
  always.forEach(v => v.addEventListener('pause', keep));
  document.addEventListener('visibilitychange', keep);
  addEventListener('pointerdown', keep, { once: true });
  const later = () => (window.requestIdleCallback || (f => setTimeout(f, 400)))(startBg, { timeout: 1500 });
  document.readyState === 'complete' ? later() : addEventListener('load', later);

  // carrossel de vídeos: infinito, movido por transform (sem rolagem nativa), com play/pause
  const strip = $('#strip'), cnt = $('#count'), pp = $('#pp');
  const clips = $$('.clip', strip), n = clips.length, vids = clips.map(c => $('video', c));
  const small = matchMedia('(max-width: 700px)');
  let pos = 0, target = 0, cur = -1, inView = false, userPaused = noMotion || lowData;
  let step = 300, raf = 0, last = 0, drag = null;
  const wrap = d => ((d + n / 2) % n + n) % n - n / 2;
  const measure = () => { step = clips[0].offsetWidth * (small.matches ? 1 : 1.04); };

  vids.forEach((v, i) => v.addEventListener('timeupdate', () => {
    if (v.duration) clips[i].style.setProperty('--p', (v.currentTime / v.duration).toFixed(3));
  }));

  const playActive = () => vids.forEach((v, k) => {
    if (k === cur && inView && !userPaused) {
      if (!v.getAttribute('src')) v.src = v.dataset.src;
      v.play().catch(() => {});
    } else v.pause();
  });
  const setPaused = p => {
    userPaused = p;
    pp.setAttribute('aria-pressed', p);
    pp.setAttribute('aria-label', p ? 'Reproduzir vídeos' : 'Pausar vídeos');
    playActive();
  };
  pp.addEventListener('click', () => setPaused(!userPaused));
  setPaused(userPaused);

  const render = () => {
    clips.forEach((c, i) => {
      const d = wrap(i - pos), a = Math.abs(d);
      const sc = 1 - .14 * Math.min(a, 1.6);
      const op = Math.max(0, 1 - .5 * Math.min(a, 1)) * Math.min(1, Math.max(0, (2.4 - a) / .5));
      const rot = small.matches ? 0 : Math.max(-1, Math.min(1, d)) * -22;
      c.style.transform = `perspective(1200px) translate3d(${(d * step).toFixed(2)}px,0,0) rotateY(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      c.style.opacity = op.toFixed(3);
      c.style.zIndex = 10 - Math.round(a * 3);
      c.style.visibility = op < .01 ? 'hidden' : 'visible';
    });
    const idx = ((Math.round(pos) % n) + n) % n;
    if (idx !== cur) {
      cur = idx;
      clips.forEach((c, k) => c.classList.toggle('on', k === idx));
      cnt.textContent = `${idx + 1} / ${n}`;
      $('.frame', clips[idx]).appendChild(pp);
      playActive();
    }
  };

  const tick = t => {
    raf = 0;
    const dt = Math.max(0, Math.min((t - last) / 1000, .05)); last = t;
    if (!drag) {
      const diff = target - pos;
      pos = Math.abs(diff) < .0008 ? target : pos + diff * (1 - Math.exp(-dt * 8));
    }
    render();
    if (drag || pos !== target) raf = requestAnimationFrame(tick);
  };
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const move = k => { target = Math.round(target) + k; kick(); };
  $('#next').addEventListener('click', () => move(1));
  $('#prev').addEventListener('click', () => move(-1));
  strip.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
  });

  // arrastar (mouse e toque)
  strip.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, p: pos, v: 0, lx: e.clientX, lt: e.timeStamp, moved: false };
  });
  strip.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      drag.moved = true; strip.classList.add('drag'); strip.setPointerCapture(e.pointerId); kick();
    }
    pos = drag.p - dx / step;
    const dtm = e.timeStamp - drag.lt;
    if (dtm > 0) { drag.v = .8 * drag.v + .2 * (e.clientX - drag.lx) / dtm; drag.lx = e.clientX; drag.lt = e.timeStamp; }
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; strip.classList.remove('drag');
    if (d.moved) {
      target = Math.round(pos - Math.max(-1.2, Math.min(1.2, d.v * 120 / step)));
    } else {
      const c = e.target.closest && e.target.closest('.clip');
      const dd = c ? Math.round(wrap(clips.indexOf(c) - pos)) : 0;
      if (dd) target = Math.round(pos) + dd;
    }
    kick();
  };
  strip.addEventListener('pointerup', endDrag);
  strip.addEventListener('pointercancel', endDrag);

  // trackpad / roda horizontal
  let acc = 0, lock = 0;
  strip.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    acc += e.deltaX;
    if (Math.abs(acc) > 50 && performance.now() > lock) { move(acc > 0 ? 1 : -1); acc = 0; lock = performance.now() + 380; }
  }, { passive: false });

  new IntersectionObserver(es => { inView = es[0].isIntersecting; playActive(); }, { threshold: .3 }).observe(strip);
  addEventListener('resize', () => { measure(); render(); });
  measure(); render();

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


  // logo: no topo fica no cartão; ao começar a rolar viaja em arco até o menu, e volta ao subir
  const fly = $('#fly'), seal = $('.seal'), navLogo = $('.logo img');
  const BASE = 84, DOCK_ON = 70, DOCK_OFF = 36;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const stateOf = (el, ring, sh) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width, ring, sh, rot: 0 };
  };
  let docked = scrollY > DOCK_ON, anim = null, shown = null, running = 0;
  const draw = st => {
    const k = st.s / BASE;
    fly.style.transform = `translate3d(${(st.x - BASE / 2).toFixed(2)}px,${(st.y - BASE / 2).toFixed(2)}px,0) rotate(${st.rot.toFixed(2)}deg) scale(${k.toFixed(4)})`;
    fly.style.boxShadow = `0 0 0 ${(st.ring / k).toFixed(2)}px var(--paper), 0 10px 24px rgba(0,0,0,${st.sh.toFixed(3)})`;
    fly.style.opacity = 1;
  };
  const frame = now => {
    running = 0;
    const to = docked ? stateOf(navLogo, 0, 0) : stateOf(seal, 5, .3);
    let st = to;
    if (anim) {
      const p = Math.min((now - anim.t0) / anim.dur, 1), e = ease(p), w = Math.sin(Math.PI * e);
      st = {
        x: lerp(anim.from.x, to.x, e) + anim.swing * w, y: lerp(anim.from.y, to.y, e),
        s: lerp(anim.from.s, to.s, e), ring: lerp(anim.from.ring, to.ring, e), sh: lerp(anim.from.sh, to.sh, e),
        rot: anim.spin * w
      };
      if (p >= 1) anim = null;
    }
    shown = st; draw(st);
    if (anim) request();
  };
  const request = () => { if (!running) running = requestAnimationFrame(frame); };
  addEventListener('scroll', () => {
    const want = docked ? scrollY > DOCK_OFF : scrollY > DOCK_ON;
    if (want !== docked) {
      docked = want;
      const swing = Math.min(54, innerWidth * .1);
      anim = { t0: performance.now(), dur: noMotion ? 1 : 850, from: shown || stateOf(seal, 5, .3), swing: want ? swing : -swing, spin: want ? -14 : 14 };
    }
    request();
  }, { passive: true });
  addEventListener('resize', request);
  addEventListener('load', request);
  document.fonts && document.fonts.ready.then(request);
  request();

  // destaca no menu a seção visível
  const navLinks = $$('.links a[href^="#"]:not(.navcta)');
  const secs = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const so = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(x => so.observe(x));

  $('#year').textContent = now.getFullYear();
})();

