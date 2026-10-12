(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  // ---- A EDITAR: contactos do restaurante ----
  var CONTACTOS = { whatsapp: '351965364042', nome: 'Bastardo' };

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (x, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, x)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var ano = $('#ano');
  if (ano) ano.textContent = new Date().getFullYear();

  initForm();
  initStatus();
  if (reduce) { $$('[data-reveal]').forEach(function (e) { e.classList.add('in'); }); return; }

  /* ---------- Preparação: letras e palavras ---------- */
  $$('[data-letters]').forEach(function (el) {
    var txt = el.textContent;
    el.textContent = '';
    txt.split('').forEach(function (ch, i) {
      var s = document.createElement('span');
      s.style.setProperty('--i', i);
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
    });
  });

  var words = [];
  function wrapWords(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var s = document.createElement('span');
          s.className = 'w';
          s.textContent = part;
          words.push(s);
          frag.appendChild(s);
        });
        node.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.nodeName.toLowerCase() !== 'svg') {
        wrapWords(n);
      }
    });
  }
  var manifesto = $('[data-words]');
  if (manifesto) wrapWords(manifesto);

  /* ---------- Entradas ao rolar ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal], .circled, [data-letters]').forEach(function (el) { io.observe(el); });
  } else {
    $$('[data-reveal], .circled, [data-letters]').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Elementos usados no scroll ---------- */
  var header = $('.header');
  var hero = $('[data-hero]');
  var lines = $$('.hero__title .line');
  var floats = $$('.float');
  var parallaxEls = $$('[data-parallax]');
  var wipes = $$('.wipe');
  var seal = $('.seal');
  var parallaxImgs = $$('[data-parallax-img]');
  var reel = $('[data-reel]');
  var track = reel && $('.reel__track', reel);
  var shots = reel ? $$('.shot__img img', reel) : [];
  var vh = innerHeight, vw = innerWidth;
  var lastY = scrollY, velocity = 0, rate = 1, ticking = false;

  var marquee = [];
  function findMarquee() {
    marquee = [];
    $$('.ribbon__track').forEach(function (el) {
      el.getAnimations().forEach(function (a) { if (a.animationName === 'marquee') marquee.push(a); });
    });
  }
  window.addEventListener('load', findMarquee);

  function layoutReel() {
    if (!reel) return;
    vh = innerHeight; vw = innerWidth;
    var dist = Math.max(0, track.scrollWidth - vw);
    reel.style.setProperty('--reel-h', (dist + vh) + 'px');
    reel._dist = dist;
  }

  function onScroll() {
    var y = scrollY;
    velocity = y - lastY;

    // Cabeçalho: sólido depois do topo; esconde a descer, mostra a subir
    header.classList.toggle('is-solid', y > 24);
    if (y > 240 && velocity > 4) header.classList.add('is-hidden');
    else if (velocity < -4 || y <= 240) header.classList.remove('is-hidden');
    lastY = y;

    // Hero: linhas do título derivam em sentidos opostos; fotografias com parallax
    if (y < vh * 1.4) {
      lines.forEach(function (l) { l.style.setProperty('--dx', (parseFloat(l.dataset.drift) * y * 0.12).toFixed(1)); });
      floats.forEach(function (f) { f.style.setProperty('--py', (-y * parseFloat(f.dataset.speed)).toFixed(1)); });
    }

    // Fotografias com parallax próprio
    parallaxEls.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
      el.style.setProperty('--py', off.toFixed(1));
    });
    parallaxImgs.forEach(function (img) {
      var r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      img.style.setProperty('--iy', ((r.top + r.height / 2 - vh / 2) * -0.07).toFixed(1));
    });

    // Secções verdes: o “cartão” expande até ocupar tudo e encolhe ao sair
    wipes.forEach(function (w) {
      var r = w.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var enter = clamp((vh - r.top) / (vh * 0.85));
      var leave = clamp(r.bottom / (vh * 0.85));
      var p = ease(Math.min(enter, leave));
      $('.wipe__bg', w).style.setProperty('--i', ((1 - p) * 9).toFixed(2));
    });

    // Selo gira com o scroll
    if (seal) seal.style.setProperty('--rot', (y * 0.12).toFixed(1));

    // Manifesto: as palavras acendem à medida que se lê
    if (words.length) {
      var mr = manifesto.getBoundingClientRect();
      var p = clamp((vh * 0.82 - mr.top) / (vh * 0.45 + mr.height * 0.5));
      var n = Math.round(p * words.length);
      for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
    }

    // Galeria horizontal comandada pelo scroll vertical
    if (reel) {
      var rr = reel.getBoundingClientRect();
      var total = rr.height - vh;
      var prog = total > 0 ? clamp(-rr.top / total) : 0;
      var rx = -prog * (reel._dist || 0);
      track.style.setProperty('--rx', rx.toFixed(1));
      reel.style.setProperty('--rp', prog.toFixed(3));
      reel.style.setProperty('--bx', (rx * 0.35).toFixed(1));
      if (rr.top < vh && rr.bottom > 0) {
        shots.forEach(function (img) {
          var sr = img.parentElement.getBoundingClientRect();
          img.style.setProperty('--ix', ((sr.left + sr.width / 2 - vw / 2) * -0.06).toFixed(1));
        });
      }
    }
    ticking = false;
  }
  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', function () { layoutReel(); requestTick(); });
  layoutReel();
  window.addEventListener('load', function () { layoutReel(); requestTick(); });
  onScroll();

  // A faixa acelera com a velocidade do scroll
  (function loop() {
    var target = 1 + Math.min(Math.abs(velocity) * 0.25, 7);
    rate = lerp(rate, target, 0.08);
    velocity *= 0.9;
    for (var i = 0; i < marquee.length; i++) marquee[i].playbackRate = rate;
    requestAnimationFrame(loop);
  })();

  /* ---------- Rato: fotografias do hero e pré-visualização do menu ---------- */
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && hero) {
    var mx = 0, my = 0, cx = 0, cy = 0;
    var depths = [26, -34, 18, -28];
    var figs = floats.map(function (f) { return $('figure', f); });
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
    });
    (function moveHero() {
      cx = lerp(cx, mx, 0.06); cy = lerp(cy, my, 0.06);
      figs.forEach(function (f, i) { f.style.translate = (cx * depths[i]).toFixed(1) + 'px ' + (cy * depths[i]).toFixed(1) + 'px'; });
      requestAnimationFrame(moveHero);
    })();
  }

  var preview = $('.preview');
  if (fine && preview && matchMedia('(min-width: 900px)').matches) {
    var pimg = $('img', preview);
    var px = 0, py = 0, tx = 0, ty = 0, active = false;
    $$('.menu__cat').forEach(function (cat) {
      var src = cat.dataset.img;
      if (src) { var pre = new Image(); pre.src = src; }
      cat.addEventListener('mouseenter', function () { if (src) pimg.src = src; active = true; preview.classList.add('on'); });
      cat.addEventListener('mouseleave', function () { active = false; preview.classList.remove('on'); });
      cat.addEventListener('mousemove', function (e) { tx = e.clientX + 36; ty = e.clientY - 140; if (!px && !py) { px = tx; py = ty; } });
    });
    (function movePreview() {
      px = lerp(px, tx, 0.14); py = lerp(py, ty, 0.14);
      preview.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0) rotate(' + ((tx - px) * 0.05).toFixed(2) + 'deg)';
      requestAnimationFrame(movePreview);
    })();
  }

  /* ---------- Estado: aberto / fechado (horário de exemplo) ---------- */
  function initStatus() {
    var el = document.getElementById('estado');
    if (!el) return;
    var txt = document.getElementById('estado-texto');
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var fmt = function (m) { return pad(Math.floor(m / 60)) + 'h' + pad(m % 60); };
    // A EDITAR (tem de coincidir com o horário em index.html, #horario).
    // Intervalos em minutos; 0 = domingo … 6 = sábado; segunda fechada
    var almoco = [720, 900], jantar = [1140, 1350];
    var h = { 0: [[720, 960]], 1: null, 2: [almoco, jantar], 3: [almoco, jantar], 4: [almoco, jantar], 5: [almoco, jantar], 6: [almoco, jantar] };
    var days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    var update = function () {
      var now = new Date(), d = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
      var today = h[d] || [], open = null, i, k;
      for (i = 0; i < today.length; i++) if (m >= today[i][0] && m < today[i][1]) open = today[i];
      el.hidden = false;
      el.classList.toggle('is-open', !!open);
      if (open) { txt.textContent = 'Aberto agora · serviço até às ' + fmt(open[1]); return; }
      var next = null, label = '';
      for (k = 0; k < 7 && !next; k++) {
        var dd = (d + k) % 7, hh = h[dd];
        if (!hh) continue;
        for (i = 0; i < hh.length; i++) {
          if (k === 0 && m >= hh[i][0]) continue;
          next = hh[i];
          label = k === 0 ? 'hoje' : k === 1 ? 'amanhã' : days[dd];
          break;
        }
      }
      txt.textContent = 'Fechado de momento · abre ' + label + ' às ' + fmt(next[0]);
    };
    update();
    setInterval(update, 60000);
  }

  /* ---------- Formulário de reservas (demonstração: não envia nada) ---------- */
  function initForm() {
    var form = document.getElementById('form-reserva');
    if (!form) return;
    var body = document.getElementById('form-body');
    var confirmacao = document.getElementById('confirmacao');
    var resumo = document.getElementById('resumo');
    var nome = document.getElementById('nome');
    var erro = document.getElementById('nome-erro');
    var diasEl = document.getElementById('dias');
    var fmtDia = new Intl.DateTimeFormat('pt-PT', { weekday: 'short' });
    var fmtMes = new Intl.DateTimeFormat('pt-PT', { month: 'short' });
    var fmtLongo = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
    var iso = function (d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    var primeiro = true;
    for (var i = 1; i <= 8; i++) {
      var d = new Date();
      d.setDate(d.getDate() + i);
      d.setHours(12, 0, 0, 0);
      var fechado = d.getDay() === 1;
      var id = 'd' + i;
      var chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = '<input type="radio" name="dia" id="' + id + '" value="' + iso(d) + '"' +
        (fechado ? ' disabled' : '') + (!fechado && primeiro ? ' checked' : '') + '>' +
        '<label for="' + id + '"' + (fechado ? ' title="Fechado à segunda-feira"' : '') + '><small>' + fmtDia.format(d).replace('.', '') +
        '</small><strong>' + d.getDate() + '</strong><small>' + fmtMes.format(d).replace('.', '') + '</small></label>';
      if (!fechado && primeiro) primeiro = false;
      diasEl.appendChild(chip);
    }

    var valor = function (n) {
      var c = form.querySelector('input[name="' + n + '"]:checked');
      return c ? c.value : '';
    };
    var textoResumo = function () {
      var p = valor('pessoas'), dia = valor('dia'), hora = valor('hora');
      if (!dia) return '';
      var pessoas = p === '6' ? '6 ou mais pessoas' : p + (p === '1' ? ' pessoa' : ' pessoas');
      return pessoas + ' · ' + fmtLongo.format(new Date(dia + 'T12:00:00')) + ' · ' + hora.replace(':', 'h');
    };
    var atualizar = function () { resumo.textContent = textoResumo(); };
    form.addEventListener('change', atualizar);
    atualizar();

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (nome.value.trim() === '') {
        nome.setAttribute('aria-invalid', 'true');
        erro.hidden = false;
        nome.focus();
        return;
      }
      nome.setAttribute('aria-invalid', 'false');
      erro.hidden = true;
      var resumoTxt = textoResumo();
      var tel = document.getElementById('tel').value.trim();
      var msg = 'Olá! Gostaria de reservar mesa no ' + CONTACTOS.nome + ': ' + resumoTxt + '. Nome: ' + nome.value.trim() +
        (tel ? '. Contacto: ' + tel : '') + '. Obrigado!';
      document.getElementById('enviar-wa').href = 'https://wa.me/' + CONTACTOS.whatsapp + '?text=' + encodeURIComponent(msg);
      document.getElementById('confirmacao-titulo').textContent = nome.value.trim() + ', falta só um passo.';
      document.getElementById('confirmacao-resumo').textContent = resumoTxt;
      body.hidden = true;
      confirmacao.hidden = false;
      confirmacao.focus();
    });

    nome.addEventListener('input', function () {
      if (nome.value.trim() !== '') { nome.setAttribute('aria-invalid', 'false'); erro.hidden = true; }
    });

    document.getElementById('nova-reserva').addEventListener('click', function () {
      confirmacao.hidden = true;
      body.hidden = false;
      nome.focus();
    });
  }
})();
