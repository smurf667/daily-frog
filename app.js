(() => {
  'use strict';

  // ---------- configuration ----------
  const STEP = 30;              // seconds per +/- click
  const MIN_LIMIT = 30;
  const MAX_LIMIT = 3600;
  const DEFAULT_LIMIT = 150;    // 2:30
  const BUBBLE_DELAY = 30;      // no bubbles during the first 30 s
  const SURFACE_Y = 340;        // water level in SVG units
  const BUBBLE_START_Y = 478;
  const MAX_RATE = 14;          // bubbles per second at maximum
  const MAX_BUBBLES = 90;
  const FROG_CY = 385;          // frog centre (resting)
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const GREEN = { frog: [108, 192, 74], dark: [47, 125, 50], belly: [212, 239, 163] };
  const RED   = { frog: [226, 68, 58],  dark: [140, 30, 28], belly: [246, 170, 160] };

  // ---------- elements ----------
  const $ = (id) => document.getElementById(id);
  const scene = $('scene');
  const frogEl = $('frog');
  const waterEl = $('water');
  const bubblesEl = $('bubbles');
  const mouthEl = $('mouth');
  const lids = [...scene.querySelectorAll('.lid')];
  const pupils = [...scene.querySelectorAll('.pupil')];
  const timerEl = $('timer');
  const statusEl = $('status');
  const roundLabel = $('roundLabel');
  const limitValue = $('limitValue');
  const limitDown = $('limitDown');
  const limitUp = $('limitUp');
  const startStop = $('startStop');
  const nextBtn = $('next');
  const finishBtn = $('finish');
  const summaryEl = $('summary');

  // ---------- 1-D Perlin (gradient) noise ----------
  function makeNoise(seed) {
    let s = seed >>> 0;
    const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    const g = Array.from({ length: 256 }, () => rnd() * 2 - 1);
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    return (x) => {
      const i = Math.floor(x), f = x - i;
      const a = g[i & 255] * f;
      const b = g[(i + 1) & 255] * (f - 1);
      return 2 * (a + (b - a) * fade(f)); // roughly -1..1
    };
  }
  const noise = makeNoise(20261121);

  // ---------- state ----------
  let limit = DEFAULT_LIMIT;
  try {
    const saved = parseInt(localStorage.getItem('dailyfrog.limit'), 10);
    if (saved >= MIN_LIMIT && saved <= MAX_LIMIT && saved % STEP === 0) limit = saved;
  } catch (e) { /* storage unavailable */ }

  let elapsedMs = 0;
  let running = false;
  let startedAt = 0;
  const rounds = [];

  const fmt = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  };
  const isCooked = () => elapsedMs > 0 && elapsedMs >= limit * 1000;

  // ---------- controls ----------
  function start() {
    if (running) return;
    running = true;
    startedAt = performance.now() - elapsedMs;
  }
  function stop() {
    if (!running) return;
    elapsedMs = Math.max(0, performance.now() - startedAt);
    running = false;
  }
  function resetRound() {
    running = false;
    elapsedMs = 0;
    bubbles.forEach((b) => b.el.remove());
    bubbles.length = 0;
    spawnAcc = 0;
  }
  function recordRound() {
    if (elapsedMs <= 0) return;
    rounds.push({ elapsed: elapsedMs, limit: limit * 1000, alive: elapsedMs < limit * 1000 });
  }
  function setLimit(v) {
    limit = Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, v));
    try { localStorage.setItem('dailyfrog.limit', String(limit)); } catch (e) { /* ignore */ }
  }

  startStop.addEventListener('click', () => (running ? stop() : start()));
  nextBtn.addEventListener('click', () => {
    stop();
    recordRound();
    resetRound();
  });
  finishBtn.addEventListener('click', () => {
    stop();
    recordRound();
    resetRound();
    showSummary();
  });
  limitDown.addEventListener('click', () => setLimit(limit - STEP));
  limitUp.addEventListener('click', () => setLimit(limit + STEP));
  $('newSession').addEventListener('click', () => {
    rounds.length = 0;
    resetRound();
    summaryEl.hidden = true;
  });

  function showSummary() {
    const alive = rounds.filter((r) => r.alive).length;
    $('aliveCount').textContent = alive;
    $('cookedCount').textContent = rounds.length - alive;
    $('summaryEmpty').hidden = rounds.length > 0;
    const list = $('roundList');
    list.textContent = '';
    rounds.forEach((r, i) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = 'Round ' + (i + 1);
      const time = document.createElement('span');
      time.textContent = fmt(r.elapsed / 1000) + ' / ' + fmt(r.limit / 1000);
      const res = document.createElement('span');
      res.className = r.alive ? 'ok' : 'bad';
      res.textContent = r.alive ? 'alive' : 'cooked';
      li.append(name, time, res);
      list.appendChild(li);
    });
    summaryEl.hidden = false;
  }

  // ---------- UI sync (only touches the DOM on change) ----------
  const cache = {};
  const setText = (key, el, text) => { if (cache[key] !== text) { cache[key] = text; el.textContent = text; } };
  const setDisabled = (key, el, v) => { if (cache[key] !== v) { cache[key] = v; el.disabled = v; } };

  function updateUI(cooked) {
    setText('timer', timerEl, fmt(elapsedMs / 1000));
    timerEl.classList.toggle('over', cooked);
    document.body.classList.toggle('cooked', cooked);
    setText('limit', limitValue, fmt(limit));
    setText('round', roundLabel, 'round ' + (rounds.length + 1));

    let status;
    if (cooked) status = 'overtime';
    else if (running) status = 'winging it...';
    else if (elapsedMs > 0) status = 'you did it!';
    else status = 'ready when you are';
    setText('status', statusEl, status);

    setText('startStop', startStop, running ? 'Stop' : (elapsedMs > 0 ? 'Resume' : 'Start'));
    startStop.classList.toggle('running', running);
    const locked = running || elapsedMs > 0;
    setDisabled('ld', limitDown, locked || limit <= MIN_LIMIT);
    setDisabled('lu', limitUp, locked || limit >= MAX_LIMIT);
    setDisabled('next', nextBtn, elapsedMs <= 0);
  }

  // ---------- frog animation ----------
  let flip = 0;            // current rotation in degrees (0 -> 180)
  let amp = 0.5;           // wobble amplitude (smoothed)
  let colorT = 0;          // 0 green .. 1 red
  let lastColorT = -1;
  let lastCooked = null;
  let blinkAt = 1.5;
  let blinkStart = -1;
  let lastLid = -1;
  const BLINK_DUR = 0.18;

  const mix = (a, b, t) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';

  function animateFrog(time, dt, cooked) {
    const motion = reduceMotion ? 0.35 : 1;
    amp += ((running ? 1 : 0.55) - amp) * (1 - Math.exp(-dt * 2));

    const nx = noise(time * 0.45) * 14 * amp * motion;
    const ny = noise(time * 0.65 + 50) * 5 * amp * motion;
    const nr = noise(time * 0.4 + 100) * 3 * amp * motion;

    flip += ((cooked ? 180 : 0) - flip) * (1 - Math.exp(-dt * 3.2));
    const f = flip / 180;
    const cy = FROG_CY - 25 * f;
    frogEl.setAttribute('transform',
      'translate(' + (200 + nx).toFixed(2) + ' ' + (cy + ny).toFixed(2) + ') rotate(' + (flip + nr).toFixed(2) + ') translate(0 -22)');

    // colour fade green <-> red
    colorT += ((cooked ? 1 : 0) - colorT) * (1 - Math.exp(-dt * 3));
    if (Math.abs(colorT - lastColorT) > 0.002) {
      lastColorT = colorT;
      scene.style.setProperty('--frog', mix(GREEN.frog, RED.frog, colorT));
      scene.style.setProperty('--frog-dark', mix(GREEN.dark, RED.dark, colorT));
      scene.style.setProperty('--belly', mix(GREEN.belly, RED.belly, colorT));
    }

    if (cooked !== lastCooked) {
      lastCooked = cooked;
      scene.classList.toggle('cooked', cooked);
      mouthEl.setAttribute('d', cooked ? 'M-24 20 Q0 2 24 20' : 'M-28 4 Q0 26 28 4');
    }

    // blinking
    let lid = 0;
    if (!cooked) {
      if (blinkStart < 0 && time >= blinkAt) blinkStart = time;
      if (blinkStart >= 0) {
        const p = (time - blinkStart) / BLINK_DUR;
        if (p >= 1) {
          blinkStart = -1;
          blinkAt = time + (Math.random() < 0.2 ? 0.25 : 2 + Math.random() * 3);
        } else {
          lid = 1 - Math.abs(2 * p - 1);
        }
      }
    }
    lid = Math.round(lid * 50) / 50;
    if (lid !== lastLid) {
      lastLid = lid;
      lids.forEach((el) => el.setAttribute('transform', 'translate(0 -17) scale(1 ' + lid + ')'));
    }

    // pupils drift around a little
    const px = noise(time * 0.6 + 200) * 3;
    const py = noise(time * 0.6 + 300) * 1.5;
    pupils.forEach((el) => el.setAttribute('transform', 'translate(' + px.toFixed(2) + ' ' + py.toFixed(2) + ')'));
  }

  // ---------- water ----------
  function animateWater(time) {
    let d = 'M60 ' + SURFACE_Y;
    for (let x = 60; x <= 340; x += 10) {
      const y = SURFACE_Y + Math.sin(x * 0.045 + time * 1.6) * 2.4 + Math.sin(x * 0.11 - time * 1.1) * 1.2;
      d += ' L' + x + ' ' + y.toFixed(2);
    }
    d += ' L340 510 L60 510 Z';
    waterEl.setAttribute('d', d);
  }

  // ---------- bubbles ----------
  const bubbles = [];
  let spawnAcc = 0;

  // 0 for the first 30 s, then rises linearly to 1 at the time limit.
  function bubbleProgress() {
    const t = elapsedMs / 1000;
    if (t <= BUBBLE_DELAY) return 0;
    if (limit <= BUBBLE_DELAY) return 1;
    return Math.min(1, (t - BUBBLE_DELAY) / (limit - BUBBLE_DELAY));
  }

  function spawnBubble(p) {
    const el = document.createElementNS(SVG_NS, 'circle');
    el.setAttribute('class', 'bubble');
    const r = 2.5 + Math.random() * 4 + p * 2.5;
    el.setAttribute('r', r.toFixed(1));
    bubblesEl.appendChild(el);
    bubbles.push({
      el, r,
      x0: 122 + Math.random() * 156,
      y: BUBBLE_START_Y,
      v: 45 + Math.random() * 55,
      f: 1.5 + Math.random() * 2.5,
      ph: Math.random() * 6.28,
      amp: 2 + Math.random() * 5,
    });
  }

  function animateBubbles(time, dt) {
    if (running) {
      const p = bubbleProgress();
      if (p > 0) {
        spawnAcc += p * MAX_RATE * dt;
        while (spawnAcc >= 1) {
          spawnAcc -= 1;
          if (bubbles.length < MAX_BUBBLES) spawnBubble(p);
        }
      }
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.y -= b.v * dt;
      if (b.y - b.r <= SURFACE_Y) {
        b.el.remove();
        bubbles.splice(i, 1);
        continue;
      }
      b.el.setAttribute('cx', (b.x0 + Math.sin(time * b.f + b.ph) * b.amp).toFixed(2));
      b.el.setAttribute('cy', b.y.toFixed(2));
    }
  }

  // ---------- main loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (running) elapsedMs = Math.max(0, performance.now() - startedAt);

    const cooked = isCooked();
    const time = now / 1000;
    updateUI(cooked);
    animateFrog(time, dt, cooked);
    animateWater(time);
    animateBubbles(time, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
