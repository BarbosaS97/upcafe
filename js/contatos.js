(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ------------------------------------------------------------------
     DADOS DE CONTATO
     Preencha aqui e o botão correspondente aparece sozinho.
     Deixe vazio ('') para o botão continuar escondido.
       whatsapp: só números com DDI e DDD, ex.: '5562999999999'
       telefone: ex.: '(62) 3333-3333'
       email:    ex.: 'contato@upcafe.com.br'
  ------------------------------------------------------------------ */
  const CONTATOS = {
    whatsapp: '5561993124261',
    telefone: '',
    email: ''
  };

  const wa = CONTATOS.whatsapp.replace(/\D/g, '');
  if (wa) {
    const a = $('#whatsapp');
    a.href = `https://wa.me/${wa}?text=${encodeURIComponent('Olá, Up Café! Vim pelo Instagram.')}`;
    a.hidden = false;
  }
  if (CONTATOS.telefone) {
    const a = $('#telefone');
    a.href = 'tel:+' + (CONTATOS.telefone.replace(/\D/g, '').replace(/^(?!55)/, '55'));
    $('small', a).textContent = CONTATOS.telefone;
    a.hidden = false;
  }
  if (CONTATOS.email) {
    const a = $('#email');
    a.href = 'mailto:' + CONTATOS.email;
    $('small', a).textContent = CONTATOS.email;
    a.hidden = false;
  }

  // vídeo de fundo: leve no celular, parado em economia de dados ou movimento reduzido
  const bg = $('.bg-video');
  const conn = navigator.connection || {};
  const still = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!still) {
    const small = matchMedia('(max-width: 700px)').matches;
    bg.src = small && bg.dataset.srcM ? bg.dataset.srcM : bg.dataset.src;
    bg.addEventListener('playing', () => bg.classList.add('on'), { once: true });
    const go = () => bg.paused && bg.play().catch(() => {});
    bg.addEventListener('pause', go);
    document.addEventListener('visibilitychange', go);
    addEventListener('pointerdown', go, { once: true });
    go();
  }

  // horários (mesma regra do site)
  const hours = { 0: null, 1: [10, 19], 2: [10, 19], 3: [10, 19], 4: [10, 19], 5: [10, 19], 6: [7, 13] };
  const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const fmt = h => String(h).padStart(2, '0') + ':00';
  const now = new Date(), d = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
  $$('#hoursList li').find(li => li.dataset.d.split(',').includes(String(d)))?.classList.add('today');

  const today = hours[d];
  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const open = !!(today && h >= today[0] && h < today[1]);
  let detail;
  if (open) {
    detail = `até ${fmt(today[1])}`;
  } else {
    let nd = today && h < today[0] ? d : (d + 1) % 7, add = nd === d ? 0 : 1;
    while (!hours[nd]) { nd = (nd + 1) % 7; add++; }
    const when = add === 0 ? 'hoje' : add === 1 ? 'amanhã' : names[nd];
    detail = `abre ${when} às ${fmt(hours[nd][0])}`;
  }
  const state = open ? 'Aberto' : 'Fechado';
  const live = $('#live');
  live.classList.toggle('closed', !open);
  $('.day', live).textContent = dayNames[d];
  $('.st', live).innerHTML = `<em>${state}</em> ${detail}`;
  $('#hoursHint').textContent = `${state} ${detail}`;

  // abre e fecha os horários
  const btn = $('#hoursBtn');
  btn.addEventListener('click', () => btn.setAttribute('aria-expanded', btn.getAttribute('aria-expanded') !== 'true'));
})();
