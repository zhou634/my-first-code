(() => {
  'use strict';

  /* ============================================================
     孤刃寻她 · THE LONELY BLADE
     A self-contained pixel-art journey action game.
     Everything — sprites, lighting, sound — is generated at runtime.
     ============================================================ */

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const VW = 480, VH = 270, FLOOR = 232;
  const WORLD_W = 960;
  const TAU = Math.PI * 2;

  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const hud = $('hud');
  const hpFill = $('hpFill');
  const hpLag = $('hpLag');
  const hpText = $('hpText');
  const deflectCountEl = $('deflectCount');
  const killCountEl = $('killCount');
  const comboHud = $('comboHud');
  const comboNum = $('comboNum');
  const waveRomanEl = $('waveRoman');
  const enemyPips = $('enemyPips');
  const announceEl = $('announce');
  const announceZh = $('announceZh');
  const announceEn = $('announceEn');
  const announceSub = $('announceSub');
  const parryCallout = $('parryCallout');
  const hintBar = $('hintBar');
  const hintKey = $('hintKey');
  const hintTitle = $('hintTitle');
  const hintSub = $('hintSub');
  const titleScreen = $('titleScreen');
  const pauseScreen = $('pauseScreen');
  const deathScreen = $('deathScreen');
  const victoryScreen = $('victoryScreen');
  const muteBtn = $('muteBtn');

  /* ------------------------- math & helpers ------------------------- */
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const chance = (p) => Math.random() < p;
  const sign = (v) => v < 0 ? -1 : 1;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
  const easeInQuad = (t) => t * t;
  const easeInOutCubic = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const smoothstep = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }
  function hash2(a, b) { return hash(a * 157.31 + b * 53.17 + 7.13); }
  function roman(n) { return ['I', 'II', 'III', 'IV', 'V'][n] || String(n + 1); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  /* ------------------------- pixel rendering ------------------------- */
  function pRect(x, y, w, h, color) {
    if (w <= 0 || h <= 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }
  function pLine(x1, y1, x2, y2, color, thick = 1) {
    x1 = Math.round(x1); y1 = Math.round(y1); x2 = Math.round(x2); y2 = Math.round(y2);
    const dx = x2 - x1, dy = y2 - y1;
    const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
    ctx.fillStyle = color;
    const o = Math.floor(thick / 2);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x1 + dx * i / n);
      const y = Math.round(y1 + dy * i / n);
      ctx.fillRect(x - o, y - o, thick, thick);
    }
  }
  function pCircle(cx, cy, r, color) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    ctx.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy));
      if (w <= 0) continue;
      ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
    }
  }
  function pRing(cx, cy, r, color) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.max(1, Math.round(r));
    ctx.fillStyle = color;
    const n = Math.max(12, Math.floor(TAU * r * 1.2));
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
  }
  function pPoly(points, color) {
    if (!points || points.length < 3) return;
    let minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    minY = Math.floor(minY); maxY = Math.ceil(maxY);
    ctx.fillStyle = color;
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        const y1 = a[1], y2 = b[1];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          xs.push(a[0] + (y - y1) / (y2 - y1) * (b[0] - a[0]));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]);
        if (x1 >= x0) ctx.fillRect(x0, y, x1 - x0 + 1, 1);
      }
    }
  }
  function pArc(cx, cy, radius, a0, a1, color, thickness = 1, alpha = 1, stepPx = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    const steps = Math.max(3, Math.floor(Math.abs(a1 - a0) * radius / Math.max(.6, stepPx)));
    for (let i = 0; i <= steps; i++) {
      const a = lerp(a0, a1, i / steps);
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      ctx.fillRect(Math.round(x), Math.round(y), thickness, thickness);
    }
    ctx.restore();
  }
  function glow(x, y, r, color, alpha, comp = 'lighter') {
    if (!glowEnable || r <= 0 || alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = comp;
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(.45, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  /* ------------------------- 5x7 pixel font ------------------------- */
  const FONT = {
    '0': ['01110','10001','10011','10101','11001','10001','01110'],
    '1': ['00100','01100','00100','00100','00100','00100','01110'],
    '2': ['01110','10001','00001','00010','00100','01000','11111'],
    '3': ['11110','00001','00001','01110','00001','00001','11110'],
    '4': ['00010','00110','01010','10010','11111','00010','00010'],
    '5': ['11111','10000','10000','11110','00001','00001','11110'],
    '6': ['00110','01000','10000','11110','10001','10001','01110'],
    '7': ['11111','00001','00010','00100','01000','01000','01000'],
    '8': ['01110','10001','10001','01110','10001','10001','01110'],
    '9': ['01110','10001','10001','01111','00001','00010','01100'],
    'A': ['01110','10001','10001','11111','10001','10001','10001'],
    'B': ['11110','10001','10001','11110','10001','10001','11110'],
    'C': ['01110','10001','10000','10000','10000','10001','01110'],
    'D': ['11100','10010','10001','10001','10001','10010','11100'],
    'E': ['11111','10000','10000','11110','10000','10000','11111'],
    'F': ['11111','10000','10000','11110','10000','10000','10000'],
    'G': ['01110','10001','10000','10111','10001','10001','01111'],
    'H': ['10001','10001','10001','11111','10001','10001','10001'],
    'I': ['01110','00100','00100','00100','00100','00100','01110'],
    'J': ['00111','00010','00010','00010','00010','10010','01100'],
    'K': ['10001','10010','10100','11000','10100','10010','10001'],
    'L': ['10000','10000','10000','10000','10000','10000','11111'],
    'M': ['10001','11011','10101','10101','10001','10001','10001'],
    'N': ['10001','11001','10101','10011','10001','10001','10001'],
    'O': ['01110','10001','10001','10001','10001','10001','01110'],
    'P': ['11110','10001','10001','11110','10000','10000','10000'],
    'Q': ['01110','10001','10001','10001','10101','10010','01101'],
    'R': ['11110','10001','10001','11110','10100','10010','10001'],
    'S': ['01111','10000','10000','01110','00001','00001','11110'],
    'T': ['11111','00100','00100','00100','00100','00100','00100'],
    'U': ['10001','10001','10001','10001','10001','10001','01110'],
    'V': ['10001','10001','10001','10001','10001','01010','00100'],
    'W': ['10001','10001','10001','10101','10101','11011','10001'],
    'X': ['10001','10001','01010','00100','01010','10001','10001'],
    'Y': ['10001','10001','01010','00100','00100','00100','00100'],
    'Z': ['11111','00001','00010','00100','01000','10000','11111'],
    '!': ['00100','00100','00100','00100','00100','00000','00100'],
    '?': ['01110','10001','00001','00010','00100','00000','00100'],
    '.': ['00000','00000','00000','00000','00000','00000','00100'],
    ':': ['00000','00100','00000','00000','00100','00000','00000'],
    '-': ['00000','00000','00000','11111','00000','00000','00000'],
    '+': ['00000','00100','00100','11111','00100','00100','00000'],
    '/': ['00001','00010','00010','00100','01000','01000','10000'],
    '%': ['11001','11010','00010','00100','01000','01011','10011'],
    '*': ['00000','10101','01110','11111','01110','10101','00000'],
    ' ': ['00000','00000','00000','00000','00000','00000','00000']
  };
  function pixelTextWidth(text, scale = 1) {
    return Math.max(0, text.length * 6 * scale - scale);
  }
  function drawPixelText(text, x, y, scale = 1, color = '#fff', align = 'left', shadow = null) {
    text = String(text).toUpperCase();
    const w = pixelTextWidth(text, scale);
    let startX = Math.round(x - (align === 'center' ? w / 2 : align === 'right' ? w : 0));
    const draw = (ox, oy, col) => {
      ctx.fillStyle = col;
      for (let i = 0; i < text.length; i++) {
        const glyph = FONT[text[i]] || FONT['?'];
        for (let row = 0; row < 7; row++) {
          for (let colIdx = 0; colIdx < 5; colIdx++) {
            if (glyph[row][colIdx] === '1') {
              ctx.fillRect(startX + i * 6 * scale + colIdx * scale + ox, Math.round(y) + row * scale + oy, scale, scale);
            }
          }
        }
      }
    };
    if (shadow) draw(scale, scale, shadow);
    draw(0, 0, color);
  }

  /* ------------------------- audio ------------------------- */
  // [PERF] 打击音节流时间戳（毫秒）：同帧多段命中只合成一次打击音
  let lastHitSfx = 0;
  // [PERF] 敌人死亡音节流时间戳：同帧多目标死亡只合成一次死亡音
  let lastDeathSfx = 0;
  // [PERF] 地刺破土音节流时间戳：多根地刺连续破土时只响一次
  let lastSpikeSfx = 0;
  const Sound = {
    ctx: null, master: null, noiseBuf: null, started: false, muted: false, ambientNodes: [],
    init() {
      if (this.ctx) { this.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        const master = this.ctx.createGain();
        master.gain.value = this.muted ? 0 : .55;
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.knee.value = 18;
        comp.ratio.value = 5;
        comp.attack.value = .003;
        comp.release.value = .22;
        master.connect(comp);
        comp.connect(this.ctx.destination);
        this.master = master;
        // pre-render a little white-noise bed
        const len = Math.floor(this.ctx.sampleRate * 2);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuf = buf;
        this.buildAmbient();
        this.started = true;
      } catch (err) { console.warn('Audio unavailable', err); }
    },
    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    },
    buildAmbient() {
      const c = this.ctx;
      const bus = c.createGain();
      bus.gain.value = .50;
      bus.connect(this.master);
      // subterranean hum
      [41.2, 61.7, 82.4].forEach((freq, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.value = freq;
        g.gain.value = [.047, .018, .008][i];
        const lfo = c.createOscillator();
        const lg = c.createGain();
        lfo.frequency.value = .043 + i * .031;
        lg.gain.value = [.012, .006, .002][i];
        lfo.connect(lg); lg.connect(g.gain);
        o.connect(g); g.connect(bus);
        o.start(); lfo.start();
        this.ambientNodes.push(o, lfo);
      });
      // draft / wind
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf; src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      filter.Q.value = .4;
      const gain = c.createGain();
      gain.gain.value = .055;
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = .071;
      lg.gain.value = .022;
      lfo.connect(lg); lg.connect(gain.gain);
      src.connect(filter); filter.connect(gain); gain.connect(bus);
      src.start(); lfo.start();
      this.ambientNodes.push(src, lfo);
    },
    toggleMute() {
      this.muted = !this.muted;
      if (this.master) {
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(this.muted ? 0 : .55, now, .04);
      }
      muteBtn.classList.toggle('is-muted', this.muted);
    },
    tone(freq, dur, type = 'sine', vol = .1, endFreq = freq, delay = 0) {
      if (!this.ctx || this.muted) return;
      const c = this.ctx, t = c.currentTime + delay;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(20, freq), t);
      if (endFreq !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), t + .006);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + .03);
      // [PERF] 播放完毕主动断开节点：防止海量已停止的 AudioNode 残留在
      // 音频图中，长期累积引发内存增长与 GC 长暂停（表现为画面卡死）
      o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (_) {} };
    },
    noise(dur, vol = .1, filterType = 'lowpass', freq = 1400, endFreq = freq, delay = 0, q = .8) {
      if (!this.ctx || this.muted) return;
      const c = this.ctx, t = c.currentTime + delay;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = filterType;
      f.frequency.setValueAtTime(Math.max(40, freq), t);
      if (endFreq !== freq) f.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t + dur);
      f.Q.value = q;
      const g = c.createGain();
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), t + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + dur + .04);
      // [PERF] 同上：播放完毕主动断开全部相关节点
      src.onended = () => { try { src.disconnect(); f.disconnect(); g.disconnect(); } catch (_) {} };
    },
    slash(heavy = false) {
      this.noise(heavy ? .23 : .16, heavy ? .13 : .085, 'bandpass', heavy ? 680 : 980, 340, 0, 1.2);
      this.tone(heavy ? 160 : 220, .09, 'triangle', .035, 60);
    },
    ultSheath() {
      // 次元斩落鞘爆发音：清脆“叮” + 下潜低频 + 空间撕裂尾音
      this.tone(2380, .07, 'triangle', .085, 1980);
      this.tone(3150, .05, 'sine', .05, 2700, .004);
      this.noise(.2, .13, 'bandpass', 140, 420, 0, 2.0);
      this.noise(.4, .16, 'bandpass', 420, 90, .18, 2.0);
      this.tone(120, .5, 'sawtooth', .045, 45);
      this.tone(46, .9, 'sine', .11, 28);
      this.tone(72, .5, 'triangle', .05, 36, .02);
      this.noise(.5, .10, 'lowpass', 520, 80, .04, .8);
    },
    ultCharge() {
      // 蓄力：低频上扫 + 带通风声，0.6s 内逐渐收紧
      this.tone(58, .58, 'sawtooth', .038, 96);
      this.tone(116, .5, 'sine', .022, 188, .04);
      this.noise(.55, .035, 'bandpass', 220, 820, 0, 1.6);
      this.tone(620, .28, 'sine', .012, 1240, .30);
    },
    ultCut() {
      // 出刀：锐利高频 + 低频冲击，和普通居合区分开
      this.noise(.22, .14, 'bandpass', 1400, 320, 0, 1.4);
      this.tone(240, .1, 'triangle', .05, 90);
      this.tone(1800, .12, 'sine', .03, 2460);
      this.tone(60, .3, 'sine', .08, 38);
    },
    ultSheathStart() {
      // 刀身滑入刀鞘的金属摩擦声（落鞘前一瞬）
      this.noise(.11, .06, 'highpass', 1800, 4600, 0, .9);
      this.tone(880, .09, 'triangle', .022, 1560);
      this.tone(140, .12, 'sine', .02, 90);
    },
    hit(heavy = false) {
      // [PERF] 40ms 内的连续命中只播放一次打击音，防爆音与音频线程卡顿
      const tSfx = performance.now();
      if (tSfx - lastHitSfx < 40) return;
      lastHitSfx = tSfx;
      this.noise(.09, heavy ? .22 : .15, 'lowpass', heavy ? 2400 : 3200, 500, 0, .7);
      this.tone(heavy ? 92 : 128, .12, 'square', .07, 44);
      this.tone(heavy ? 55 : 74, .18, 'sine', .07, 38);
    },
    hurt() {
      this.noise(.16, .19, 'lowpass', 1600, 240, 0, .8);
      this.tone(92, .28, 'sawtooth', .055, 38);
      this.tone(190, .12, 'square', .028, 70);
    },
    parry() {
      [1046.5, 1568, 2093, 2637].forEach((f, i) => {
        this.tone(f, .55 + i * .08, i === 0 ? 'triangle' : 'sine', [.11, .055, .035, .02][i], f, 0);
        this.tone(f * 1.006, .32, 'sine', .018, f * 1.006, .012);
      });
      this.noise(.28, .12, 'highpass', 3200, 1800, 0, .6);
      this.noise(.13, .16, 'bandpass', 900, 5000, 0, 1.4);
      this.tone(70, .35, 'sine', .10, 40, 0);
    },
    deflectStart() {
      this.noise(.07, .08, 'highpass', 2400, 4200, 0, .8);
    },
    dash() {
      this.noise(.13, .075, 'bandpass', 480, 1500, 0, 1.3);
      this.tone(150, .1, 'triangle', .03, 65);
    },
    footstep(soft = false) {
      this.noise(.045, soft ? .022 : .032, 'lowpass', 430, 180, 0, .5);
      this.tone(soft ? 62 : 76, .045, 'sine', .018, 48);
    },
    jump() {
      this.noise(.08, .04, 'highpass', 500, 1200, 0, .7);
      this.tone(220, .1, 'sine', .025, 330);
    },
    land() {
      this.noise(.09, .06, 'lowpass', 580, 180, 0, .7);
      this.tone(66, .1, 'sine', .045, 42);
    },
    spawn() {
      this.tone(48, .55, 'sawtooth', .05, 31);
      this.noise(.5, .07, 'lowpass', 900, 120, 0, .6);
      this.tone(310, .35, 'sine', .02, 140, .1);
    },
    enemyWindup(elite = false) {
      this.tone(elite ? 62 : 78, .5, 'sawtooth', .025, elite ? 96 : 118);
      this.noise(.5, .03, 'bandpass', 300, 780, 0, 1.1);
    },
    enemyWarn(elite = false) {
      this.tone(elite ? 330 : 440, .07, 'square', .018, elite ? 390 : 520);
      this.noise(.08, .05, 'highpass', 1900, 2400, 0, .8);
    },
    enemyWarnFinal(elite = false) {
      this.tone(elite ? 660 : 820, .055, 'square', .022, elite ? 740 : 910);
      this.noise(.07, .04, 'highpass', 3200, 4200, 0, .9);
    },
    enemySwing(elite = false) {
      this.noise(elite ? .24 : .18, elite ? .16 : .11, 'bandpass', elite ? 500 : 760, 230, 0, 1.1);
      this.tone(elite ? 90 : 130, .12, 'sawtooth', .04, 45);
    },
    enemyRift() {
      // 裂影突袭瞬移：短促的空间撕裂 + 低频下潜
      this.noise(.22, .10, 'bandpass', 280, 1600, 0, 1.5);
      this.tone(118, .30, 'sawtooth', .042, 48);
      this.tone(520, .12, 'sine', .018, 860, .02);
    },
    enemySpike() {
      // 地刺破土：低频闷响；80ms 内连续破土只响一次
      const tSfx = performance.now();
      if (tSfx - lastSpikeSfx < 80) return;
      lastSpikeSfx = tSfx;
      this.noise(.20, .12, 'lowpass', 620, 120, 0, .8);
      this.tone(52, .28, 'sine', .07, 30);
      this.tone(96, .12, 'triangle', .03, 58);
    },
    enemyBeam() {
      // 紫渊审判：竖直光柱落下的尖锐裂空 + 低频轰鸣
      this.noise(.32, .14, 'highpass', 1200, 4200, 0, .9);
      this.noise(.45, .12, 'lowpass', 700, 90, .02, .7);
      this.tone(1800, .18, 'sine', .03, 900);
      this.tone(58, .5, 'sine', .09, 30);
    },
    enemyDeath(elite = false) {
      // [PERF] 多目标同帧死亡时只合成一次死亡音（60ms 节流），防音频线程爆音
      const tSfx = performance.now();
      if (tSfx - lastDeathSfx < 60) return;
      lastDeathSfx = tSfx;
      this.tone(elite ? 120 : 210, .7, 'sawtooth', .055, 34);
      this.noise(.45, .13, 'lowpass', 1600, 130, 0, .6);
      this.tone(540, .32, 'sine', .025, 200, .05);
    },
    wave() {
      [55, 82.5, 110].forEach((f, i) => this.tone(f, 1.4, 'sawtooth', .022 - i * .004, f * .99, 0));
      this.tone(330, .18, 'triangle', .022, 330, .05);
      this.tone(440, .3, 'sine', .018, 440, .22);
    },
    waveClear() {
      [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, .9, 'sine', .03, f, i * .09));
    },
    victory() {
      [261.6, 392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 2.2, 'sine', .025, f, i * .11));
    },
    death() {
      [180, 134, 101].forEach((f, i) => this.tone(f, 1.6, 'triangle', .035, f * .8, i * .16));
      this.noise(1.2, .07, 'lowpass', 800, 90, 0, .5);
    },
    drip() {
      const f = rand(650, 1550);
      this.tone(f, .22, 'sine', .012, f * .55);
    }
  };

  /* ------------------------- input ------------------------- */
  const keys = new Set();
  const GAME_KEYS = new Set([
    'KeyA','KeyD','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight',
    'KeyJ','KeyK','KeyW','KeyS','ArrowUp','ArrowDown','Escape','KeyP','KeyM','Enter','KeyR'
  ]);
  let gameState = 'title'; // title | playing | paused | dying | dead | victory | cutscene

  // 紫魇一阶段 → 二阶段转场 CG（纯代码绘制，无外部资源）
  const bossCG = {
    active: false, t: 0, dur: 3.5,
    boss: null, embers: [], dom: null
  };

  function attemptStart() {
    if (gameState === 'title') { Sound.init(); Sound.resume(); beginRun(); }
    else if (gameState === 'dead' || gameState === 'victory') { Sound.init(); Sound.resume(); beginRun(); }
  }

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (gameState === 'cutscene') return;
    keys.add(e.code);

    if (e.code === 'KeyM') {
      Sound.init(); Sound.resume(); Sound.toggleMute();
      return;
    }

    if (gameState === 'title') {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyJ') attemptStart();
      return;
    }
    if (gameState === 'paused') {
      if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Enter') togglePause(false);
      return;
    }
    if (gameState === 'dead' || gameState === 'victory') {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyR') attemptStart();
      if (e.code === 'Escape') returnToTitle();
      return;
    }
    if (gameState !== 'playing') return;

    switch (e.code) {
      case 'KeyJ': tryAttack(); break;
      case 'KeyU': tryUlt(); break;
      case 'KeyK': tryParry(); break;
      case 'Space': tryJump(); break;
      case 'ShiftLeft': case 'ShiftRight': tryDash(); break;
      case 'Escape': case 'KeyP': togglePause(true); break;
    }
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.code); });
  window.addEventListener('blur', () => {
    keys.clear();
    if (gameState === 'playing') togglePause(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'playing') togglePause(true);
  });

  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    Sound.init(); Sound.resume(); Sound.toggleMute();
    muteBtn.blur();
  });

  // Mouse support: LMB slash, RMB deflect. Kept off the overlays.
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (gameState !== 'playing') return;
    Sound.resume();
    if (e.button === 0) tryAttack();
    else if (e.button === 2) tryParry();
  });

  /* ------------------------- palettes ------------------------- */
  const PAL = {
    outline: '#050509',
    clothDark: '#0a0b10',
    cape: '#101119',
    cape2: '#171923',
    cape3: '#20232f',
    cloth: '#1c1e28',
    clothHi: '#2b2f3e',
    wrap: '#444a5e',
    wrapHi: '#69718b',
    scarf: '#2a2d39',
    scarfHi: '#4a4f65',
    red: '#b31f35',
    redHi: '#e24053',
    eye: '#ff3045',
    eyeHot: '#ffb2ba',
    skin: '#9a7972',
    blade: '#e9f1ff',
    bladeMid: '#a9b9d6',
    bladeDark: '#5f6d8a',
    gold: '#c79f5c',
    goldHi: '#f0d69b',
    boot: '#0b0c11',
    bootHi: '#252936',
    ghost: '#9bb0c9'
  };
  const MPAL = {
    outline: '#0e0612',
    dark: '#25102e',
    body: '#3f1a4d',
    mid: '#5b2a6b',
    light: '#7f4492',
    hi: '#a763b9',
    bone: '#dbc2cc',
    boneShade: '#9b7f8e',
    maw: '#2a081b',
    tongue: '#d34c72',
    eye: '#ff4f9b',
    eyeHot: '#ffd6e9',
    aura: '#a34fbb',
    eliteDark: '#1e0a2b',
    eliteBody: '#341446',
    eliteLight: '#6e3582'
  };
  const BG = {
    void: '#06050a',
    deepest: '#08070c',
    wall0: '#111017',
    wall1: '#17141c',
    wall2: '#1c1821',
    wall3: '#231e29',
    mortar: '#0a090d',
    mortarHi: '#2b2530',
    stone0: '#151218',
    stone1: '#1b171e',
    stone2: '#221d25',
    stoneHi: '#312a34',
    moss0: '#223025',
    moss1: '#33482f',
    mossHi: '#4f6841',
    wood: '#1d140f',
    woodHi: '#3a291c',
    chain: '#2f2a2b',
    chainHi: '#575050',
    iron: '#3b3437',
    ironHi: '#6d6161',
    flame0: '#ff722e',
    flame1: '#ffab3e',
    flame2: '#ffe0a0',
    cloth: '#2a1018',
    clothHi: '#4b1b25',
    clothGold: '#8e6a3b'
  };

  // -------------------------------------------------------------------------
  // Everything below is built out in the following sections.
  // -------------------------------------------------------------------------
  /* ============================================================
     CAMERA · LIGHT · ATMOSPHERE
     ============================================================ */
  const camera = { x: 0, trauma: 0, shakeX: 0, shakeY: 0 };
  const TORCH_POS = [150, 448, 746, 1044];
  const torches = TORCH_POS.map((x, i) => ({ wx: x, phase: i * 1.37 + .4, sx: -999, sy: -999, light: 1 }));
  const lightSources = [];
  const farLights = [];
  let ambientTime = 0;

  const motes = [];
  const embers = [];
  const drips = [];
  let dripTimer = 4;

  function initAmbient() {
    motes.length = 0;
    for (let i = 0; i < 40; i++) {
      motes.push({
        x: rand(0, VW), y: rand(38, 245),
        vx: rand(-3, 3), vy: rand(-2.4, -.3),
        a: rand(.06, .30), phase: rand(0, TAU), size: chance(.16) ? 2 : 1
      });
    }
  }
  initAmbient();

  function updateAmbient(dt, t) {
    for (const m of motes) {
      m.x += (m.vx + Math.sin(t * .35 + m.phase) * 2.2) * dt;
      m.y += m.vy * dt;
      if (m.y < 24) { m.y = rand(210, 255); m.x = rand(0, VW); }
      if (m.x < -8) m.x = VW + 8;
      if (m.x > VW + 8) m.x = -8;
    }
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.life -= dt;
      e.x += (e.vx + Math.sin(t * 2 + e.phase) * 3) * dt;
      e.y += e.vy * dt;
      e.vy -= 3 * dt;
      if (e.life <= 0) embers.splice(i, 1);
    }
    for (let i = drips.length - 1; i >= 0; i--) {
      const d = drips[i];
      d.t += dt;
      if (d.t > d.delay) {
        d.y += 110 * dt;
        if (d.y > d.ty) {
          d.splash += dt;
          if (d.splash > .3) drips.splice(i, 1);
        }
      }
    }
    dripTimer -= dt;
    if (dripTimer <= 0) {
      dripTimer = rand(3.8, 9);
      drips.push({ x: rand(40, VW - 40), y: rand(18, 45), ty: FLOOR + rand(8, 32), t: 0, delay: rand(0, .9), splash: 0 });
    }
    // embers shed by torches
    if (chance(dt * 7.5)) {
      const src = torches.find(tt => tt.sx > -30 && tt.sx < VW + 30);
      if (src) {
        embers.push({
          x: src.sx + rand(-2, 2), y: src.sy - rand(4, 12),
          vx: rand(-5, 5), vy: rand(-17, -7), life: rand(.5, 1.5),
          max: 1.5, phase: rand(0, TAU), hot: chance(.35)
        });
      }
    }
  }

  function screenTorchFlicker(t, phase) {
    return .82 + Math.sin(t * 8.3 + phase) * .07 + Math.sin(t * 13.7 + phase * 2.1) * .05 + Math.sin(t * 21.1 + phase * .7) * .03;
  }

  /* ------------------------- distant hall ------------------------- */
  const farBgGradient = (() => {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#050409');
    g.addColorStop(.34, '#08070d');
    g.addColorStop(.62, '#0d0a10');
    g.addColorStop(.8, '#100c10');
    g.addColorStop(1, '#07070a');
    return g;
  })();

  function drawFarHall(t) {
    ctx.fillStyle = farBgGradient;
    ctx.fillRect(0, 0, VW, VH);
    const off = camera.x * .13;
    ctx.save();
    ctx.translate(-Math.floor(off), 0);
    const interval = 232;
    const startI = Math.floor((off - 130) / interval);
    const endI = Math.ceil((off + VW + 130) / interval);
    for (let i = startI; i <= endI; i++) {
      const cx = i * interval + 116;
      const sx = cx - Math.floor(off);
      if (sx < -170 || sx > VW + 170) continue;
      const archH = 148 + hash(i * 3.1) * 36;
      const base = FLOOR + 2;
      // massive pillars
      pRect(sx - 86, 58, 26, base - 58, '#08070b');
      pRect(sx - 84, 58, 2, base - 58, '#0c0a10');
      pRect(sx + 60, 52, 28, base - 52, '#08070b');
      pRect(sx + 62, 52, 2, base - 52, '#0d0b11');
      // pointed arch void
      const pts = [
        [sx - 60, base], [sx - 60, 116], [sx - 54, 96], [sx - 38, 76], [sx - 17, 62],
        [sx, 56 + (archH - 148) * .2], [sx + 17, 62], [sx + 38, 76], [sx + 54, 96], [sx + 60, 116],
        [sx + 60, base]
      ];
      pPoly(pts, '#050409');
      pPoly(pointsScaledAround(pts, sx, base, .82, .87), '#090d12');
      // faint cold rim
      pLine(sx - 54, 96, sx - 38, 76, '#111922', 1);
      pLine(sx + 38, 76, sx + 54, 96, '#111922', 1);
      pLine(sx - 17, 62, sx, 58, '#131c23', 1);
      pLine(sx, 58, sx + 17, 62, '#131c23', 1);
      // hanging chain in the arch
      drawChain(sx + 2, 60, 30 + hash(i * 2.7) * 40, t, i * 1.7, .6, '#0a090d');
      // tiny distant candle / lamp
      if (hash(i * 4.9) > .35) {
        const lx = sx + (hash(i) > .5 ? -24 : 25);
        const ly = 142 + hash(i * 6.1) * 40;
        pRect(lx, ly, 1, 3, '#271a12');
        const fl = Math.sin(t * 8 + i) * .4;
        pRect(lx, ly - 2 + fl, 1, 2, '#c9874e');
        glow(lx, ly - 2, 15, 'rgba(110,150,170,.13)', .75);
        farLights.push({ x: lx, y: ly - 2, r: 24, color: 'rgba(102,147,174,.10)' });
      }
      // distant fog collecting at the arch base
      ctx.save();
      ctx.globalAlpha = .045;
      ctx.fillStyle = '#7d91a4';
      ctx.beginPath();
      ctx.ellipse(sx, base - 10, 74, 13, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      // broken step
      pRect(sx - 56, base - 7, 112, 3, '#0a090d');
      pRect(sx - 48, base - 4, 98, 2, '#0c0b10');
    }
    // faint far floor line
    pRect(-200, FLOOR - 12, WORLD_W + 500, 14, '#08070b');
    ctx.restore();
  }

  function pointsScaledAround(points, cx, cy, sx, sy) {
    return points.map(p => [cx + (p[0] - cx) * sx, cy + (p[1] - cy) * sy]);
  }

  /* ------------------------- main wall ------------------------- */
  function drawBrickWall(t) {
    const off = camera.x * .56;
    ctx.save();
    ctx.translate(-Math.floor(off), 0);
    // base
    pRect(-200, 16, WORLD_W + 700, FLOOR - 16, '#151119');
    const rowH = 16, brickW = 37;
    const startRow = 0;
    for (let row = startRow; row < 14; row++) {
      const y = 20 + row * rowH;
      if (y > FLOOR) break;
      const shift = (row % 2) * Math.round(brickW / 2);
      const i0 = Math.floor((off - 100) / brickW) - 1;
      const i1 = Math.ceil((off + VW + 120) / brickW) + 1;
      for (let i = i0; i <= i1; i++) {
        const x = i * brickW + shift;
        const r = hash2(row * 1.13 + 3, i * 2.17 + 1);
        let col = '#1c1720';
        if (r > .82) col = '#241d29';
        else if (r > .61) col = '#201923';
        else if (r < .10) col = '#17131b';
        pRect(x + 1, y + 1, brickW - 2, rowH - 2, col);
        pRect(x + 2, y + 1, brickW - 4, 1, r > .8 ? '#322a37' : '#29212c');
        pRect(x + 1, y + rowH - 2, brickW - 2, 1, '#100d13');
        if (r > .93) {
          // chipped corner
          pRect(x + 3, y + 4, 4, 2, '#0c0a10');
          pRect(x + 7, y + 6, 2, 2, '#0c0a10');
        }
        if (r < .075) {
          // crack
          const cx0 = x + 8 + hash2(i, row) * 14;
          pLine(cx0, y + 3, cx0 + 3, y + 7, '#0a090d', 1);
          pLine(cx0 + 3, y + 7, cx0 + 1, y + 11, '#0a090d', 1);
        }
        if (row > 9 && hash2(i * 3, row) > .58) {
          // moss in the damp lower bricks
          const mx = x + 4 + hash2(row, i * 5) * 22;
          pRect(mx, y + rowH - 4, 5, 2, 'rgba(36,54,36,.65)');
          pRect(mx + 2, y + rowH - 6, 2, 2, 'rgba(52,77,46,.50)');
          pRect(mx + 8, y + rowH - 3, 3, 1, 'rgba(28,43,30,.6)');
        }
      }
    }
    // lower wainscot band
    pRect(-200, 186, WORLD_W + 700, 4, '#100c12');
    pRect(-200, 190, WORLD_W + 700, 2, '#2a232e');
    for (let i = -1; i < 26; i++) {
      const x = i * 58 - (Math.floor(off) % 58);
      pRect(x, 194, 1, FLOOR - 194, '#0d0b10');
      pRect(x + 2, 194, 48, 1, '#211b24');
      pRect(x + 2, 208, 48, 1, '#141016');
      pRect(x + 2, 221, 48, 1, '#141016');
    }
    // wall alcoves
    const alcoveInterval = 310;
    const a0 = Math.floor((off - 200) / alcoveInterval);
    const a1 = Math.ceil((off + VW + 200) / alcoveInterval);
    for (let i = a0; i <= a1; i++) {
      const cx = i * alcoveInterval + 228;
      if (cx < off - 120 || cx > off + VW + 120) continue;
      const w = 47;
      const pts = [
        [cx - w, FLOOR], [cx - w, 114], [cx - w + 7, 94], [cx - w + 23, 78],
        [cx, 66], [cx + w - 23, 78], [cx + w - 7, 94], [cx + w, 114], [cx + w, FLOOR]
      ];
      pPoly(pointsScaledAround(pts, cx, FLOOR, 1.02, 1), '#07060a');
      pPoly(pointsScaledAround(pts, cx, FLOOR, .80, .90), '#0c0a0f');
      // inner dim blue recess
      pRect(cx - 2, 146, 4, 85, 'rgba(24,34,42,.4)');
      // rim highlights
      pLine(cx - w + 8, 95, cx - w + 24, 80, '#201b24', 1);
      pLine(cx - w + 24, 80, cx + 1, 67, '#28212c', 1);
      pLine(cx + 1, 67, cx + w - 24, 80, '#141118', 1);
      pLine(cx + w - 24, 80, cx + w - 8, 95, '#141118', 1);
      // a cold draft of light from somewhere deeper in the dungeon
      if (hash(i * 2.91) > .34) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const ghostLight = ctx.createLinearGradient(0, 108, 0, FLOOR);
        ghostLight.addColorStop(0, 'rgba(78,110,126,0)');
        ghostLight.addColorStop(.55, `rgba(73,104,120,${.035 + hash(i * 5.1) * .03})`);
        ghostLight.addColorStop(1, 'rgba(84,114,126,.015)');
        ctx.fillStyle = ghostLight;
        ctx.fillRect(cx - w * .6, 108, w * 1.2, FLOOR - 108);
        // the suggestion of descending steps
        for (let st = 0; st < 4; st++) {
          pRect(cx - 13 + st * 2, 206 - st * 4, 26 - st * 4, 1, 'rgba(78,87,95,.14)');
        }
        ctx.restore();
      }
      // old hanging banner, only in some alcoves
      if (hash(i * 7.77) > .43) {
        const by = 106;
        const bh = 50 + hash(i * 2.3) * 26;
        const pts2 = [
          [cx - 8, by], [cx + 9, by], [cx + 12, by + bh * .5],
          [cx + 9, by + bh], [cx + 3, by + bh - 6], [cx - 2, by + bh],
          [cx - 9, by + bh - 3], [cx - 12, by + bh * .55]
        ];
        pPoly(pts2, '#1b0e15');
        pPoly(pointsScaledAround(pts2, cx, by, .82, .93), '#280f18');
        pLine(cx - 7, by + 4, cx - 3, by + bh - 8, '#35151f', 1);
        // faded sigil
        pRect(cx - 3, by + 18, 6, 1, 'rgba(125,92,53,.20)');
        pRect(cx - 2, by + 21, 4, 4, 'rgba(111,79,45,.13)');
        pRect(cx - 4, by + 25, 8, 1, 'rgba(111,79,45,.10)');
        // hanging rod
        pRect(cx - 12, by - 2, 24, 2, '#2a211d');
        pRect(cx - 13, by - 2, 1, 2, '#4a3a2b');
      }
    }
    // broad grime gradient on the wall
    const grime = ctx.createLinearGradient(0, 20, 0, FLOOR);
    grime.addColorStop(0, 'rgba(0,0,0,.25)');
    grime.addColorStop(.45, 'rgba(0,0,0,0)');
    grime.addColorStop(1, 'rgba(0,0,0,.30)');
    ctx.fillStyle = grime;
    ctx.fillRect(-200, 16, WORLD_W + 700, FLOOR - 16);
    ctx.restore();
  }

  function drawPillars(t) {
    const off = camera.x * .72;
    ctx.save();
    ctx.translate(-Math.floor(off), 0);
    const spacing = 323;
    const i0 = Math.floor((off - 140) / spacing) - 1;
    const i1 = Math.ceil((off + VW + 140) / spacing) + 1;
    for (let i = i0; i <= i1; i++) {
      const x = i * spacing + 68;
      if (x < off - 90 || x > off + VW + 90) continue;
      const w = 30;
      // shadow / back face
      pRect(x + 6, 5, w, FLOOR - 5, '#0a090e');
      pRect(x, 5, w, FLOOR - 5, '#17131a');
      pRect(x + 2, 5, 3, FLOOR - 5, '#221c26');
      pRect(x + w - 5, 5, 3, FLOOR - 5, '#100d13');
      // stone segments
      for (let y = 22; y < FLOOR; y += 24) {
        pRect(x + 1, y, w - 2, 1, '#0e0c11');
        pRect(x + 3, y + 1, w - 7, 1, '#2a222d');
        const cut = hash2(i * 3, y) > .7;
        if (cut) pRect(x + 5, y + 5, 7, 1, '#0d0b10');
      }
      // capital
      pRect(x - 5, 14, w + 10, 8, '#1d1721');
      pRect(x - 5, 14, w + 10, 2, '#2c2431');
      pRect(x - 3, 22, w + 6, 3, '#100d13');
      pRect(x - 7, 11, w + 14, 3, '#17121b');
      pRect(x - 7, 11, w + 14, 1, '#2b2230');
      // base
      pRect(x - 6, FLOOR - 12, w + 12, 12, '#17131a');
      pRect(x - 6, FLOOR - 12, w + 12, 2, '#2c232e');
      pRect(x - 2, FLOOR - 4, w + 4, 4, '#100d13');
      // carved grooves
      pRect(x + 7, 34, 1, 96, 'rgba(58,46,59,.28)');
      pRect(x + 22, 46, 1, 70, 'rgba(6,5,8,.5)');
      // soot from torches
      pRect(x + 2, 60, w - 4, 48, 'rgba(0,0,0,.14)');
      // moss at base
      for (let k = 0; k < 6; k++) {
        const mx = x + hash2(i, k) * (w - 4);
        const my = FLOOR - 16 + hash2(k, i) * 12;
        pRect(mx, my, 3 + hash(k) * 4, 1, hash(k + i) > .5 ? 'rgba(43,63,42,.45)' : 'rgba(29,42,30,.5)');
      }
    }
    ctx.restore();
  }

  function drawChain(x, y, len, t, phase, alpha = 1, color = BG.chain) {
    const sway = Math.sin(t * .6 + phase) * 2.4;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < len; i += 3) {
      const yy = y + i;
      const xx = x + sway * (i / len) + Math.sin(i * .55 + t * .7 + phase) * .5;
      if (i % 6 === 0) pRect(xx, yy, 2, 2, color);
      else pRect(xx + .5, yy, 1, 2, '#211d1f');
      if (i % 9 === 0) pRect(xx, yy, 1, 1, BG.chainHi);
    }
    // hook
    pRect(x + sway - 1, y + len, 3, 2, color);
    pRect(x + sway, y + len + 2, 1, 3, '#241f21');
    ctx.restore();
  }

  function drawCeiling(t) {
    const off = camera.x * .42;
    ctx.save();
    ctx.translate(-Math.floor(off), 0);
    // rough stone ceiling silhouette
    pRect(-200, 0, WORLD_W + 500, 24, '#050408');
    for (let x = -200; x < WORLD_W + 400; x += 19) {
      const r = hash(x * .39);
      const h = 4 + r * 17;
      pRect(x, 20, 20, h, '#050408');
      if (r > .55) {
        pRect(x + 3, 23, 3, 2 + r * 4, '#08070c');
        pRect(x + 12, 24, 2, 2 + r * 3, '#08070c');
      }
    }
    // crossed timber beam
    pRect(-200, 16, WORLD_W + 400, 4, '#0b0807');
    pRect(-200, 16, WORLD_W + 400, 1, '#1c1310');
    // roots that crawl down
    for (let i = 0; i < 9; i++) {
      const x = i * 167 + 39;
      const len = 9 + hash(i * 7.7) * 25;
      pLine(x, 20, x + Math.sin(i + t * .2) * 6, 20 + len, '#0a0809', 1);
      pLine(x + 2, 24, x + 7, 24 + len * .5, '#0c090a', 1);
    }
    // chains
    const chainStart = Math.floor((off - 100) / 190) - 1;
    for (let i = chainStart; i < chainStart + 6; i++) {
      const cx = i * 190 + 133;
      if (cx < off - 40 || cx > off + VW + 40) continue;
      drawChain(cx, 14, 25 + hash(i * 3.3) * 63, t, i * 2.4, .85, '#242022');
    }
    ctx.restore();
  }

  function drawTorchSconce(sx, sy, t, torch, scale = 1) {
    const fl = screenTorchFlicker(t, torch.phase);
    // wall-light bloom
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const wallGlow = ctx.createRadialGradient(sx, sy - 10, 2, sx, sy - 10, 74);
    wallGlow.addColorStop(0, `rgba(255,132,61,${.075 + fl * .03})`);
    wallGlow.addColorStop(.48, `rgba(199,84,43,${.03 + fl * .012})`);
    wallGlow.addColorStop(1, 'rgba(100,40,20,0)');
    ctx.fillStyle = wallGlow;
    ctx.fillRect(sx - 76, sy - 90, 152, 152);
    ctx.restore();
    // bracket
    pRect(sx - 3, sy + 4, 6, 2, '#2a2422');
    pRect(sx - 1, sy + 5, 2, 11, '#1b1717');
    pRect(sx - 4, sy + 15, 8, 2, '#292221');
    pRect(sx - 2, sy + 1, 4, 3, '#3b302b');
    pRect(sx - 4, sy - 3 * scale, 8, 4, '#4a3a2e');
    pRect(sx - 3, sy - 3 * scale, 6, 1, '#76583d');
    // flame layered, pixel-stepped
    const h = (8 + fl * 4) * (scale * .9 + .2);
    const w = (3.2 + fl * 1.1) * scale;
    const sway = Math.sin(t * 6.3 + torch.phase) * 1.2 + Math.sin(t * 11.2 + torch.phase * 3) * .6;
    const ox = sx + sway;
    const baseY = sy - 2 * scale;
    pPoly([
      [ox - w, baseY], [ox - w * .8, baseY - h * .35], [ox - w * .35, baseY - h * .72],
      [ox + sway * .2, baseY - h * 1.05], [ox + w * .5, baseY - h * .66],
      [ox + w * .9, baseY - h * .28], [ox + w, baseY]
    ], BG.flame0);
    pPoly([
      [ox - w * .58, baseY - 1], [ox - w * .35, baseY - h * .45],
      [ox + sway * .1, baseY - h * .74], [ox + w * .38, baseY - h * .38], [ox + w * .52, baseY - 1]
    ], BG.flame1);
    pPoly([
      [ox - w * .28, baseY - 1], [ox - w * .12, baseY - h * .42],
      [ox + sway * .06, baseY - h * .55], [ox + w * .2, baseY - h * .18], [ox + w * .2, baseY - 1]
    ], BG.flame2);
    // coals
    pRect(sx - 2, sy - 2, 5, 2, '#331c12');
    pRect(sx - 1, sy - 3, 2, 1, '#c18a46');
    // light source
    torch.sx = sx;
    torch.sy = sy;
    torch.light = fl;
    lightSources.push({ x: sx + sway * .4, y: sy - h * .5, r: 166 * scale * (.88 + fl * .16), warm: true, strength: .92 });
    farLights.push({ x: sx, y: sy - h * .5, r: 82, color: 'rgba(255,142,70,.16)' });
    // small crown of embers
    if (chance(.35)) {
      ctx.globalCompositeOperation = 'lighter';
      pRect(sx + rand(-4, 4), sy - h - rand(0, 7), 1, 1, chance(.5) ? '#ffbc5e' : '#ff7a3a');
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawTorches(t) {
    const off = camera.x * .72;
    for (const torch of torches) {
      const sx = Math.round(torch.wx - off);
      if (sx < -30 || sx > VW + 30) { torch.sx = -999; continue; }
      drawTorchSconce(sx, 113, t, torch, 1);
      // wall soot around the sconce
      ctx.save();
      ctx.globalAlpha = .28;
      ctx.fillStyle = '#030205';
      ctx.beginPath();
      ctx.ellipse(sx, 92, 15, 30, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawWallDetails(t) {
    // little candle clusters on the floor-side of the wall
    const off = camera.x * .72;
    const spans = [70, 365, 690, 1010];
    for (let i = 0; i < spans.length; i++) {
      const wx = spans[i];
      const sx = Math.round(wx - off);
      if (sx < -20 || sx > VW + 20) continue;
      const by = 209;
      for (let k = 0; k < 3; k++) {
        const x = sx + k * 4 - 3;
        const h = 3 + (k % 2);
        pRect(x, by - h, 1, h, '#d8cbb5');
        pRect(x - 1, by, 3, 1, '#5b4a3a');
        const fl = Math.sin(t * 7 + i * 2 + k) * .6;
        pRect(x, by - h - 2 + fl, 1, 2, '#ffb861');
        glow(x, by - h - 2, 8, 'rgba(255,155,80,.13)', .7);
      }
    }
    // scattered skulls and bones on the wall ledge
    for (let i = 0; i < 4; i++) {
      const wx = 260 + i * 190;
      const sx = Math.round(wx - off);
      if (sx < -20 || sx > VW + 20) continue;
      if (hash(i * 9.1) > .55) {
        pRect(sx, 206, 5, 4, '#70635a');
        pRect(sx + 1, 205, 3, 1, '#8b7d71');
        pRect(sx + 1, 207, 1, 2, '#181318');
        pRect(sx + 3, 207, 1, 2, '#181318');
      }
    }
    // ancient wall shackles
    const chainSpots = [308, 806, 1180];
    for (let i = 0; i < chainSpots.length; i++) {
      const sx = Math.round(chainSpots[i] - off);
      if (sx < -30 || sx > VW + 30) continue;
      drawChain(sx, 58, 38 + hash(i * 4.2) * 28, t, i * 2.1, .75, '#292426');
      pRing(sx + Math.sin(t * .6 + i) * 1.5, 104 + hash(i * 4.2) * 28, 3, '#3c3538');
    }
  }

  /* ------------------------- floor ------------------------- */
  function drawFloor(t) {
    ctx.save();
    ctx.translate(-Math.floor(camera.x), 0);
    // upper floor surface band
    pRect(-200, FLOOR, WORLD_W + 400, VH - FLOOR + 40, '#141016');
    pRect(-200, FLOOR, WORLD_W + 400, 2, '#312a35');
    pRect(-200, FLOOR + 2, WORLD_W + 400, 1, '#4b414f');
    pRect(-200, FLOOR + 3, WORLD_W + 400, 2, '#18131b');
    // wall base shadow
    pRect(-200, FLOOR - 4, WORLD_W + 400, 4, '#0c090f');
    // stone rows with increasing perspective spacing
    const rows = [
      { y: FLOOR + 5, h: 7, w: 35, col0: '#1c1720', col1: '#221c27', hi: '#3a323f' },
      { y: FLOOR + 12, h: 9, w: 47, col0: '#19141c', col1: '#1f1922', hi: '#342c38' },
      { y: FLOOR + 21, h: 11, w: 61, col0: '#161118', col1: '#1b151e', hi: '#2f2733' },
      { y: FLOOR + 32, h: 14, w: 79, col0: '#131016', col1: '#18131b', hi: '#29222e' }
    ];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const shift = (r % 2) * Math.round(row.w / 2);
      const j0 = Math.floor((-200 + shift) / row.w) - 1;
      const j1 = Math.ceil((WORLD_W + 300) / row.w) + 1;
      pRect(-200, row.y, WORLD_W + 500, row.h, '#09080b');
      for (let j = j0; j <= j1; j++) {
        const x = j * row.w + shift;
        const h = hash2(r * 6.7, j * 2.3);
        pRect(x + 1, row.y, row.w - 2, row.h - 1, h > .7 ? row.col1 : row.col0);
        pRect(x + 2, row.y, row.w - 4, 1, row.hi);
        pRect(x + 1, row.y + row.h - 2, row.w - 2, 1, '#060508');
        if (h > .78) {
          pRect(x + 6 + h * 12, row.y + 2, 7, 1, '#0a080c');
          pRect(x + 12 + h * 8, row.y + 4, 1, 3, '#07060a');
        }
        if (r >= 2 && h < .12) {
          pRect(x + row.w * .4, row.y + 2, 5, 1, 'rgba(54,45,43,.28)');
        }
      }
    }
    // puddles with torch reflections
    const puddles = [218, 706];
    for (const px of puddles) {
      const x = px;
      ctx.save();
      ctx.globalAlpha = .7;
      pPoly([
        [x - 26, FLOOR + 9], [x - 15, FLOOR + 6], [x + 3, FLOOR + 7], [x + 24, FLOOR + 10],
        [x + 18, FLOOR + 14], [x - 3, FLOOR + 16], [x - 20, FLOOR + 13]
      ], '#0a0c11');
      ctx.globalAlpha = .4;
      pPoly([
        [x - 15, FLOOR + 9], [x - 4, FLOOR + 7], [x + 12, FLOOR + 8], [x + 5, FLOOR + 11], [x - 10, FLOOR + 12]
      ], '#1e252d');
      ctx.restore();
      glow(x + 3, FLOOR + 11, 18, 'rgba(255,132,56,.11)', .8);
      for (let k = 0; k < 4; k++) {
        const rx = x - 13 + k * 8;
        pRect(rx, FLOOR + 9 + (k % 2), 3, 1, 'rgba(232,180,110,.18)');
      }
    }
    // debris & rubble
    for (let i = 0; i < 24; i++) {
      const x = hash(i * 12.1) * WORLD_W;
      const y = FLOOR + 6 + hash(i * 3.7) * 27;
      if (hash(i * 5.3) > .38) {
        pRect(x, y, 1 + hash(i) * 3, 1, '#2c2630');
        pRect(x, y, 2, 1, '#3b333e');
      }
    }
    // damp moss / weeds at wall base
    for (let i = 0; i < 32; i++) {
      const x = hash(i * 8.7) * WORLD_W;
      if (hash(i * 3.1) < .4) continue;
      const h = 2 + hash(i * 5.5) * 5;
      const col = hash(i * 2.2) > .5 ? '#263823' : '#1d2b1c';
      pLine(x, FLOOR + 4, x + rand(-2, 2), FLOOR + 4 - h, col, 1);
      pLine(x + 2, FLOOR + 4, x + 3, FLOOR + 3 - h * .6, col, 1);
    }
    // foreground floor darkening
    const grad = ctx.createLinearGradient(0, FLOOR + 8, 0, VH);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(.7, 'rgba(0,0,0,.23)');
    grad.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(-200, FLOOR + 8, WORLD_W + 400, VH - FLOOR);
    // small candle shrines give the hall warm islands of light
    for (let i = 0; i < 3; i++) {
      drawFloorShrine([356, 624, 872][i], t, i);
    }
    ctx.restore();
  }

  function drawFloorShrine(cx, t, seed) {
    const fl = .8 + Math.sin(t * 8.7 + seed * 2.1) * .1 + Math.sin(t * 17.3 + seed) * .05;
    // stone plinth
    pRect(cx - 7, FLOOR + 1, 14, 3, '#211b22');
    pRect(cx - 9, FLOOR + 3, 18, 2, '#171219');
    pRect(cx - 6, FLOOR + 1, 12, 1, '#382f3a');
    // ash and wax stains
    pRect(cx - 4, FLOOR, 8, 1, '#0e0b10');
    pRect(cx + 3, FLOOR + 2, 3, 1, 'rgba(190,180,150,.14)');
    // candles
    for (let k = 0; k < 4; k++) {
      const x = cx - 6 + k * 3.6;
      const h = 3 + hash(seed * 5.1 + k) * 4;
      pRect(x, FLOOR - h + 1, 1, h, '#cfc1aa');
      pRect(x, FLOOR - h + 1, 1, 1, '#9e917e');
      pRect(x, FLOOR, 2, 1, '#746451');
      const sway = Math.sin(t * 7.2 + seed * 2 + k * 1.7) * .6;
      pRect(x + sway, FLOOR - h - 1, 1, 2, k % 2 ? '#ffb35b' : '#ffe0a0');
      if (k === 1) pRect(x + sway, FLOOR - h - 2, 1, 1, '#ff8b3e');
    }
    // small incense bowl
    pRect(cx + 7, FLOOR - 2, 4, 2, '#292127');
    pRect(cx + 8, FLOOR - 3, 2, 1, '#3a2f35');
    const smoke = (t * 5 + seed * 3) % 12;
    pRect(cx + 8 + Math.sin(t * 1.4 + seed) * 1.5, FLOOR - 5 - smoke * .55, 1, 1, `rgba(170,164,151,${.12 * (1 - smoke / 12)})`);
    // warm pool
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(cx, FLOOR - 4, 1, cx, FLOOR - 4, 33);
    g.addColorStop(0, `rgba(255,166,83,${.065 + fl * .02})`);
    g.addColorStop(1, 'rgba(255,120,50,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 34, FLOOR - 38, 68, 68);
    ctx.restore();
    pRect(cx - 4, FLOOR + 2, 9, 1, 'rgba(255,166,83,.10)');
    // light source (screen coords)
    lightSources.push({
      x: Math.round(cx - camera.x), y: Math.round(FLOOR - 6),
      r: 100, warm: true, strength: .55
    });
    farLights.push({
      x: Math.round(cx - camera.x), y: FLOOR - 6, r: 42,
      color: 'rgba(255,154,75,.09)'
    });
  }

  function drawForeground(t) {
    // bottom reed silhouettes & broken stones
    ctx.save();
    ctx.translate(-Math.floor(camera.x * 1.06), 0);
    const off = camera.x * 1.06;
    for (let i = 0; i < 16; i++) {
      const x = i * 63 + 21 + hash(i * 4.1) * 30;
      if (x < off - 40 || x > off + VW + 40) continue;
      const base = VH + 3;
      const h = 7 + hash(i * 9.3) * 16;
      const sway = Math.sin(t * .9 + i) * 2;
      pLine(x, base, x + sway, base - h, '#040407', 1);
      pLine(x + 3, base, x + 3 - sway * .6, base - h * .7, '#040407', 1);
    }
    ctx.restore();
    // foreground chain on the left, slightly out of focus
    ctx.save();
    ctx.globalAlpha = .85;
    drawChain(37, -8, 104, t, .3, 1, '#08070a');
    ctx.restore();
    // drifting low mist
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const fogBands = [
      { y: FLOOR + 16, x: 90 + Math.sin(t * .11) * 40, rx: 150, ry: 13, a: .035 },
      { y: FLOOR + 25, x: 330 + Math.cos(t * .08) * 55, rx: 190, ry: 16, a: .042 },
      { y: 166, x: 200 + Math.sin(t * .06 + 2) * 80, rx: 240, ry: 28, a: .018 }
    ];
    for (const f of fogBands) {
      const g = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, Math.max(f.rx, f.ry));
      g.addColorStop(0, `rgba(122,139,153,${f.a})`);
      g.addColorStop(1, 'rgba(122,139,153,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, f.y - f.ry * 2, VW, f.ry * 4);
    }
    ctx.restore();
  }

  function drawAmbientFront(t) {
    // dust motes
    for (const m of motes) {
      const a = m.a * (.65 + Math.sin(t * .8 + m.phase) * .35);
      ctx.fillStyle = `rgba(215,203,180,${a.toFixed(3)})`;
      ctx.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size);
    }
    // embers
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of embers) {
      const a = clamp(e.life / e.max, 0, 1) * .8;
      ctx.fillStyle = e.hot ? `rgba(255,225,155,${a})` : `rgba(255,123,52,${a})`;
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }
    ctx.restore();
    // water drips
    for (const d of drips) {
      if (d.t < d.delay) continue;
      if (d.splash <= 0) {
        pRect(d.x, d.y, 1, 4, 'rgba(139,171,187,.28)');
        pRect(d.x, d.y + 4, 1, 1, 'rgba(180,208,218,.5)');
      } else {
        const a = clamp(1 - d.splash / .3, 0, 1);
        pRect(d.x - 3, d.ty, 7, 1, `rgba(126,158,174,${.18 * a})`);
        pRect(d.x - 1, d.ty - 2, 1, 2, `rgba(160,190,201,${.25 * a})`);
      }
    }
  }

  /* ------------------------- lighting pass ------------------------- */
  const lightCanvas = document.createElement('canvas');
  lightCanvas.width = VW; lightCanvas.height = VH;
  const lightCtx = lightCanvas.getContext('2d');

  function applyLighting() {
    const lc = lightCtx;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, VW, VH);
    lc.fillStyle = 'rgba(3,3,8,.49)';
    lc.fillRect(0, 0, VW, VH);
    lc.globalCompositeOperation = 'destination-out';

    for (const l of lightSources) {
      const g = lc.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, 'rgba(0,0,0,.98)');
      g.addColorStop(.35, 'rgba(0,0,0,.68)');
      g.addColorStop(.72, 'rgba(0,0,0,.24)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    for (const l of farLights) {
      const g = lc.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, 'rgba(0,0,0,.36)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    lc.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightCanvas, 0, 0);

    // warm bloom over the torches
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const torch of torches) {
      if (torch.sx < -80 || torch.sx > VW + 80) continue;
      const fl = torch.light || 1;
      const r = 74 + fl * 22;
      const g = ctx.createRadialGradient(torch.sx, torch.sy - 7, 1, torch.sx, torch.sy - 7, r);
      g.addColorStop(0, `rgba(255,180,88,${.16 + fl * .04})`);
      g.addColorStop(.4, `rgba(255,112,41,${.07 + fl * .025})`);
      g.addColorStop(1, 'rgba(255,80,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(torch.sx - r, torch.sy - 7 - r, r * 2, r * 2);
      // a faint pool of firelight on the wet floor
      const floorGlow = ctx.createRadialGradient(torch.sx, FLOOR + viewY + 6, 2, torch.sx, FLOOR + viewY + 6, 92);
      floorGlow.addColorStop(0, `rgba(255,151,72,${.05 + fl * .018})`);
      floorGlow.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = floorGlow;
      ctx.fillRect(torch.sx - 92, FLOOR + viewY - 10, 184, 52);
    }
    for (const l of farLights) {
      if (!l.color) continue;
      const r = Math.max(8, l.r);
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
      g.addColorStop(0, l.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2);
    }
    ctx.restore();
    // lift the deepest shadows just enough to read the stonework
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(27,33,46,.055)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
  }

  /* ------------------------- background master ------------------------- */
  function drawBackground(t) {
    lightSources.length = 0;
    farLights.length = 0;
    drawFarHall(t);
    drawBrickWall(t);
    drawPillars(t);
    drawWallDetails(t);
    drawTorches(t);
    drawFloor(t);
    drawCeiling(t);
  }

  function drawAtmosphereScreen(t) {
    // a soft cold haze in the upper hall
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createLinearGradient(0, 0, 0, 170);
    g.addColorStop(0, 'rgba(28,38,50,.10)');
    g.addColorStop(.7, 'rgba(20,26,34,.03)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, 175);
    ctx.restore();
  }

  /* ============================================================
     EFFECTS · the language of impact
     ============================================================ */
  const particles = [];
  const rings = [];
  const slashArcs = [];
  const waves = []; // brute（紫魇）的绿色冲击波投射物
  const bossHazards = []; // brute 的紫渊地刺（预警/破土/消退）
  const flashLines = []; // iai straight-line "vacuum blade" flashes
  let ultOrb = null; // 次元斩球状扭曲漩涡（收刀停顿期显示）
  let darkFlash = 0; // 白闪后的轻微暗场（让白更白）
  const texts = [];
  const ghosts = [];
  let flashAlpha = 0;
  let flashColor = '235,240,255';
  let hitstop = 0;

  // [PERF] 帧级特效预算与反馈合并
  let fxBudget = 0;
  const FX_BUDGET = 240;   // 每帧粒子生成预算：单目标远低于此值，多目标同帧自动分摊裁剪
  let hudDirty = false;     // HUD DOM 更新合并到帧末统一执行
  let pipsDirty = false;    // 敌人数量 DOM 更新合并到帧末统一执行
  // [PERF] 帧率自适应降载：低端机/高负载瞬间连续慢帧时，自动关闭光晕并削减
  // 粒子预算，恢复流畅后再自动回满——只在确实掉帧时生效，正常机器无感
  let glowEnable = true;
  let perfMode = 0;          // 0 = 全效，1 = 降载
  let slowFrameCount = 0;
  const PARTICLE_PASSES = [false, true]; // 常量：避免渲染循环每帧重建临时数组

  function addTrauma(v) {
    camera.trauma = clamp(camera.trauma + v, 0, 1);
  }
  function screenFlash(strength = .35, color = '235,240,255') {
    flashAlpha = Math.max(flashAlpha, strength);
    flashColor = color;
  }

  function spawnParticles(x, y, count, opts = {}) {
    // [PERF] 同帧粒子预算：多目标同帧爆发时自动裁剪数量，单目标视觉不受影响
    if (fxBudget <= 0) return;
    count = Math.min(count, fxBudget);
    fxBudget -= count;
    const {
      colors = ['#d8e8ff'], speed = [30, 110], life = [.2, .6], size = [1, 2],
      gravity = 0, drag = .2, angle = [0, TAU], additive = false, upward = false,
      jitter = 0, blood = false
    } = opts;
    for (let i = 0; i < count; i++) {
      const a = rand(angle[0], angle[1]);
      const sp = rand(speed[0], speed[1]);
      const lf = rand(life[0], life[1]);
      particles.push({
        x: x + rand(-jitter, jitter), y: y + rand(-jitter, jitter),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (upward ? rand(10, 45) : 0),
        life: lf, max: lf,
        size: randInt(size[0], size[1]),
        color: pick(colors), gravity, drag, additive, blood,
        streak: blood ? false : chance(.22), angle: a
      });
    }
  }

  function spawnDust(x, y, dir = 0, count = 3, color = 'rgba(122,110,96,') {
    for (let i = 0; i < count; i++) {
      const lf = rand(.22, .5);
      particles.push({
        x: x + rand(-3, 3), y: y - rand(0, 2),
        vx: rand(-18, 18) + dir * rand(8, 26), vy: rand(-25, -5),
        life: lf, max: lf, size: randInt(1, 2),
        color: '#675f53', gravity: 16, drag: 1.2, additive: false, dust: true
      });
    }
  }

  function hitBurst(x, y, dir, kind = 'slash') {
    const colors = kind === 'parry'
      ? ['#fff8e8', '#d9f4ff', '#ffe2a8', '#ffffff']
      : kind === 'ichor'
        ? ['#b55fc8', '#87379b', '#e08ce9', '#5b226b']
        : ['#fff4df', '#ffd27a', '#ff8a5d', '#dceaff'];
    spawnParticles(x, y, kind === 'parry' ? 16 : 12, {
      colors, speed: kind === 'parry' ? [70, 210] : [45, 150], life: [.14, .5],
      size: [1, 2], gravity: 220, drag: 1.4, angle: dir > 0 ? [-1.15, 1.15] : [Math.PI - 1.15, Math.PI + 1.15],
      additive: true, jitter: 4
    });
    if (kind !== 'ichor') {
      spawnParticles(x, y, 6, {
        colors: ['#9e2b3c', '#6e1626'], speed: [20, 80], life: [.3, .7],
        size: [1, 2], gravity: 260, drag: .7, angle: [0, TAU], additive: false, jitter: 3
      });
    }
    rings.push({ x, y, maxR: kind === 'parry' ? 31 : 16, life: 0, dur: kind === 'parry' ? .34 : .22, color: kind === 'parry' ? '#fff0cc' : '#ffd08c', thick: 1 });
    // short impact strokes
    for (let i = 0; i < (kind === 'parry' ? 7 : 4); i++) {
      particles.push({
        x: x + rand(-2, 2), y: y + rand(-2, 2),
        vx: Math.cos(dir > 0 ? rand(-1.4, 1.4) : Math.PI + rand(-1.4, 1.4)) * rand(80, 190),
        vy: Math.sin(rand(-1.4, 1.4)) * rand(30, 110),
        life: rand(.1, .22), max: .22, size: 1, color: '#fff5de',
        gravity: 0, drag: 2.5, additive: true, streak: true, angle: 0
      });
    }
  }

  function addFloatingText(x, y, text, color = '#f6e9d0', scale = 1) {
    texts.push({ x, y, text, color, scale, life: 0, dur: .72, vy: -25, vx: rand(-7, 7), shadow: '#160b10' });
  }

  function addGhost(p, red) {
    ghosts.push({
      x: p.x, y: p.y, facing: p.facing, animTime: p.animTime, runPhase: p.runPhase, runFrame: p.runFrame,
      redGhost: !!red,
      state: p.hurtT > 0 ? 'hurt' : p.parry ? 'parry' : p.dashTimer > 0 ? 'dash' : p.attack ? 'attack' : (p.onGround ? 'idle' : 'air'),
      attackIndex: p.attackIndex, attackT: p.attack ? p.attack.t : 0,
      vx: p.vx, vy: p.vy, onGround: p.onGround, alpha: .34, life: 0, dur: .22
    });
  }

  function updateEffects(dt) {
    // [PERF] 清理采用 O(1) swap-pop（顺序不敏感）：避免 splice 的 O(N) 元素搬移
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles[i] = particles[particles.length - 1]; particles.pop(); continue; }
      if (p.soul) {
        if (p.soulDelay > 0) {
          p.soulDelay -= dt;
          p.y -= 12 * dt;
          continue;
        }
        const tx = player.x;
        const ty = player.y - 24;
        const dx = tx - p.x, dy = ty - p.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        p.vx = damp(p.vx, dx / d * 170, 5, dt);
        p.vy = damp(p.vy, dy / d * 170, 5, dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (d < 12 && player.alive && gameState === 'playing') {
          player.hp = Math.min(player.maxHp, player.hp + 4);
          spawnParticles(player.x, player.y - 24, 3, {
            colors: ['#c6edc3', '#f4e5b8'], speed: [8, 35], life: [.15, .35], size: [1, 1],
            gravity: -25, drag: 1.5, angle: [0, TAU], additive: true, jitter: 2
          });
          syncHUD(true);
          particles[i] = particles[particles.length - 1]; particles.pop();
          continue;
        }
        continue;
      }
      p.vx -= p.vx * p.drag * dt;
      p.vy -= p.vy * p.drag * dt * .4;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // 二阶段滴血：落到地面即消失，不穿地、不留脏迹
      if (p.blood && p.y >= FLOOR - 1) {
        particles[i] = particles[particles.length - 1];
        particles.pop();
      }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].life += dt;
      if (rings[i].life > rings[i].dur) { rings[i] = rings[rings.length - 1]; rings.pop(); }
    }
    for (let i = slashArcs.length - 1; i >= 0; i--) {
      slashArcs[i].life += dt;
      if (slashArcs[i].life > slashArcs[i].dur) { slashArcs[i] = slashArcs[slashArcs.length - 1]; slashArcs.pop(); }
    }
    for (let i = flashLines.length - 1; i >= 0; i--) {
      flashLines[i].life += dt;
      if (flashLines[i].life > flashLines[i].dur) { flashLines[i] = flashLines[flashLines.length - 1]; flashLines.pop(); }
    }
    if (ultOrb) {
      ultOrb.t += dt;
      // 视觉进度按 dur 收束；ttl 略长，保证落鞘帧仍能读到卫星并触发爆点
      if (ultOrb.t > (ultOrb.ttl || ultOrb.dur)) ultOrb = null;
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const tx = texts[i];
      tx.life += dt;
      tx.x += tx.vx * dt;
      tx.y += tx.vy * dt;
      tx.vy += 40 * dt;
      if (tx.life > tx.dur) { texts[i] = texts[texts.length - 1]; texts.pop(); }
    }
    for (let i = ghosts.length - 1; i >= 0; i--) {
      ghosts[i].life += dt;
      if (ghosts[i].life > ghosts[i].dur) { ghosts[i] = ghosts[ghosts.length - 1]; ghosts.pop(); }
    }
    flashAlpha = Math.max(0, flashAlpha - dt * 2.8);
    if (flashAlpha < .006) flashAlpha = 0;
    darkFlash = Math.max(0, darkFlash - dt * 2.4);
    // [PERF] 特效硬上限：一次攻击命中多目标、多目标同时死亡等极端爆发帧，
    // 若数组仍被撑大（绕过预算的直接 push），在此统一截断最旧条目，
    // 防止渲染层每帧遍历量无限膨胀导致卡死。正常游玩永远不会触达上限。
    if (particles.length > 700) particles.splice(0, particles.length - 700);
    if (rings.length > 48) rings.splice(0, rings.length - 48);
    if (flashLines.length > 32) flashLines.splice(0, flashLines.length - 32);
    if (texts.length > 30) texts.splice(0, texts.length - 30);
    if (ghosts.length > 12) ghosts.splice(0, ghosts.length - 12);
    if (slashArcs.length > 8) slashArcs.splice(0, slashArcs.length - 8);
  }

  function drawSlashCrescent(s) {
    const p = clamp(s.life / s.dur, 0, 1);
    const fade = s.alpha !== undefined ? s.alpha : (1 - easeInQuad(p));
    if (fade <= .01) return;
    const span = s.a1 - s.a0;
    const N = Math.max(8, Math.min(38, Math.ceil(Math.abs(span) * s.r / 1.7)));
    const width = s.width || 7;
    const radius = s.r * (1 + p * .06);
    const outer = [];
    const inner = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = s.a0 + span * t;
      // tapered at both ends, thickest in the middle of the cut
      const taper = Math.pow(Math.sin(Math.PI * t), .62);
      const w = Math.max(.5, width * taper);
      const ca = Math.cos(a), sa = Math.sin(a);
      outer.push([s.x + ca * (radius + w * .5), s.y + sa * (radius + w * .5)]);
      inner.push([s.x + ca * (radius - w * .5), s.y + sa * (radius - w * .5)]);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * .28;
    pPoly(outer.concat(inner.reverse()), s.color);
    ctx.globalAlpha = fade * .30;
    pArc(s.x, s.y, radius, s.a0 + span * .18, s.a1 - span * .16, '#f6fdff', 1, 1, 1.2);
    ctx.restore();
  }

  // 空中下劈专属：一层全实心的挥砍月牙——不是多条分离的弧线，而是单个
  // 实心弧面内部做多层颜色嵌套（冷蓝外 → 亮蓝 → 白核 → 淡红芯），层次
  // 丰富；两端收尖、中段厚实，呈现刀刃从上至下劈开空气的重量感。
  function drawAerialSlamArc(s) {
    const p = clamp(s.life / s.dur, 0, 1);
    const fade = 1 - easeInQuad(p);
    if (fade <= .01) return;
    const span = s.a1 - s.a0;
    const N = Math.max(10, Math.min(48, Math.ceil(Math.abs(span) * s.r / 1.4)));
    const radius = s.r * (1 + p * .05);
    const width = s.width || 14;
    // 由外到内嵌套层：同一实心月牙内的颜色层次
    const layers = [
      { m: 1.0, a: .16, c: '#6f9fe8' },
      { m: .62, a: .30, c: '#a8d0ff' },
      { m: .38, a: .85, c: '#ffffff' },
      { m: .22, a: .45, c: '#ffd9de' }
    ];
    for (const lay of layers) {
      const outer = [], inner = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const a = s.a0 + span * t;
        const taper = Math.pow(Math.sin(Math.PI * t), .55);
        const w = Math.max(.3, width * lay.m * taper * .5);
        const ca = Math.cos(a), sa = Math.sin(a);
        outer.push([s.x + ca * (radius + w), s.y + sa * (radius + w)]);
        inner.push([s.x + ca * (radius - w), s.y + sa * (radius - w)]);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * lay.a;
      pPoly(outer.concat(inner.reverse()), lay.c);
      ctx.restore();
    }
    // 刃口白线：沿弧心划过，强化切割感
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * .5;
    pArc(s.x, s.y, radius, s.a0 + span * .16, s.a1 - span * .14, '#ffffff', 1, 1, 1.2);
    ctx.restore();
  }

  // [MOD 5] iai "vacuum blade": ultra-thin straight-line flashes, no arc.
  // Each flash is a full-length polygon the instant it spawns — only alpha and
  // width decay, so the cut reads as a single razor line tearing the air.
  // 单发居合的“剑气多边形”：极度锐利、细长，带 Z 轴透视纵深感（近大远小）。
  // 顶点沿刀光长度 t 采样：宽度按透视幂律迅速收窄，尖端收成一个锐利点；
  // 两侧微弯成月牙形，配合多层叠加与近端白热 glow，制造“空间被割裂”的
  // 立体感——宽亮处仿佛在屏幕深处，锐尖切向背景。
  function buildRiftPoly(f, m, off = 0) {
    const ca = Math.cos(f.angle), sa = Math.sin(f.angle);
    const hx = -sa, hy = ca; // perpendicular to the tear
    const N = 7;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const w = f.w0 * Math.pow(1 - t, 1.8) * m;
      const crv = 3.2 * t * t;
      pts.push([f.x + ca * f.len * t + hx * (w + crv + off), f.y + sa * f.len * t + hy * (w + crv + off)]);
    }
    for (let i = N - 1; i >= 0; i--) {
      const t = i / (N - 1);
      const w = f.w0 * Math.pow(1 - t, 1.8) * m;
      const crv = 3.2 * t * t;
      pts.push([f.x + ca * f.len * t + hx * (-w + crv + off), f.y + sa * f.len * t + hy * (-w + crv + off)]);
    }
    return pts;
  }

  function drawIaiFlash(f) {
    const prog = clamp(f.life / f.dur, 0, 1);
    const fade = 1 - easeOutCubic(prog);
    if (fade <= .01) return;
    const shrink = 1 - prog * .5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // 三层：冷蓝外晕 → 冷蓝白主体 → 纯白内核（同一道细长透视多边形，近宽远尖）
    const layers = [
      { m: 2.7, a: .10, c: '#7db8ff' },
      { m: 1.7, a: .32, c: f.edge },
      { m: 1, a: .92, c: f.color }
    ];
    for (const lay of layers) {
      ctx.globalAlpha = fade * lay.a;
      pPoly(buildRiftPoly(f, lay.m * shrink, 0), lay.c);
    }
    // 极细红勾边：贴在刀光一侧，若有若无——杀意，不是光波
    ctx.globalAlpha = fade * .16;
    pPoly(buildRiftPoly(f, .5 * shrink, 6), '#ff4a5a');
    // 近端（刀根/刀头）白热——近处极亮
    glow(f.x, f.y, 15 + 7 * shrink, 'rgba(255,255,255,.55)', fade * .85);
    glow(f.x, f.y, 28, 'rgba(140,195,255,.22)', fade * .7);
    ctx.restore();
  }

  // 空中下劈（Aerial Slam）的专属斩痕：从角色头顶/肩部向前下方划出的
  // 半圆弧月牙——有弧度、有厚度，刀刃从上至下撕裂空气的重量感。
  // 单条全实心弧面（冷蓝外 → 亮蓝 → 白核 → 淡红芯），白蓝为主、血红点缀。
  // 旋转方向：面朝右（facing +1）为顺时针，面朝左（facing -1）为逆时针。
  function spawnAerialFlash(p) {
    const facing = p.facing;
    // 弧的方向：头顶 → 前下方（世界角，y 轴向下为正）
    // 朝右顺时针扫（-2.4 → 1.08）；朝左逆时针扫（-0.74 → -4.22，即终点等价 2.06）
    const a0 = facing > 0 ? -2.4 : -0.74;
    const a1 = facing > 0 ? 1.08 : -4.22;
    // 圆心：角色肩部/头顶区域，弧从身体一侧划向前下方
    const cx = p.x + facing * 8, cy = p.y - 30;
    // 单条全实心月牙：内部多层颜色嵌套（冷蓝外 → 亮蓝 → 白核 → 淡红芯）
    // dur 拉长到 .48：刀光持续跟随角色下落到地面，落地前一直可见
    slashArcs.push({
      x: cx, y: cy, r: 54, a0, a1,
      color: '#ffffff', width: 15, life: 0, dur: .48,
      solid: true
    });
    // 记录弧引用：下落过程中每帧更新圆心，让斩痕跟着角色劈到地面
    p._aerialArc = slashArcs[slashArcs.length - 1];
    // 血雾：沿弧线分布，向后高速喷射——紧贴挥砍轨迹
    for (let i = 0; i < 8; i++) {
      const tt = Math.pow(Math.random(), 1.4);
      const aa = a0 + (a1 - a0) * tt;
      const rr = 51 + rand(-3, 3);
      const bx = cx + Math.cos(aa) * rr;
      const by = cy + Math.sin(aa) * rr;
      spawnParticles(bx, by, i === 0 ? 6 : 3, {
        colors: ['#ff5a5a', '#a81c30', '#5c1020', '#1a0a0c'],
        speed: [28, 90], life: [.12, .3], size: [1, 2],
        gravity: 80, drag: 2.4, angle: [aa + Math.PI - .45, aa + Math.PI + .45], additive: true, jitter: 4
      });
    }
  }

  // 次元斩出刀帧：几颗“压缩的小圆球”凭空出现，球内是待爆的白色斩线。
  // 不再是大球 + 红色轨道环，整体走维吉尔式冷白/冰蓝。
  function spawnUltOrb(p) {
    const count = perfMode ? 2 : ULT_TUNING.orbs;
    const defs = [
      { dx: 44, dy: -2, r: 10 },
      { dx: 64, dy: -13, r: 8.5 },
      { dx: 82, dy: 2, r: 7.5 },
      { dx: 98, dy: -8, r: 6 }
    ];
    const orbs = [];
    for (let i = 0; i < Math.min(count, defs.length); i++) {
      const d = defs[i];
      orbs.push({
        x: p.x + p.facing * d.dx,
        y: p.y - 30 + d.dy,
        r: d.r,
        phase: rand(0, TAU),
        spin: (chance(.5) ? 1 : -1) * rand(.5, 1.2),
        tilt: rand(-.9, .9)
      });
    }
    const visualDur = ATTACKS[p.attackIndex].ultDelay || .4;
    ultOrb = {
      x: p.x + p.facing * 70, y: p.y - 30,
      t: 0, dur: visualDur, ttl: visualDur + .15,
      seed: Math.random() * 100,
      orbs
    };
  }

  // 出刀帧：一道极短的冷白拔刀线 + 小冲击环。没有红色轨道，也不产生伤害。
  function spawnUltCut(p) {
    const cx = p.x + p.facing * 52, cy = p.y - 30;
    for (const dir of [1, -1]) {
      flashLines.push({
        x: cx, y: cy, angle: dir > 0 ? 0 : Math.PI, len: rand(78, 96), w0: rand(2.4, 3.4),
        color: '#ffffff', edge: '#bfe4ff', life: 0, dur: rand(.20, .26)
      });
      flashLines.push({
        x: cx, y: cy, angle: dir > 0 ? -.34 : Math.PI + .34, len: rand(52, 72), w0: rand(1.6, 2.4),
        color: '#eaf8ff', edge: '#7db8ff', life: 0, dur: .22
      });
    }
    rings.push({ x: cx, y: cy, maxR: 24, life: 0, dur: .16, color: '#dff2ff', thick: 1 });
    spawnParticles(cx, cy, 8, {
      colors: ['#ffffff', '#bfe0ff', '#7db8ff'], speed: [40, 130],
      life: [.10, .26], size: [1, 2], gravity: 0, drag: 2,
      angle: [0, TAU], additive: true, jitter: 4
    });
    screenFlash(.06, '235,245,255');
    addTrauma(.12);
  }

  // 落鞘帧：每颗小圆球在刀入鞘的同一帧炸开成一簇白色斩线。
  function burstUltCut(p) {
    const orb = ultOrb;
    const fallback = {
      x: p.x + p.facing * 70, y: p.y - 30,
      orbs: [{ x: p.x + p.facing * 60, y: p.y - 30, r: 8, phase: 0, spin: 1, tilt: 0 }]
    };
    const src = orb || fallback;
    const cx = src.x, cy = src.y;
    const orbs = src.orbs || [];

    // 每颗小圆球炸出一组“三轴平行斩线”，像被刀围成的立方体切碎
    for (const ob of orbs) {
      const pos = ultOrbPoint(src, ob);
      const n = ULT_TUNING.slashesPerOrb;
      const baseA = rand(0, TAU);
      const axes = [0, Math.PI / 3, 2 * Math.PI / 3];
      for (let k = 0; k < n; k++) {
        const a = baseA + axes[k % axes.length];
        const off = (k % 2 ? 1 : -1) * rand(2.5, 4.5);
        flashLines.push({
          x: pos.x + Math.cos(a + Math.PI / 2) * off,
          y: pos.y + Math.sin(a + Math.PI / 2) * off,
          angle: a, len: rand(40, 96), w0: rand(1.6, 3.0),
          color: '#ffffff', edge: '#9fd0ff', life: 0, dur: rand(.24, .36)
        });
      }
      rings.push({ x: pos.x, y: pos.y, maxR: rand(24, 38), life: 0, dur: .30, color: '#dff2ff', thick: 1 });
      // 球心白核
      for (let k = 0; k < 2; k++) {
        particles.push({
          x: pos.x, y: pos.y,
          vx: rand(-14, 14), vy: rand(-14, 14),
          life: rand(.05, .09), max: .09, size: randInt(2, 3),
          color: '#ffffff', gravity: 0, drag: 4, additive: true, star: true
        });
      }
      // 冷白/冰蓝/淡紫碎光
      for (let k = 0; k < ULT_TUNING.shardsPerOrb; k++) {
        const a = rand(0, TAU), sp = rand(60, 190);
        particles.push({
          x: pos.x, y: pos.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .7 - 14,
          life: rand(.22, .60), max: .60, size: randInt(1, 2),
          color: pick(['#ffffff', '#eaf6ff', '#bfe4ff', '#8fc4ff', '#8b6cff']),
          gravity: 30, drag: 1.15, additive: true, star: k === 0
        });
      }
    }

    // 两道贯穿大斩线：收束画面，不抢小球的戏
    if (ULT_TUNING.globalCuts > 0) {
      flashLines.push({
        x: cx - 110, y: cy, angle: 0, len: 220, w0: 1.6,
        color: '#eaf8ff', edge: '#7db8ff', life: 0, dur: .34
      });
    }
    if (ULT_TUNING.globalCuts > 1) {
      flashLines.push({
        x: cx, y: cy - 82, angle: Math.PI / 2, len: 164, w0: 1.2,
        color: '#dff2ff', edge: '#9fd0ff', life: 0, dur: .30
      });
    }
    // 落鞘后残留的冷色空间裂纹
    for (let i = 0; i < ULT_TUNING.scars; i++) {
      flashLines.push({
        x: cx, y: cy, angle: -1.1 + i * 2.2, len: 110, w0: 1.1,
        color: '#bfe4ff', edge: '#7db8ff', life: 0, dur: .50
      });
    }

    // 冲击波：只保留白 / 冰蓝，不再有红环
    const shockDefs = [
      { maxR: 90, dur: .45, color: '#ffffff' },
      { maxR: 62, dur: .55, color: '#9fc8ff' }
    ];
    for (let i = 0; i < Math.min(ULT_TUNING.shockwaves, shockDefs.length); i++) {
      const sd = shockDefs[i];
      rings.push({ x: cx, y: cy, maxR: sd.maxR, life: 0, dur: sd.dur, color: sd.color, thick: 1 });
    }

    // 冷色浮尘：向上飘散
    spawnParticles(cx, cy, ULT_TUNING.motes, {
      colors: ['#bfe0ff', '#eaf6ff', '#7db8ff', '#8b6cff'], speed: [8, 40],
      life: [.7, 1.2], size: [1, 1], gravity: -24, drag: .9,
      angle: [-Math.PI, 0], additive: true, jitter: 16, upward: true
    });

    // 落鞘的重量
    hitstop = Math.max(hitstop, ULT_TUNING.hitstop);
    addTrauma(ULT_TUNING.trauma);
    screenFlash(ULT_TUNING.flash, '255,255,255');
    darkFlash = ULT_TUNING.dark;
  }

  // 小圆球的漂浮位置：每颗球独立呼吸/漂移
  function ultOrbPoint(o, orb) {
    const t = o.t || 0;
    return {
      x: orb.x + Math.cos(t * 1.1 + orb.phase) * 1.4,
      y: orb.y + Math.sin(t * 2.4 + orb.phase) * 1.2
    };
  }

  // 维吉尔式“小圆球次元斩”：每颗球是深色内核 + 两层细冷光环 +
  // 球内被压缩的白色斩线；最后 22% 收缩，落鞘帧炸开。
  function drawUltOrb(o) {
    const p = clamp(o.t / o.dur, 0, 1);
    const grow = easeOutCubic(Math.min(1, p * 4));
    const imp = smoothstep(.78, 1, p);
    const scale = 1 - .42 * imp;
    ctx.save();
    for (const orb of (o.orbs || [])) {
      const pos = ultOrbPoint(o, orb);
      const r = orb.r * grow * scale;
      if (r < .6) continue;
      // 深色内核：小圆球的黑心
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = .95;
      pCircle(pos.x, pos.y, r, '#03050a');
      ctx.globalAlpha = .28;
      pCircle(pos.x, pos.y, r + 2, 'rgba(8,14,26,.55)');

      // 冷光与表面细环
      ctx.globalCompositeOperation = 'lighter';
      glow(pos.x, pos.y, r * 3.6, 'rgba(110,175,255,.38)', .16 + .14 * imp);
      ctx.globalAlpha = .30 + .26 * imp;
      pRing(pos.x, pos.y, r, '#cfeaff');
      const rn = ULT_TUNING.orbRings;
      for (let k = 0; k < rn; k++) {
        const rot = o.t * orb.spin * (k ? -1 : 1) + orb.tilt + k * 1.1;
        ctx.globalAlpha = .30 + .30 * imp;
        ctx.strokeStyle = k ? '#9fd0ff' : '#ffffff';
        ctx.lineWidth = k ? 1 : 1.4;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, r * (1.10 + k * .30), r * (.58 + k * .14), rot, 0, TAU);
        ctx.stroke();
      }

      // 球内被压缩的斩线：落鞘前一直在转
      ctx.globalAlpha = .55 + .30 * imp;
      ctx.strokeStyle = '#eaf8ff';
      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const a = o.t * 1.9 + orb.phase + k * (TAU / 3);
        const dx = Math.cos(a) * r * .88, dy = Math.sin(a) * r * .52;
        ctx.beginPath();
        ctx.moveTo(pos.x - dx, pos.y - dy);
        ctx.lineTo(pos.x + dx, pos.y + dy);
        ctx.stroke();
      }

      // 白核
      ctx.globalAlpha = .9;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(pos.x) - 1, Math.round(pos.y) - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // 出刀帧生成单发居合的斩痕：一道细长、锐利、带透视的冷光（近宽远尖）。
  // 起点 = 出刀瞬间的刀头（刀尖），再沿刀身向斜下微调 3px——光轨从武士刀
  // 的刀头边缘开始，与刀身真正衔接，再连贯甩向前方。
  function spawnIaiFlash(p) {
    const def = ATTACKS[p.attackIndex];
    // 斩痕方向 = 刀的定格角度（endAngle）——完美贴合刀锋切出的路径
    const fx = Math.cos(def.endAngle) * p.facing, fy = Math.sin(def.endAngle);
    const ang = Math.atan2(fy, fx);
    // 起点 = 刀头（刀尖）世界坐标，向斜下（刀柄方向）回落 3px
    const tip = getSwordPose(p).tipWorld;
    const wx = tip.x - fx * 3;
    const wy = tip.y - fy * 3;
    // 主剑气：一道，细长锐利，从刀头出发
    flashLines.push({
      x: wx, y: wy, angle: ang, len: 74, w0: 6.5,
      color: '#ffffff', edge: '#e6f4ff', life: 0, dur: .22
    });
    // 残影拉丝：更细更淡的余光，贴在其后消散
    flashLines.push({
      x: wx - fx * 4, y: wy - fy * 4, angle: ang, len: 56, w0: 1.4,
      color: '#e6f4ff', edge: '#e6f4ff', life: .01, dur: .15
    });
    // 长白光：与小紫怪（裂爪者）同长（≈100px），以角色为中点、前后各半，
    // 与主剑气平行重叠——白光横贯角色身前身后，出刀瞬间气场拉满
    flashLines.push({
      x: p.x - fx * 50, y: wy - fy * 50, angle: ang, len: 100, w0: 2.4,
      color: '#ffffff', edge: '#e6f4ff', life: .008, dur: .18
    });
    // 血雾：紧贴刀光轨迹、从刀头沿刃线高速向后喷射（绝不独立飘带）
    for (let i = 0; i < 9; i++) {
      const tt = Math.pow(Math.random(), 1.6);
      const bx = wx + fx * (2 + tt * 62);
      const by = wy + fy * (2 + tt * 62);
      spawnParticles(bx, by, i === 0 ? 7 : 3, {
        colors: ['#ff5a5a', '#a81c30', '#5c1020', '#1a0a0c'],
        speed: [28, 90], life: [.12, .3], size: [1, 2],
        gravity: 80, drag: 2.4, angle: [ang + Math.PI - .45, ang + Math.PI + .45], additive: true, jitter: 4
      });
    }
  }

  function drawWorldEffects(viewX, viewY) {
    ctx.save();
    ctx.translate(-viewX, viewY);
    // slash crescents — thick in the middle, sharp at both ends
    for (const s of slashArcs) (s.solid ? drawAerialSlamArc : drawSlashCrescent)(s);
    // iai vacuum-blade flashes — the razor cuts
    for (const f of flashLines) drawIaiFlash(f);
    // 次元斩球状扭曲漩涡（世界坐标）
    if (ultOrb) drawUltOrb(ultOrb);
    // rings
    for (const r of rings) {      const p = clamp(r.life / r.dur, 0, 1);
      const radius = lerp(2, r.maxR, easeOutQuint(p));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - p) * .9;
      pRing(r.x, r.y, radius, r.color);
      if (r.maxR > 24) {
        ctx.globalAlpha = (1 - p) * .35;
        pRing(r.x, r.y, radius * .72, '#ffffff');
      }
      ctx.restore();
    }
    // green shockwave projectiles — brute's cast wave
    for (const w of waves) {
      const pulse = .7 + .3 * Math.sin(w.life * 42);
      const spin = w.life * 6 + (w.seed || 0);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(w.x, w.y, w.r * 3.1, 'rgba(96,255,140,.22)', .9);
      ctx.globalAlpha = .55 * pulse;
      pRing(w.x, w.y, w.r * 1.5, '#5eff8a');
      pRing(w.x, w.y, w.r, '#7dffb0');
      pRing(w.x, w.y, w.r * .68, '#eafff0');
      pRing(w.x, w.y, w.r * .36, '#ffffff');
      // rotating slash spokes
      ctx.globalAlpha = .45 + .25 * pulse;
      for (let i = 0; i < 6; i++) {
        const a = spin + i * (TAU / 6);
        const r0 = w.r * (.36 + .08 * pulse);
        const r1 = w.r * (1.08 + .08 * pulse);
        pLine(
          w.x + Math.cos(a) * r0, w.y + Math.sin(a) * r0,
          w.x + Math.cos(a) * r1, w.y + Math.sin(a) * r1,
          i % 2 ? '#c8ffde' : '#5eff8a', 1
        );
      }
      // trailing after-ring
      ctx.globalAlpha = .18;
      pRing(w.x - sign(w.vx) * 7, w.y, w.r * .92, '#7dffb0');
      ctx.globalAlpha = .8;
      pRect(w.x - 2, w.y - 2, 4, 4, `rgba(220,255,235,${pulse})`);
      pRect(w.x - 1, w.y - 1, 2, 2, '#ffffff');
      ctx.restore();
    }
    // brute 裂影突袭：落点法阵与冲刺虚线
    for (const e of enemies) if (e.state === 'rift') drawRiftTarget(e);
    // brute 紫渊裂地：预警法阵 / 破土地刺
    drawBossHazards();
    // particles — normal first, additive second
    for (const pass of PARTICLE_PASSES) {
      for (const p of particles) {
        if (!!p.additive !== pass) continue;
        const alpha = clamp(p.life / p.max, 0, 1);
        ctx.globalAlpha = p.dust ? alpha * .5 : alpha;
        ctx.fillStyle = p.color;
        if (p.star) {
          // 十字星形粒子：横竖两段亮十字，向外飞散
          ctx.globalAlpha = alpha * .95;
          const s = p.size + 1;
          ctx.fillRect(Math.round(p.x) - s, Math.round(p.y) - 1, s * 2, 2);
          ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - s, 2, s * 2);
        } else if (p.streak) {
          const dx = p.vx * .02, dy = p.vy * .02;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.abs(dx)), Math.max(1, Math.abs(dy)));
        } else {
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
      }
    }
    ctx.globalAlpha = 1;
    // floating pixel text
    for (const tx of texts) {
      const alpha = 1 - smoothstep(.55, 1, tx.life / tx.dur);
      ctx.globalAlpha = alpha;
      drawPixelText(tx.text, tx.x, tx.y, tx.scale, tx.color, 'center', '#1a0b12');
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawFlash() {
    if (flashAlpha > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(${flashColor},${flashAlpha * .55})`;
      ctx.fillRect(0, 0, VW, VH);
      ctx.restore();
    }
    // 白闪后的轻微暗场：紧随的一帧暗色覆盖，让白更白
    if (darkFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(2,4,12,${Math.min(.42, darkFlash)})`;
      ctx.fillRect(0, 0, VW, VH);
      ctx.restore();
    }
  }

  /* ============================================================
     PLAYER · 孤刃 / KOHJIN
     ============================================================ */
  const RUN_SPEED = 118;
  const GRAVITY = 900;
  const JUMP_V = -316; // [MOD] 跳跃高度 1.5 倍：首跳峰值 37px → 55.5px
  const DASH_TIME = .2; // [MOD] shift 瞬移位移 ≈ 49px = 两个怪物宽度（stalker 22 + brute 27）
  const DASH_SPEED = 636; // [MOD] shift 瞬移距离翻倍：≈98.6px（原 49px → 两个怪物宽度的两倍）
  // [ULT] 次元斩表现层的统一调参：维吉尔式“小圆球次元斩”。
  // 冷白/冰蓝为主，不再有红色圆环与红色爆点。
  const ULT_TUNING = {
    orbs: 4,             // 小圆球数量
    orbRings: 2,         // 每颗球的光环层数
    slashesPerOrb: 6,    // 每颗球炸开的斩线数
    shardsPerOrb: 6,     // 每颗球炸出的碎光
    globalCuts: 2,       // 贯穿大斩线
    scars: 2,            // 落鞘后残留的空间裂纹
    shockwaves: 2,       // 冲击波层数
    motes: 14,           // 冷色浮尘
    flash: .20,          // 落鞘白闪强度
    trauma: .70,         // 落鞘震屏
    hitstop: .09,        // 落鞘顿帧
    dark: .10            // 爆闪后的暗场
  };

  function ultBurstTime(def = ATTACKS[2]) {
    return def.startup + (def.ultDelay || .4);
  }

  const ATTACKS = [
    // 单发居合拔刀斩: 极短蓄力深蹲 → 0.08s 肉眼难辨的出刀 → 前方定格收刀势。
    // 无连招、无回环，只有一条直线（或极小弧度）的横向/斜向斩。
    {
      dur: .34, startup: .11, activeEnd: .19, reach: 66, dmg: 24, kb: 135, step: 96,
      windAngle: 3.05, endAngle: -0.26, holdAngle: .72,
      handWind: [-8, -15], handStrike: [16, -26], handHold: [12, -23]
    },
    // 空中下劈（Aerial Slam）: 拔刀高举过顶 → 一帧瞬切向前下方猛劈 →
    // 刀光跟随角色下落到地面，落地瞬间劈地板（顿帧+震屏+尘土冲击环）。
    {
      dur: .62, startup: .09, activeEnd: .30, reach: 84, dmg: 28, kb: 170, step: 40,
      windAngle: 2.9, endAngle: 0.98, holdAngle: 1.25,
      handWind: [4, -30], handStrike: [22, -4], handHold: [15, -8]
    },
    // 次元斩（U 键大招）: 0.6s 站定蓄力（红光凝刀、深蹲前倾如发令蓄势）→
    // 出刀 + 球团展开 → 0.74s 起收刀 → 1.00s 刀完全入鞘的同一帧球团内爆并炸开
    // （范围内敌人统一结算）→ 0.8s 收势。总 dur 1.80s 不变。
    // sheathHold: 出刀后保持余势的时长；sheathDur: 刀鞘迎向刀身、完成入鞘的时长。
    // noMove: 全程定身；hitHeight: 扇形判定高度放宽到大范围。
    {
      dur: 1.80, startup: .60, activeEnd: .66, ultDelay: .40, reach: 132, dmg: 40, kb: 150, step: 0,
      windAngle: 3.2, endAngle: -.2, holdAngle: 2.7,
      handWind: [-10, -18], handStrike: [18, -30], handHold: [4, -16],
      sheathHold: .08, sheathDur: .12,
      noMove: true, hitHeight: 90
    }
  ];
  const IDLE_SWORD_ANGLE = 2.42;

  // [MOD 2] 10-frame run keyframes — hardcoded leg poses (sprite space:
  // x+ forward, y- up; origin = player feet center). Per frame:
  //   bkx/bky = back-leg knee, bfx/bfy = back-leg foot,
  //   fkx/fky = front-leg knee, ffx/ffy = front-leg foot,
  //   bob = body vertical offset (y- up), arm = back-arm swing offset.
  // Frames 5-9 are the exact mirror of frames 0-4 (half-cycle swap), so the
  // stride reads as a crisp 10-frame cycle with zero interpolation.
  const RUN_FRAMES = [
    { bkx: 4,  bky: -8,  bfx: 10,  bfy: 0,   fkx: -4,  fky: -8,  ffx: -10, ffy: 0,   bob: -2.2, arm: -3 },
    { bkx: 3,  bky: -9,  bfx: 7,   bfy: -1,  fkx: -3,  fky: -9,  ffx: -7,  ffy: -1,  bob: -1.5, arm: -2 },
    { bkx: 0,  bky: -10, bfx: 2,   bfy: -4,  fkx: 0,   fky: -10, ffx: -2,  ffy: -4,  bob: -0.5, arm: 1 },
    { bkx: -2, bky: -11, bfx: -2,  bfy: -6,  fkx: 2,   fky: -11, ffx: 2,   ffy: -6,  bob: -0.8, arm: 3 },
    { bkx: -4, bky: -9,  bfx: -7,  bfy: -3,  fkx: 4,   fky: -9,  ffx: 7,   ffy: -3,  bob: -1.7, arm: 2 },
    { bkx: -4, bky: -8,  bfx: -10, bfy: 0,   fkx: 4,   fky: -8,  ffx: 10,  ffy: 0,   bob: -2.2, arm: 3 },
    { bkx: -3, bky: -9,  bfx: -7,  bfy: -1,  fkx: 3,   fky: -9,  ffx: 7,   ffy: -1,  bob: -1.5, arm: 2 },
    { bkx: 0,  bky: -10, bfx: -2,  bfy: -4,  fkx: 0,   fky: -10, ffx: 2,   ffy: -4,  bob: -0.5, arm: -1 },
    { bkx: 2,  bky: -11, bfx: 2,   bfy: -6,  fkx: -2,  fky: -11, ffx: -2,  ffy: -6,  bob: -0.8, arm: -3 },
    { bkx: 4,  bky: -9,  bfx: 7,   bfy: -3,  fkx: -4,  fky: -9,  ffx: -7,  ffy: -3,  bob: -1.7, arm: -2 }
  ];

  const player = {
    x: 356, y: FLOOR, vx: 0, vy: 0, facing: 1,
    onGround: true, coyote: 0, jumpBuffer: 0, airDash: true, airJumpUsed: false,
    hp: 100, maxHp: 100, alive: true, invuln: 0, hurtT: 0, deathT: 0,
    attack: null, attackIndex: 0, attackChainTimer: 0,
    parry: false, parryT: 0, parryCd: 0, counterTimer: 0,
    dashTimer: 0, dashCd: 0, dashDir: 1, ghostTimer: 0,
    animTime: 0, runPhase: 0, runFrame: 0, runAcc: 0, stepDist: 0, footToggle: 0,
    deflects: 0, combo: 0, comboTimer: 0, maxCombo: 0, kills: 0,
    flashT: 0, comboPop: 0,
    _eyeGlow: null, _tipGlow: null
  };

  function resetPlayer(x = 356) {
    Object.assign(player, {
      x, y: FLOOR, vx: 0, vy: 0, facing: 1,
      onGround: true, coyote: 0, jumpBuffer: 0, airDash: true, airJumpUsed: false,
      hp: 100, maxHp: 100, alive: true, invuln: 0, hurtT: 0, deathT: 0,
      attack: null, attackIndex: 0, attackChainTimer: 0,
      parry: false, parryT: 0, parryCd: 0, counterTimer: 0,
      dashTimer: 0, dashCd: 0, dashDir: 1, ghostTimer: 0,
      animTime: 0, runPhase: 0, runFrame: 0, runAcc: 0, stepDist: 0, footToggle: 0,
      deflects: 0, combo: 0, comboTimer: 0, maxCombo: 0, kills: 0,
      flashT: 0, comboPop: 0,
      _eyeGlow: null, _tipGlow: null
    });
  }

  function tryJump() {
    if (gameState !== 'playing' || !player.alive || player.hurtT > 0) return;
    if (player.onGround || player.coyote > 0) {
      // 地面起跳：重置二段跳可用
      player.airJumpUsed = false;
      doJump(false);
    } else if (!player.airJumpUsed) {
      // [MOD] 二段跳：空中额外一段上冲
      player.airJumpUsed = true;
      doJump(true);
    } else {
      player.jumpBuffer = .13;
    }
  }
  function doJump(air = false) {
    if (!player.alive) return;
    player.vy = air ? JUMP_V * .92 : JUMP_V;
    player.onGround = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    player.dashTimer = 0;
    if (air) {
      // 二段跳：脚下爆开一道上冲气流
      spawnParticles(player.x, player.y + 8, 7, {
        colors: ['#8fb8d8', '#5a7290', '#e8f4ff'], speed: [40, 110],
        life: [.14, .3], size: [1, 2], gravity: 160, drag: 2.2,
        angle: [Math.PI * .55, Math.PI * 1.45], additive: true, jitter: 4
      });
      Sound.noise(.08, .024, 'highpass', 1000, 2400, 0, .7);
      addTrauma(.05);
    } else {
      Sound.jump();
      spawnDust(player.x, FLOOR + 1, -player.facing, 4);
      addTrauma(.035);
    }
  }

  function tryDash() {
    const p = player;
    if (gameState !== 'playing' || !p.alive || p.hurtT > 0 || p.dashCd > 0 || (p.attack && p.attackIndex === 2)) return;
    if (!p.onGround && !p.airDash) return;
    if (p.dashTimer > 0) return;
    const left = keys.has('KeyA') || keys.has('ArrowLeft');
    const right = keys.has('KeyD') || keys.has('ArrowRight');
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    p.dashDir = dir || p.facing;
    p.facing = p.dashDir;
    p.attack = null;
    p.attackChainTimer = 0;
    p.parry = false;
    p.dashTimer = DASH_TIME;
    p.dashCd = .34;
    p.ghostTimer = 0;
    p.invuln = Math.max(p.invuln, .23);
    if (!p.onGround) { p.airDash = false; p.vy = 0; }
    p.vx = p.dashDir * DASH_SPEED;
    Sound.dash();
    addTrauma(.10);
    spawnDust(p.x, p.onGround ? FLOOR + 1 : p.y, -p.dashDir, 6);
    spawnParticles(p.x, p.y - 20, 5, {
      colors: ['#57647a', '#2c3444', '#8391a7'], speed: [20, 90],
      life: [.12, .32], size: [1, 1], gravity: 0, drag: 2.2,
      angle: p.dashDir > 0 ? [Math.PI - .5, Math.PI + .5] : [-.5, .5], additive: false, jitter: 6
    });
  }

  function tryParry() {
    const p = player;
    if (gameState !== 'playing' || !p.alive || p.hurtT > 0 || p.dashTimer > 0 || p.parryCd > 0 || p.parry || (p.attack && p.attackIndex === 2)) return;
    p.attack = null;
    p.attackChainTimer = 0;
    p.parry = true;
    p.parryT = 0;
    p.parryCd = .52;
    p.vx *= .3;
    Sound.noise(.09, .026, 'highpass', 2500, 4200, 0, .8);
    // ready glint
    const tip = getSwordPose().tipWorld;
    spawnParticles(tip.x, tip.y, 3, {
      colors: ['#dff5ff', '#ffffff'], speed: [6, 28], life: [.12, .26], size: [1, 1],
      gravity: 0, drag: 1, angle: [0, TAU], additive: true, jitter: 2
    });
  }

  function isParryActive() {
    // [MOD 3] tightened deflect window: the K press only reads as a perfect
    // deflect for 200 ms — hit it on the warning flash, not before.
    return player.parry && player.parryT <= .20 && player.hurtT <= 0;
  }

  function tryUlt() {
    const p = player;
    if (gameState !== 'playing' || !p.alive || p.hurtT > 0 || p.dashTimer > 0 || p.parry || p.attack) return;
    if (!p.onGround) return; // 空中按 U 无效：不消耗、不进入任何状态
    beginAttack(2);
  }

  function tryAttack() {
    const p = player;
    if (gameState !== 'playing' || !p.alive || p.hurtT > 0 || p.dashTimer > 0 || p.parry) return;
    if (p.attack) {
      // single iai: buffer one re-draw, it fires the instant the cut resolves
      if (p.attack.t > .05) p.attack.queued = true;
      return;
    }
    // [MOD] 空中按 J 触发空中下劈（Aerial Slam），地面则触发居合拔刀斩
    beginAttack(p.onGround ? 0 : 1);
  }

  function beginAttack(idx = 0) {
    const p = player;
    p.attackIndex = idx;
    p.attack = { t: 0, queued: false, hitSet: new Set() };
    p.attackChainTimer = 0;
    if (idx === 1) {
      // 空中下劈：保留空中动量，不做地面拔刀的刹停
      return;
    }
    if (idx === 2) {
      // 次元斩：站定蓄力，刹停至几乎不动（前摇 0.6s 全程定身）
      p.vx *= .05;
      Sound.ultCharge();
      return;
    }
    // iai: kill horizontal momentum into the draw so the cut reads as a burst
    p.vx *= .18;
  }

  // [MOD 5] iai wrist path (local sprite coords). The hand is NOT anchored to
  // the chest — it travels a huge arc: waist-behind (windup) → full extension
  // in front (the cut) → held in front, tip angled down (recovery pose).
  // [ULT] 0.74s 之后开始收刀，1.00s 落鞘；0→1 的进度供手、刀角、刀鞘共用。
  function ultSheathProgress(t, def = ATTACKS[2]) {
    const moveStart = def.activeEnd + (def.sheathHold || .08);
    return smoothstep(moveStart, ultBurstTime(def), t);
  }

  function getAttackHand(p) {
    const def = ATTACKS[p.attackIndex];
    const t = p.attack ? p.attack.t : 0;
    if (p.attackIndex === 2 && t >= def.activeEnd) {
      // 次元斩后摇：先保持余势，再把刀收回待机手位（落鞘帧正好到位）
      const e = ultSheathProgress(t, def);
      return { handX: lerp(def.handStrike[0], 6, e), handY: lerp(def.handStrike[1], -21, e) };
    }
    let hx, hy;
    if (t < def.startup) {
      // deliberate draw: the hand settles back to the waist in one slow breath
      const e = easeInOutCubic(clamp(t / def.startup, 0, 1));
      hx = lerp(6, def.handWind[0], e);
      hy = lerp(-21, def.handWind[1], e);
    } else if (t < def.activeEnd) {
      // teleport cut: NO in-between frames. The instant startup ends, the
      // hand is already fully extended in front — the blade is never seen
      // moving, only the tear it leaves on the air.
      hx = def.handStrike[0];
      hy = def.handStrike[1];
    } else {
      // snap into the stylish front hold, then release back to idle
      const s = clamp((t - def.activeEnd) / (def.dur - def.activeEnd), 0, 1);
      if (s < .55) {
        const e = easeOutCubic(s / .55);
        hx = lerp(def.handStrike[0], def.handHold[0], e);
        hy = lerp(def.handStrike[1], def.handHold[1], e);
      } else {
        const e = easeInOutCubic((s - .55) / .45);
        hx = lerp(def.handHold[0], 6, e);
        hy = lerp(def.handHold[1], -21, e);
      }
    }
    return { handX: hx, handY: hy };
  }

  function getAttackAngle(p) {
    const def = ATTACKS[p.attackIndex];
    const t = p.attack ? p.attack.t : 0;
    if (p.attackIndex === 2 && t >= def.activeEnd) {
      // 次元斩：刀角从出刀角平滑收回到待机角，落鞘帧完成
      return lerp(def.endAngle, IDLE_SWORD_ANGLE, ultSheathProgress(t, def));
    }
    if (t < def.startup) {
      const s = clamp(t / def.startup, 0, 1);
      // blade draws out of the tuck with a slow, weighted motion (tip points back)
      return lerp(IDLE_SWORD_ANGLE, def.windAngle, easeInOutCubic(s));
    }
    if (t < def.activeEnd) {
      // teleport cut: the blade appears at its fully extended strike angle the
      // frame startup ends — zero swept frames, the eye never tracks a blade.
      return def.endAngle;
    }
    const s = clamp((t - def.activeEnd) / (def.dur - def.activeEnd), 0, 1);
    if (s < .55) {
      // snap into the recovery hold: tip angled at the ground, pose held
      return lerp(def.endAngle, def.holdAngle, easeOutCubic(s / .55));
    }
    return lerp(def.holdAngle, IDLE_SWORD_ANGLE, easeInOutCubic((s - .55) / .45));
  }

  function getSwordPose(pl = player) {
    let angle = IDLE_SWORD_ANGLE;
    let handX = 6, handY = -21;
    if (!pl.alive) { angle = .25; handX = 10; handY = -7; }
    else if (pl.attack) {
      const h = getAttackHand(pl);
      angle = getAttackAngle(pl);
      handX = h.handX;
      handY = h.handY;
    } else if (pl.parry) {
      angle = -.92;
      handX = 8;
      handY = -24;
    } else if (pl.dashTimer > 0) {
      angle = 2.8;
      handX = 1;
      handY = -23;
    } else if (!pl.onGround) {
      angle = 2.05;
      handX = 4;
      handY = -22;
    } else if (Math.abs(pl.vx) > 22) {
      angle = 2.62;
      handX = 4;
      handY = -21;
    } else if (pl.hurtT > 0) {
      angle = 1.55;
      handX = 4;
      handY = -17;
    }
    const facing = pl.facing;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const tipLocal = { x: handX + dx * 29, y: handY + dy * 29 };
    return {
      angle, handX, handY,
      tipWorld: { x: pl.x + tipLocal.x * facing, y: pl.y + tipLocal.y },
      handWorld: { x: pl.x + handX * facing, y: pl.y + handY }
    };
  }

  function updatePlayer(dt) {
    const p = player;
    p.animTime += dt;
    if (!p.alive) {
      p.deathT += dt;
      p.vy += GRAVITY * .5 * dt;
      p.x += p.vx * dt;
      p.vx = damp(p.vx, 0, 3, dt);
      if (p.y < FLOOR) { p.y = Math.min(FLOOR, p.y + p.vy * dt); }
      return;
    }

    // timers
    if (p.invuln > 0) p.invuln -= dt;
    if (p.flashT > 0) p.flashT -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.dashCd > 0) p.dashCd -= dt;
    if (p.parryCd > 0) p.parryCd -= dt;
    if (p.counterTimer > 0) p.counterTimer -= dt;
    if (p.attackChainTimer > 0) {
      p.attackChainTimer -= dt;
      if (p.attackChainTimer <= 0 && !p.attack) p.attackIndex = 0;
    }
    if (p.comboTimer > 0) {
      p.comboTimer -= dt;
      if (p.comboTimer <= 0) { p.combo = 0; syncComboHUD(true); }
    }
    if (p.comboPop > 0) p.comboPop -= dt;

    // coyote time
    if (p.onGround) p.coyote = .1;
    else if (p.coyote > 0) p.coyote -= dt;

    const left = keys.has('KeyA') || keys.has('ArrowLeft');
    const right = keys.has('KeyD') || keys.has('ArrowRight');
    const move = (right ? 1 : 0) - (left ? 1 : 0);

    // jump buffering
    if (p.jumpBuffer > 0) {
      p.jumpBuffer -= dt;
      if (p.onGround) doJump();
    }

    if (p.hurtT <= 0 && p.dashTimer <= 0 && !p.parry && !p.attack && move !== 0) {
      p.facing = move;
    }

    // horizontal intent
    let control = 1;
    if (p.hurtT > 0) control = 0;
    else if (p.dashTimer > 0) control = 0;
    else if (p.parry) control = .06;
    else if (p.attack) {
      // iai control profile: 引刀时完全定格（零漂移，重心沉入半蹲），
      // 出刀帧由 updateAttack 同步猛蹬突进，收势后轻轻按住
      const def = ATTACKS[p.attackIndex];
      // 次元斩：前后摇全程定身（noMove），不可移动
      control = def.noMove ? 0 : (p.attack.t < def.startup ? 0 : (p.attack.t < def.activeEnd ? 1 : .15));
    }

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      const k = clamp(p.dashTimer / DASH_TIME, 0, 1);
      p.vx = p.dashDir * DASH_SPEED * (0.55 + 0.45 * k);
      p.ghostTimer -= dt;
      if (p.ghostTimer <= 0) { p.ghostTimer = .032; addGhost(p); }
      if (p.dashTimer <= 0) p.vx = p.dashDir * RUN_SPEED * .72;
    } else {
      const target = move * RUN_SPEED * control;
      const rate = p.onGround ? (move !== 0 ? 14 : 17) : 7;
      p.vx = damp(p.vx, target, rate, dt);
    }

    // attack update (may replace p.attack with the next chained swing)
    updateAttack(dt);

    // parry window
    if (p.parry) {
      p.parryT += dt;
      if (p.parryT > .40) p.parry = false;
    }

    // vertical physics
    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;
    if (p.y >= FLOOR) {
      if (!p.onGround) {
        const impact = Math.min(1, Math.abs(p.vy) / 520);
        if (p.vy > 150) {
          spawnDust(p.x, FLOOR + 1, 0, 2 + Math.round(impact * 5));
          Sound.land();
          addTrauma(.03 + impact * .12);
        }
        // 空中下劈落地：刀砸到地面——劈地板反馈
        if (p.attack && p.attackIndex === 1) slamLand(p);
      }
      p.y = FLOOR;
      p.vy = 0;
      p.onGround = true;
      p.airDash = true;
      p.airJumpUsed = false;
      p.coyote = .1;
    } else {
      p.onGround = false;
    }

    // movement & world bounds
    p.x += p.vx * dt;
    if (p.x < 18) { p.x = 18; if (p.vx < 0) p.vx = 0; }
    if (p.x > WORLD_W - 18) { p.x = WORLD_W - 18; if (p.vx > 0) p.vx = 0; }

    // [MOD 2] 10-frame run: distance-driven, strictly discrete frame stepping.
    // Faster speed → shorter pixel-window per frame → cadence speeds up, but the
    // pose always snaps between hardcoded RUN_FRAMES entries, never interpolates.
    const speedAbs = Math.abs(p.vx);
    if (p.onGround && p.hurtT <= 0 && !p.attack && !p.parry && speedAbs > 24) {
      const frameDist = clamp(9.5 - speedAbs * .02, 5.5, 10);
      p.runAcc += speedAbs * dt;
      while (p.runAcc >= frameDist) {
        p.runAcc -= frameDist;
        p.runFrame = (p.runFrame + 1) % 10;
        // contact frames of the 10-frame cycle carry the footstep + dust
        if (p.runFrame === 0 || p.runFrame === 5) {
          p.footToggle ^= 1;
          Sound.footstep(p.footToggle === 0);
          const dir = sign(p.vx);
          spawnDust(p.x - dir * 3, FLOOR + 1, -dir, p.footToggle ? 3 : 2);
        }
      }
    } else if (!p.onGround) {
      p.runFrame = 3; // airborne: lock on the lifted mid-stride pose
    }
  }

  function updateAttack(dt) {
    const p = player;
    if (!p.attack) return;
    const atk = p.attack;
    const def = ATTACKS[p.attackIndex];
    const prev = atk.t;
    atk.t += dt;
    const isUlt = p.attackIndex === 2;
    const ultBurst = isUlt ? ultBurstTime(def) : 0;
    const ultSheathStart = isUlt ? ultBurst - (def.sheathDur || .12) : 0;

    // 次元斩蓄力：只留几缕冷色能量向刀柄收束，不做红色圆环
    if (isUlt && atk.t < def.startup) {
      atk.ultChargeT = (atk.ultChargeT || 0) - dt;
      if (atk.ultChargeT <= 0) {
        atk.ultChargeT = .09;
        const sp = getSwordPose();
        const a = rand(0, TAU), rr = rand(12, 24);
        particles.push({
          x: sp.handWorld.x + Math.cos(a) * rr,
          y: sp.handWorld.y + Math.sin(a) * rr * .8,
          vx: -Math.cos(a) * rr * 2.6, vy: -Math.sin(a) * rr * 2.6,
          life: .20, max: .20, size: 1,
          color: pick(['#bfe4ff', '#ffffff', '#7db8ff']),
          gravity: 0, drag: 1.6, additive: true
        });
      }
    }

    // iai draw: killing intent condensing at the sheathed blade
    if (atk.t < def.startup && chance(dt * 7)) {
      const sp = getSwordPose();
      spawnParticles(sp.handWorld.x, sp.handWorld.y, 1, {
        colors: isUlt ? ['#1b3a6b', '#4a8fd4', '#bfe4ff'] : ['#7a1420', '#c22836', '#2a0a0c'],
        speed: [8, 30], life: [.22, .5],
        size: [1, 1], gravity: -20, drag: 1.2, angle: [-Math.PI, 0], additive: true, jitter: 2
      });
    }

    if (prev < def.startup && atk.t >= def.startup) {
      if (p.attackIndex !== 2) Sound.slash(false);
      else Sound.ultCut();
      // [MOD] 出刀帧：顿帧恒定；白闪与强震颤只在命中敌人时触发——挥空不闪不抖
      hitstop = Math.max(hitstop, .08);
      // lunge forward with the swing
      if (!p.onGround) p.vx += p.facing * def.step * 1.4;
      else p.vx = p.facing * def.step;
      // 空中下劈：挥砍同时猛烈下沉，刀向下砸
      if (p.attackIndex === 1 && !p.onGround) p.vy += 200;
      addGhost(p, p.attackIndex !== 2); // 居合是血色残影；次元斩用冷色残影
      // 空中下劈用专属斩痕；次元斩先划开空间，再生成球团；地面居合维持原有刀光
      if (p.attackIndex === 1) spawnAerialFlash(p);
      else if (p.attackIndex === 2) { spawnUltCut(p); spawnUltOrb(p); }
      else spawnIaiFlash(p);
    }

    // 收刀开始：金属滑鞘声 + 冷色能量向最近的小球收束
    if (isUlt && prev < ultSheathStart && atk.t >= ultSheathStart) {
      Sound.ultSheathStart();
    }
    if (isUlt && ultOrb && atk.t >= ultSheathStart && atk.t < ultBurst && chance(dt * 16)) {
      const target = ultOrb.orbs && ultOrb.orbs.length ? pick(ultOrb.orbs) : ultOrb;
      const a = rand(0, TAU), rr = rand(16, 34);
      particles.push({
        x: target.x + Math.cos(a) * rr, y: target.y + Math.sin(a) * rr * .75,
        vx: -Math.cos(a) * rr * 2.6, vy: -Math.sin(a) * rr * 2.6,
        life: .18, max: .18, size: 1,
        color: pick(['#bfe0ff', '#ffffff', '#7db8ff']),
        gravity: 0, drag: 1.4, additive: true
      });
    }

    // 次元斩落鞘：刀完全入鞘的同一帧，球团内爆并炸开，范围内敌人统一结算
    if (isUlt && !atk.ultBurstDone && atk.t >= ultBurst) {
      atk.ultBurstDone = true;
      burstUltCut(p);
      if (ultOrb) ultOrb = null;
      Sound.ultSheath();
      const hitH = def.hitHeight || 64;
      for (const e of enemies) {
        if (!e.canBeHit() || atk.hitSet.has(e.id)) continue;
        const dx = (e.x - p.x) * p.facing;
        if (dx > -16 && dx < def.reach + e.width() * .4 && Math.abs(e.y - p.y) < hitH) {
          atk.hitSet.add(e.id);
          damageEnemy(e, def.dmg);
        }
      }
    }

    if (atk.t >= def.startup && atk.t <= def.activeEnd && p.attackIndex !== 2) {
      // A short, moving crescent (drawn post-lighting) does the heavy lifting
      // for the slash; we only scatter a few severed light-motes from the edge.
      const pose = getSwordPose();
      if (chance(.55)) {
        particles.push({
          x: pose.tipWorld.x, y: pose.tipWorld.y,
          vx: rand(-18, 18) + p.facing * rand(4, 28), vy: rand(-22, 16),
          life: rand(.1, .28), max: .28, size: 1,
          color: '#eefbff',
          gravity: 50, drag: 1.6, additive: true, streak: chance(.5)
        });
      }
      // damage window
      const hitH = def.hitHeight || 64; // 次元斩大范围：判定高度放宽
      for (const e of enemies) {
        if (!e.canBeHit() || atk.hitSet.has(e.id)) continue;
        const dx = (e.x - p.x) * p.facing;
        if (dx > -16 && dx < def.reach + e.width() * .4 && Math.abs(e.y - p.y) < hitH) {
          atk.hitSet.add(e.id);
          // [PERF] 攻击级去重：一次攻击在 0.5s 内命中多个敌人时，最重的
          // 白闪 + 强震颤只触发一次，其余命中不再叠加——杜绝连续屏闪卡顿
          if (!atk.heavyDone) {
            atk.heavyDone = true;
            addTrauma(.8);
            screenFlash(.3, '255,255,255');
          }
          damageEnemy(e, def.dmg);
        }
      }
    }

    // 空中下劈：斩痕圆心跟随角色下落到地面——刀光一直贴着挥砍轨迹
    if (p.attackIndex === 1 && p._aerialArc) {
      p._aerialArc.x = p.x + p.facing * 8;
      p._aerialArc.y = p.y - 26;
    }

    if (atk.t >= def.dur) {
      const queued = atk.queued;
      p.attack = null;
      // single iai: a buffered re-press resumes almost instantly;
      // otherwise a short recovery before the next draw
      p.attackChainTimer = queued ? .04 : .3;
    }
  }

  // 空中下劈落地瞬间的“劈地板”：刀光随角色砸到地面，尘土向两侧炸开、
  // 冲击环荡开、顿帧 + 震屏，然后立即收势（攻击结束）。
  function slamLand(p) {
    spawnDust(p.x, FLOOR + 1, 0, 10);
    spawnDust(p.x - 4, FLOOR + 1, -1, 6);
    spawnDust(p.x + 4, FLOOR + 1, 1, 6);
    rings.push({ x: p.x, y: FLOOR - 2, maxR: 30, life: 0, dur: .3, color: '#d8d2c0', thick: 1 });
    rings.push({ x: p.x, y: FLOOR - 2, maxR: 19, life: 0, dur: .24, color: '#f2f6ff', thick: 1 });
    hitstop = Math.max(hitstop, .05);
    addTrauma(.26);
    Sound.land();
    p._aerialArc = null;
    p.attack = null;
    p.attackChainTimer = .16;
  }

  function playerHurt(dmg, sourceX) {
    const p = player;
    if (!p.alive || p.invuln > 0 || gameState !== 'playing') return false;
    p.hp = Math.max(0, p.hp - dmg);
    p.invuln = .95;
    p.hurtT = .34;
    p.flashT = .12;
    p.parry = false;
    // 次元斩后摇期间被打：正常受伤但不取消大招（前摇被打则取消）
    if (!(p.attack && p.attackIndex === 2 && p.attack.t >= ATTACKS[2].activeEnd)) {
      if (p.attack && p.attackIndex === 2) ultOrb = null;
      p.attack = null;
    }
    p.attackChainTimer = 0;
    p.combo = 0;
    p.comboTimer = 0;
    p.vx = (p.x < sourceX ? -1 : 1) * 122;
    p.vy = -110;
    p.onGround = false;
    addTrauma(.5);
    screenFlash(.35, '170,24,38');
    Sound.hurt();
    spawnParticles(p.x, p.y - 24, 17, {
      colors: ['#c93243', '#8f1b2d', '#f17378', '#4b0b14'],
      speed: [40, 170], life: [.25, .7], size: [1, 2], gravity: 330,
      drag: .8, angle: [0, TAU], additive: false, jitter: 5
    });
    hitBurst(p.x, p.y - 26, sign(sourceX - p.x), 'slash');
    addFloatingText(p.x, p.y - 48, '-' + dmg, '#ff9b9b', 1);
    syncHUD(true);
    if (p.hp <= 0) killPlayer();
    return true;
  }

  function killPlayer() {
    const p = player;
    if (!p.alive) return;
    p.alive = false;
    p.hp = 0;
    p.deathT = 0;
    p.vx = -p.facing * 70;
    p.vy = -130;
    p.attack = null;
    p.parry = false;
    ultOrb = null;
    gameState = 'dying';
    deathDelay = 1.55;
    addTrauma(.9);
    screenFlash(.65, '200,36,46');
    hitstop = Math.max(hitstop, .20);
    Sound.death();
    spawnParticles(p.x, p.y - 24, 34, {
      colors: ['#c22d3f', '#8b1425', '#ff7b82', '#3c0a12'],
      speed: [30, 210], life: [.4, 1.3], size: [1, 3], gravity: 260,
      drag: .5, angle: [0, TAU], additive: false, jitter: 8
    });
    spawnParticles(p.x, p.y - 22, 16, {
      colors: ['#ff5565', '#ffb0b7'], speed: [20, 90], life: [.5, 1.2], size: [1, 2],
      gravity: -30, drag: 1.2, angle: [0, TAU], additive: true, jitter: 5
    });
    syncHUD(true);
  }

  function drawPlayerAttackArc(p) {
    // iai attacks (0 & 2) use straight-line vacuum flashes instead of the arc
    if (!p.attack || p.attackIndex === 0 || p.attackIndex === 2) return;
    const def = ATTACKS[p.attackIndex];
    const t = p.attack.t;
    if (t < def.startup - .025 || t > def.activeEnd + .055) return;
    const localAngle = getAttackAngle(p);
    const worldAngle = p.facing > 0 ? localAngle : Math.PI - localAngle;
    const start = p.facing > 0 ? def.windAngle : Math.PI - def.windAngle;
    const end = p.facing > 0 ? def.endAngle : Math.PI - def.endAngle;
    const dir = sign(end - start) || 1;
    const maxSweep = Math.abs(end - start);
    const sweepPos = clamp((worldAngle - start) * dir, 0, maxSweep);
    if (sweepPos < .01) return;
    const spanWanted = 1.58;
    const span = Math.min(spanWanted, Math.max(.3, sweepPos));
    let aFrom = worldAngle - dir * span;
    const alphaBase = smoothstep(def.startup - .012, def.startup + .035, t)
      * (1 - smoothstep(def.activeEnd - .01, def.activeEnd + .06, t));
    if (alphaBase <= .01) return;
    ctx.save();
    ctx.translate(-viewX, viewY);
    const center = {
      x: p.x + p.facing * 6,
      y: p.y - 25
    };
    const r = 27;
    drawSlashCrescent({
      x: center.x, y: center.y, r,
      a0: aFrom, a1: worldAngle,
      color: '#e2f4ff',
      width: 8,
      life: .8, dur: 1, alpha: alphaBase * .95
    });
    drawSlashCrescent({
      x: center.x, y: center.y, r: r + 3,
      a0: aFrom + dir * .09, a1: worldAngle - dir * .03,
      color: '#bfe6ff',
      width: 4,
      life: .8, dur: 1, alpha: alphaBase * .32
    });
    drawSlashCrescent({
      x: center.x, y: center.y, r: r - 3,
      a0: aFrom + dir * .12, a1: worldAngle - dir * .05,
      color: '#ffffff',
      width: 2,
      life: .8, dur: 1, alpha: alphaBase * .62
    });
    ctx.restore();
  }

  /* ------------------------- player drawing ------------------------- */
  function getPlayerPose(p) {
    const t = p.animTime;
    let state = 'idle';
    if (!p.alive) state = 'dead';
    else if (p.hurtT > 0) state = 'hurt';
    else if (p.parry) state = 'parry';
    else if (p.dashTimer > 0) state = 'dash';
    else if (p.attack) state = 'attack';
    else if (!p.onGround) state = 'air';
    else if (Math.abs(p.vx) > 23) state = 'run';
    let bob = 0, lean = 0, crouch = 0, armSwing = 0;
    if (state === 'idle') {
      bob = Math.sin(t * 2.2) * .65;
    } else if (state === 'run') {
      bob = (RUN_FRAMES[p.runFrame] || RUN_FRAMES[0]).bob;
      // [MOD] 跑步明显前倾：上半身前压，重心推向前方
      lean = 3.4;
    } else if (state === 'air') {
      bob = -.5;
      lean = p.vy < 0 ? 1.2 : -.5;
    } else if (state === 'attack') {
      const def = ATTACKS[p.attackIndex];
      const t = p.attack.t;
      if (p.attackIndex === 1) {
        // 空中下劈：举刀过顶微后仰 → 前倾猛劈 → 收势微收
        if (t < def.startup) { crouch = .5; lean = -.8; bob = -.4; }
        else if (t < def.activeEnd) { crouch = 0; lean = 2.6; bob = -1.2; }
        else { crouch = .2; lean = .9; bob = -.5; }
      } else if (p.attackIndex === 2) {
        // 次元斩：蓄力深蹲、重心前倾（如发令枪前蓄势待发）→ 爆发全身前倾 →
        // 保持余势 → 收刀时把重心收回 → 落鞘后微微沉肩，再回待机
        if (t < def.startup) { crouch = 1.8; lean = 1.2; bob = -.7; }
        else if (t < def.activeEnd) { crouch = 0; lean = 3.2; bob = -1.1; }
        else {
          const e = ultSheathProgress(t, def);
          crouch = lerp(.6, .15, e);
          lean = lerp(3.2, .7, e);
          bob = lerp(-1.1, -.3, e);
          const settle = smoothstep(ultBurstTime(def), 1.24, t);
          crouch = lerp(crouch, 0, settle);
          lean = lerp(lean, 0, settle);
          bob = lerp(bob, 0, settle);
        }
      } else if (t < def.startup) {
        // iai draw: 引刀 — deep squat, weight shifted hard back, blade tucked
        crouch = 2.0;
        lean = -1.1;
        bob = -.6;
      } else if (t < def.activeEnd) {
        // the cut: whole body thrown violently forward, legs driving off the ground
        crouch = 0;
        lean = 3.4;
        bob = -1.0;
      } else {
        // recovery: blade held out front, body collected
        crouch = .5;
        lean = 1.1;
        bob = -.5;
      }
    } else if (state === 'parry') {
      crouch = 1.2;
      lean = .8;
    } else if (state === 'dash') {
      lean = 3.2;
      crouch = 2.2;
    } else if (state === 'hurt') {
      lean = -2.4;
      bob = -.4;
    } else if (state === 'dead') {
      crouch = 0;
    }
    return { state, bob, lean, crouch, armSwing };
  }

  function drawPlayerShadow(p) {
    const height = Math.max(0, FLOOR - p.y);
    const scale = clamp(1 - height / 130, .4, 1);
    ctx.save();
    ctx.globalAlpha = .42 * scale;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(Math.round(p.x), FLOOR + 2, 13 * scale, 3.2 * scale, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayerSprite(p, opts = {}) {
    const isGhost = !!opts.ghost;
    const pose = opts.pose || getPlayerPose(p);
    const alpha = opts.alpha === undefined ? 1 : opts.alpha;
    const t = p.animTime;
    const facing = p.facing;
    const bob = pose.bob;
    const crouch = pose.crouch;
    const lean = pose.lean;
    const state = pose.state;

    ctx.save();
    ctx.globalAlpha = alpha;
    if (isGhost) ctx.globalCompositeOperation = 'lighter';
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.scale(facing, 1);

    // --- tattered cloak / cape, behind everything -------------------------
    const run = state === 'run' ? 1 : 0;
    const air = state === 'air' ? 1 : 0;
    const dash = state === 'dash' ? 1 : 0;
    const attack = state === 'attack' ? 1 : 0;
    const flutter = Math.sin(t * 4.35 + .7) * 1.05 + Math.sin(t * 8.1 + 1.4) * .38;
    const backStretch = run * 4.4 + dash * 8 + attack * 3.1;
    const capeBaseY = -1 + bob + crouch * .3;
    const capePoints = [
      [-2, -30 + bob],
      [-4.5, -31 + bob],
      [-6 - run * 1.8 - dash * 4 + flutter * .3, -25 + bob],
      [-8 - run * 3.3 - dash * 8 + flutter * .6, -18 + bob + air * 1.5],
      [-10.5 - backStretch + flutter, -9 + bob + crouch * .3 - air * 5],
      [-8 - backStretch * .65 - flutter * .4, -11 + bob - air * 2],
      [-6.5 - backStretch * .4, -5 + bob + crouch - air * 5.5],
      [-4.2 - run * 1.5 - dash * 3, -8.5 + bob + crouch - air * 3],
      [-2.4 - backStretch * .3, -4.2 + bob + crouch - air * 5],
      [-.2, -12 + bob + air * 1.5],
      [1.2, -21 + bob],
      [.4, -28 + bob]
    ];
    pPoly(capePoints, PAL.outline);
    const innerCape = pointsScaledAround(capePoints, .3, -28 + bob, .82, .90);
    pPoly(innerCape, isGhost ? '#8aa3c0' : PAL.cape);
    // torchlight catching the ragged edge of the cloak
    if (!isGhost) {
      pLine(-4.5, -31 + bob, capePoints[2][0] - .5, capePoints[2][1], 'rgba(104,116,146,.75)', 1);
      pLine(capePoints[2][0] - .5, capePoints[2][1], capePoints[3][0] - .5, capePoints[3][1], 'rgba(76,87,113,.65)', 1);
      pLine(capePoints[3][0] - .5, capePoints[3][1], capePoints[4][0] + 1, capePoints[4][1], 'rgba(56,65,87,.55)', 1);
      pLine(-3, -28 + bob, -7 - backStretch * .3, -13 + bob, '#3d4558', 1);
      pLine(-5, -25 + bob, -8 - backStretch * .45, -8 + bob, PAL.cape3, 1);
      pLine(-6 - run * 2, -21 + bob, -9 - backStretch, -11 + bob, 'rgba(96,104,130,.4)', 1);
      pLine(-4.5, -30 + bob, -9 - backStretch * .2, -20 + bob, 'rgba(88,96,122,.45)', 1);
      // a hint of faded crimson lining
      pLine(-7 - backStretch * .68, -8 + bob, -4.5, -5 + bob + crouch, 'rgba(94,29,38,.5)', 1);
      pRect(-5 - backStretch * .4, -7 + bob, 2, 1, 'rgba(126,48,56,.25)');
    }

    // --- scarf tails ------------------------------------------------------
    const scarfWave = Math.sin(t * 5.2) * 2 + Math.sin(t * 8.4 + 1) * 1.1;
    const scarfRun = run * 2.4;
    if (!isGhost) {
      pLine(-.5, -31 + bob, -6 - scarfRun, -27 + bob + scarfWave * .3, PAL.scarf, 1);
      pLine(-6 - scarfRun, -27 + bob + scarfWave * .3, -10 - run * 2.6, -23 + bob + scarfWave * .7, PAL.scarfHi, 1);
      pLine(-.5, -30 + bob, -4.5 - run, -25 + bob - scarfWave * .2, '#20222d', 1);
      pLine(-4.5 - run, -25 + bob - scarfWave * .2, -7 - run * 2.2, -21 + bob - scarfWave * .4, '#363b4d', 1);
    }

    // --- legs -------------------------------------------------------------
    // [MOD 2] run legs snap to hardcoded 10-frame keyframes (no interpolation)
    let footBack, footFront, kneeBack, kneeFront;
    if (state === 'run') {
      const F = RUN_FRAMES[p.runFrame] || RUN_FRAMES[0];
      kneeBack = [F.bkx, F.bky];
      footBack = [F.bfx, F.bfy];
      kneeFront = [F.fkx, F.fky];
      footFront = [F.ffx, F.ffy];
    } else if (state === 'air') {
      // [MOD] 空中姿态：后脚完全伸直下垂，前脚屈膝上收——标准跳跃剪影
      footBack = [-3, -3 - Math.max(0, p.vy) * .006];
      footFront = [6, -3];
      kneeBack = [-3.5, -16];
      kneeFront = [6, -13];
    } else if (state === 'dash') {
      footBack = [-8, -1];
      footFront = [8, -4];
      kneeBack = [-5, -8];
      kneeFront = [4, -9];
    } else if (state === 'attack') {
      const atk = p.attack ? p.attack.t : 0;
      const adef = ATTACKS[p.attackIndex];
      if (p.attackIndex === 1) {
        // 空中下劈：保持空中腿形——后脚伸直、前脚屈膝
        footBack = [-3, -3 - Math.max(0, p.vy) * .006];
        footFront = [6, -3];
        kneeBack = [-3.5, -16];
        kneeFront = [6, -13];
      } else if (p.attackIndex === 2) {
        // 次元斩：蓄力前倾蹲踞（后脚蹬实、前脚前踏，如起跑预备）→ 爆发蹬地前跨 →
        // 后摇收刀站稳
        if (atk < adef.startup) {
          footBack = [-6, 0];
          footFront = [7, .5];
          kneeBack = [-4.5, -8.5];
          kneeFront = [4, -10];
        } else if (atk < adef.activeEnd) {
          footBack = [-2, -1];
          footFront = [10, 0];
          kneeBack = [-1.5, -10.5];
          kneeFront = [6, -8.5];
        } else {
          footBack = [-5.5, 0];
          footFront = [6, 0];
          kneeBack = [-4, -8.5];
          kneeFront = [4.5, -9];
        }
      } else if (atk < adef.startup) {
        // 引刀半蹲：双脚外展、双膝深屈，重心压沉
        footBack = [-6.5, 0];
        footFront = [6.5, .5];
        kneeBack = [-4.5, -9.5];
        kneeFront = [4.5, -10];
      } else if (atk < adef.activeEnd) {
        // 挥刀蹬地：后腿发力蹬起，前腿猛跨前踏，与手臂甩出同步
        footBack = [-3, -1.5];
        footFront = [9.5, 0];
        kneeBack = [-2, -11];
        kneeFront = [6.5, -9];
      } else {
        // 收势：双腿收拢站稳
        footBack = [-5.5, 0];
        footFront = [6, 0];
        kneeBack = [-4, -8.5];
        kneeFront = [4.5, -9];
      }
    } else if (state === 'parry') {
      footBack = [-6, 0];
      footFront = [5, 0];
      kneeBack = [-5, -7];
      kneeFront = [4, -7.5];
    } else if (state === 'hurt') {
      footBack = [-5, 0];
      footFront = [5, -1];
      kneeBack = [-3, -8];
      kneeFront = [3, -7];
    } else if (state === 'dead') {
      footBack = [-5, 0];
      footFront = [6, 0];
      kneeBack = [-6, -5];
      kneeFront = [3, -4];
    } else {
      footBack = [-4.5, 0];
      footFront = [4.5, 0];
      kneeBack = [-4, -8];
      kneeFront = [4, -8];
    }

    const hipY = -16.5 + bob + crouch;
    const backLegPal = isGhost ? '#5e7493' : { thigh: '#0c0d13', shin: '#161821', boot: '#08090d', hi: '#2d3241' };
    const frontLegPal = isGhost ? '#8ba3bd' : { thigh: '#14161f', shin: '#202331', boot: '#0a0b10', hi: '#3a4054' };
    drawPlayerLeg(-2 + lean * .35, hipY, kneeBack[0] + lean * .3, kneeBack[1] + bob, footBack[0] + lean * .2, footBack[1], backLegPal, false);
    drawTorso(pose, bob, crouch, lean, isGhost);
    drawPlayerLeg(2 + lean * .5, hipY, kneeFront[0] + lean * .3, kneeFront[1] + bob, footFront[0] + lean * .2, footFront[1], frontLegPal, true);

    // --- head / hood ------------------------------------------------------
    drawPlayerHead(pose, bob, crouch, lean, t, isGhost);

    // --- back arm ---------------------------------------------------------
    if (!isGhost) {
      const shoulderY = -28 + bob + crouch;
      const armBack = state === 'run'
        ? (RUN_FRAMES[p.runFrame] || RUN_FRAMES[0]).arm
        : Math.sin(t * 3 + 1) * .8;
      pLine(-3.5 + lean, shoulderY, -6.5 + lean - armBack, -21 + bob + crouch + Math.abs(armBack) * .25, PAL.clothDark, 2);
      pRect(-7.5 + lean - armBack, -21.5 + bob + crouch + Math.abs(armBack) * .25, 2, 2, '#0b0c11');
      pRect(-4 + lean, shoulderY, 2, 1, '#3d4456');
    }

    // --- front arm + katana ----------------------------------------------
    drawArmAndSword(p, pose, bob, crouch, lean, isGhost);

    ctx.restore();
  }

  function drawPlayerLeg(hipX, hipY, kneeX, kneeY, footX, footY, pal, front) {
    pLine(hipX, hipY, kneeX, kneeY, pal.thigh, 3);
    pLine(kneeX, kneeY, footX, footY - 1, pal.shin, 2);
    // boot / foot
    pRect(footX - 1.5, footY - 1, front ? 5 : 4, 2, pal.boot);
    pRect(footX + (front ? 3 : 2), footY - 1, 1, 1, pal.hi);
    // shin wraps
    pRect(kneeX + (footX - kneeX) * .35, kneeY + (footY - kneeY) * .35, 2, 1, pal.hi);
    pRect(kneeX + (footX - kneeX) * .62, kneeY + (footY - kneeY) * .62, 2, 1, front ? '#343949' : '#222631');
    // knee cap
    pRect(kneeX - .5, kneeY - .5, 2, 2, front ? '#252936' : '#171a22');
  }

  function drawTorso(pose, bob, crouch, lean, isGhost) {
    const y = bob + crouch;
    const x = lean;
    const base = isGhost ? '#7891ad' : PAL.cloth;
    const dark = isGhost ? '#526a88' : PAL.clothDark;
    const hi = isGhost ? '#a4bdd4' : PAL.clothHi;
    pRect(x - 4, y - 30, 9, 5, dark);
    pRect(x - 5, y - 27, 10, 8, base);
    pRect(x - 4, y - 20, 8, 5, dark);
    // shoulder wrap
    pRect(x - 5, y - 30, 10, 2, PAL.outline);
    pRect(x - 4, y - 30, 4, 1, hi);
    pRect(x + 3, y - 29, 1, 8, hi);
    // diagonal cloth strips
    if (!isGhost) {
      pLine(x - 4, y - 26, x + 3, y - 22, PAL.wrap, 1);
      pLine(x - 4, y - 22, x + 2, y - 18, '#303442', 1);
      pLine(x - 5, y - 25, x - 2, y - 16, 'rgba(10,11,16,.8)', 1);
      pRect(x + 2, y - 25, 1, 1, PAL.wrapHi);
      // belt & tiny brass clasp
      pRect(x - 4, y - 20, 9, 2, '#33151b');
      pRect(x - 4, y - 20, 9, 1, '#54232a');
      pRect(x + 2, y - 19, 2, 2, PAL.gold);
      pRect(x + 2, y - 19, 1, 1, PAL.goldHi);
      // loose cloth fold at the hip
      pRect(x - 4, y - 16, 7, 2, '#101119');
      pRect(x + 2, y - 15, 2, 2, '#0b0c12');
    } else {
      pRect(x - 3, y - 27, 7, 1, '#9cb5cd');
    }
  }

  function drawPlayerHead(pose, bob, crouch, lean, t, isGhost) {
    const x = 0 + lean;
    const y = bob + crouch - 41;
    const outline = isGhost ? '#7f98b3' : PAL.outline;
    const cloth = isGhost ? '#93aec8' : PAL.cloth;
    const dark = isGhost ? '#5d7592' : PAL.clothDark;
    // hood silhouette
    pRect(x + 1, y, 5, 1, outline);
    pRect(x, y + 1, 7, 2, cloth);
    pRect(x - 1, y + 2, 8, 4, dark);
    pRect(x - 1, y + 2, 2, 5, PAL.cape2);
    pRect(x + 1, y + 3, 7, 5, cloth);
    // face opening / black wrap
    pRect(x + 1, y + 5, 7, 5, '#07070a');
    pRect(x + 2, y + 4, 6, 2, '#060609');
    pRect(x + 1, y + 7, 6, 3, '#0a0a0e');
    // wrap folds across the face
    pLine(x + 1, y + 8, x + 7, y + 7, '#1a1a22', 1);
    pLine(x + 2, y + 10, x + 7, y + 9, '#16161d', 1);
    // hood highlight
    pRect(x + 2, y + 1, 3, 1, isGhost ? '#bfd5e5' : '#4d566d');
    pRect(x - 1, y + 3, 1, 3, isGhost ? '#afc7da' : '#3c4355');
    pRect(x + 5, y + 2, 2, 1, isGhost ? '#c6d9e7' : '#3d4558');
    pRect(x + 6, y + 2, 1, 2, '#14151c');
    // scarf knot catches the torchlight
    pRect(x + 4, y + 11, 2, 1, isGhost ? '#c1d5e4' : '#5c647a');
    // eyes — a sharp red slit
    if (!isGhost) {
      pRect(x + 2, y + 5, 2, 1, PAL.eye);
      pRect(x + 5, y + 5, 1, 1, PAL.eye);
      pRect(x + 3, y + 5, 1, 1, PAL.eyeHot);
      // brow shadow
      pRect(x + 2, y + 4, 2, 1, '#111017');
      pRect(x + 5, y + 4, 1, 1, '#111017');
    } else {
      pRect(x + 2, y + 5, 4, 1, '#d2e6f3');
    }
    // neck scarf
    pRect(x - 1, y + 11, 8, 2, isGhost ? '#7089a5' : PAL.scarf);
    pRect(x + 1, y + 11, 3, 1, isGhost ? '#93aac1' : PAL.scarfHi);
    // hood tail
    const hw = Math.sin(t * 4.7) * 1.4;
    pLine(x - 1, y + 3, x - 4 + hw * .2, y + 8, isGhost ? '#66809c' : '#14151d', 1);
    pLine(x - 4 + hw * .2, y + 8, x - 6 + hw, y + 12, isGhost ? '#5e7792' : '#1d1f2a', 1);

    if (!isGhost) {
      player._eyeGlow = { x: player.x + (x + 3) * player.facing, y: player.y + y + 5.5, on: true };
      player._eyeGlow2 = { x: player.x + (x + 5.5) * player.facing, y: player.y + y + 5.5, on: true };
    }
  }

  function drawArmAndSword(p, pose, bob, crouch, lean, isGhost) {
    const y0 = bob + crouch;
    let handX, handY, elbowX, elbowY, angle;
    if (p.attack) {
      const def = ATTACKS[p.attackIndex];
      const sp = getSwordPose(p);
      angle = sp.angle;
      handX = sp.handX; handY = sp.handY + y0;
      // [MOD 4] fixed shoulder anchor + 2-bone arm solve. The elbow is derived
      // from the shoulder (fixed point) and the wrist (attack progress):
      // law-of-cosines projection along the shoulder→wrist axis, plus a
      // keyframed fold that collapses during the windup (elbow tucked behind
      // the shoulder) and snaps near-straight as the wrist whips forward —
      // the fold→extend reads as power being driven into the blade.
      const L_UA = 7, L_FA = 8;
      const sx = 3.5 + lean, sy = -27.5 + y0;
      const dx = handX - sx, dy = handY - sy;
      const d = Math.hypot(dx, dy) || .001;
      const ux = dx / d, uy = dy / d;
      const proj = clamp((L_UA * L_UA - L_FA * L_FA + d * d) / (2 * d * d), .12, .88);
      const bx = sx + ux * proj * d, by = sy + uy * proj * d;
      const nx = -uy, ny = ux;
      // fold: 6.5 at full tuck → 1.0 at full extension → 3.0 while settling back
      let fold;
      if (p.attack.t < def.startup) {
        fold = lerp(0, 6.5, easeOutCubic(clamp(p.attack.t / def.startup, 0, 1)));
      } else if (p.attack.t < def.activeEnd) {
        // teleport cut: the arm is already fully extended the frame startup
        // ends — the fold collapses instantly, no mid-air whipping frames
        fold = 1.0;
      } else {
        fold = lerp(1.0, 3.0, easeInOutCubic(clamp((p.attack.t - def.activeEnd) / (def.dur - def.activeEnd), 0, 1)));
      }
      // bend side: tucked behind the shoulder during the draw, driven fully
      // forward the instant the blade appears — no sweeping rotation frames
      let bend = -1;
      if (p.attack.t >= def.startup) {
        bend = 1;
      }
      elbowX = bx + nx * fold * bend;
      elbowY = by + ny * fold * bend;
    } else if (p.parry) {
      angle = -.92; handX = 8; handY = -24 + y0;
      elbowX = 5; elbowY = -25 + y0;
    } else if (p.dashTimer > 0) {
      angle = 2.8; handX = 1; handY = -23 + y0;
      elbowX = 2; elbowY = -25 + y0;
    } else if (!p.onGround) {
      angle = 2.05; handX = 4; handY = -22 + y0;
      elbowX = 4; elbowY = -25 + y0;
    } else if (p.hurtT > 0) {
      angle = 1.55; handX = 4; handY = -17 + y0;
      elbowX = 3; elbowY = -23 + y0;
    } else if (Math.abs(p.vx) > 22) {
      angle = 2.62; handX = 4; handY = -21 + y0;
      elbowX = 4; elbowY = -25 + y0;
    } else {
      angle = IDLE_SWORD_ANGLE; handX = 6; handY = -21 + y0;
      elbowX = 4; elbowY = -25 + y0;
    }
    if (!isGhost) {
      // pale steel rim along the leading edge of the cloak so the silhouette survives the dark
      pLine(-3.5, -29 + y0, -6.5, -22 + y0, '#343b4d', 1);
      pRect(3 + lean, -30 + y0, 2, 1, '#4a5267');
    }
    const armColor = isGhost ? '#8fa8c1' : PAL.cloth;
    const armDark = isGhost ? '#68819d' : PAL.clothDark;
    pLine(3.5 + lean, -27.5 + y0, elbowX, elbowY, armColor, 2);
    pLine(elbowX, elbowY, handX, handY, armColor, 2);
    pLine(4 + lean, -28.5 + y0, elbowX + .5, elbowY - .3, isGhost ? '#b4ccdf' : PAL.clothHi, 1);
    pRect(handX - 1, handY - 1, 2, 2, isGhost ? '#c8dceb' : '#0a0b10');
    if (p.parry && !isGhost) {
      // supporting hand
      pLine(-1 + lean, -28 + y0, handX - 3, handY + 1, PAL.clothDark, 2);
      pRect(handX - 4, handY, 2, 2, '#0a0b10');
    }
    // [MOD 6] katana + scabbard
    if (p.attack && p.attackIndex === 2) {
      // 次元斩专属：蓄力时刀在鞘内；出刀后刀出鞘、空鞘留在腰间；
      // 最后 0.12s 刀鞘迎向刀身，落鞘帧由 drawScabbard 盖住刀身，完成“入鞘”。
      const adef = ATTACKS[2];
      const at = p.attack.t;
      const burstT = ultBurstTime(adef);
      if (at < adef.startup || at >= burstT) {
        drawKatana(handX, handY, angle, isGhost, p);
        drawScabbard(handX, handY, angle, isGhost);
      } else {
        drawKatana(handX, handY, angle, isGhost, p);
        const k = smoothstep(burstT - (adef.sheathDur || .12), burstT, at);
        const waistX = -5 + lean * .3;
        const waistY = -13 + bob + crouch * .4;
        drawScabbard(
          lerp(waistX, handX, k), lerp(waistY, handY, k), lerp(2.55, angle, k), isGhost
        );
      }
    } else if (p.attack || p.parry) {
      // 拔刀斩 / 振刀格挡：刀出鞘，空鞘留在腰间
      drawKatana(handX, handY, angle, isGhost, p);
      drawScabbard(-5 + lean * .3, -13 + bob + crouch * .4, 2.55, isGhost);
    } else {
      // 平时刀收鞘：鞘沿刀身覆盖，只露刀柄 + 护手，刀身完全在鞘里
      drawKatana(handX, handY, angle, isGhost, p);
      drawScabbard(handX, handY, angle, isGhost);
    }
  }

  // 黑色刀鞘。平时刀身完全收在其中（只露刀柄与护手）；拔刀时刀出鞘、
  // 空鞘留在腰间。鞘沿刀轴绘制：深黑主体 + 暗缘 + 上缘高光 + 鞘口（口金）
  // + 红色下缔绳。纯 pPoly/pLine/pRect 手绘，无外部素材。
  function drawScabbard(hx, hy, angle, isGhost) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const px = -s, py = c; // 垂直刀轴的方向
    const body = isGhost ? '#5a7290' : '#10131b';
    const dark = isGhost ? '#3d4b60' : '#04050a';
    const hi = isGhost ? '#9db6d2' : '#2a3040';
    const mouth = isGhost ? '#a9c1d6' : PAL.gold;
    const w0 = 3.3, w1 = 2.3, n0 = 1, n1 = 30;
    const x0 = hx + c * n0, y0 = hy + s * n0;
    const x1 = hx + c * n1, y1 = hy + s * n1;
    // 暗缘（比主体略宽一圈，收窄到鞘尖）
    pPoly([
      [x0 + px * w0, y0 + py * w0],
      [x1 + px * w1, y1 + py * w1],
      [x1 - px * w1, y1 - py * w1],
      [x0 - px * w0, y0 - py * w0]
    ], dark);
    // 深黑主体
    pPoly([
      [x0 + px * (w0 - .5), y0 + py * (w0 - .5)],
      [x1 + px * (w1 - .5), y1 + py * (w1 - .5)],
      [x1 - px * (w1 - .5), y1 - py * (w1 - .5)],
      [x0 - px * (w0 - .5), y0 - py * (w0 - .5)]
    ], body);
    // 上缘高光条——光线掠过鞘身
    pLine(x0 + px * w0 * .7, y0 + py * w0 * .7, x1 + px * w1 * .7, y1 + py * w1 * .7, hi, 1);
    // 鞘口（口金）
    pLine(x0 + px * w0, y0 + py * w0, x0 - px * w0, y0 - py * w0, mouth, 1);
    pRect(x0 - 1.4, y0 - .8, 2.8, 1.6, isGhost ? '#c2d6e8' : '#3c4254');
    // 下缔绳（红色，垂在鞘口下）
    pLine(x0 + px * w0 * .4, y0 + py * w0 * .4, x0 + px * (w0 - 2.4), y0 + 4.5, PAL.red, 1);
  }

  function drawKatana(hx, hy, angle, isGhost, p) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const px = -s, py = c;
    const wrap = isGhost ? '#8da7c0' : '#131319';
    const guard = isGhost ? '#b8d2e5' : PAL.gold;
    const bladeDark = isGhost ? '#7b98b5' : PAL.bladeDark;
    const bladeMid = isGhost ? '#b4cee3' : PAL.bladeMid;
    const bladeHot = isGhost ? '#e6f5ff' : PAL.blade;
    // handle
    pLine(hx - c * 8, hy - s * 8, hx - c, hy - s, wrap, 2);
    for (let i = 2; i <= 6; i += 2) pRect(hx - c * i + px * .5, hy - s * i + py * .5, 1, 1, isGhost ? '#a9c1d6' : PAL.red);
    // guard (tsuba)
    pLine(hx - px * 3, hy - py * 3, hx + px * 3.5, hy + py * 3.5, guard, 1);
    pRect(hx - 1, hy - 1, 2, 2, isGhost ? '#e3f4ff' : PAL.goldHi);
    // curved blade
    const b0x = hx + c * 2, b0y = hy + s * 2;
    const mx = hx + c * 15 - px * .8, my = hy + s * 15 - py * .8;
    const tx = hx + c * 29 - px * 2.3, ty = hy + s * 29 - py * 2.3;
    pLine(b0x, b0y, mx, my, bladeDark, 2);
    pLine(mx, my, tx, ty, bladeDark, 2);
    pLine(b0x + px * .4, b0y + py * .4, mx + px * .3, my + py * .3, bladeMid, 1);
    pLine(mx + px * .3, my + py * .3, tx + px * .2, ty + py * .2, bladeHot, 1);
    // white edge sparkle
    pRect(tx, ty, 1, 1, isGhost ? '#ffffff' : PAL.blade);
    // hamon undulation
    pRect(mx + c * 1.5 + px * .4, my + s * 1.5 + py * .4, 1, 1, '#ffffff');
  }

  function drawPlayer(p) {
    drawPlayerShadow(p);
    if (!p.alive) {
      drawPlayerDeath(p);
      return;
    }
    if (p.invuln > 0 && p.hurtT <= 0 && Math.floor(p.animTime * 24) % 2 === 0) {
      ctx.globalAlpha = .55;
    }
    // iai draw shimmer: the character flickers while the blade is being drawn
    if (p.attack && p.attack.t < ATTACKS[p.attackIndex].startup) {
      ctx.globalAlpha *= .78 + .22 * Math.sin(p.animTime * 46);
    }
    drawPlayerSprite(p, { alpha: ctx.globalAlpha });
    ctx.globalAlpha = 1;
    // speed lines during dash
    if (p.dashTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const yy = p.y - 7 - i * 7 + (i % 2) * 3;
        const len = 12 + i * 4;
        pLine(p.x - p.facing * 12, yy, p.x - p.facing * (12 + len), yy, `rgba(160,186,214,${.22 - i * .035})`, 1);
      }
      ctx.restore();
    }
  }

  function drawPlayerDeath(p) {
    const t = p.deathT;
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y - Math.min(8, t * 12)));
    ctx.scale(p.facing, 1);
    // collapsed cloak
    pPoly([
      [-4, -12], [-9, -4], [-16, 0], [-10, 1], [-6, 0], [-1, 1], [4, 0], [10, -2],
      [7, -7], [5, -12], [1, -14]
    ], PAL.outline);
    pPoly([
      [-3, -11], [-8, -4], [-12, -1], [-6, 0], [-2, -2], [3, -1], [7, -3], [5, -8], [2, -11]
    ], PAL.cape);
    // swallowed body silhouette
    pRect(-5, -17, 9, 8, PAL.clothDark);
    pRect(-6, -13, 11, 3, PAL.cape2);
    pRect(-2, -22, 6, 7, PAL.cloth);
    // hooded head bowed
    pRect(-2, -26, 7, 5, PAL.clothDark);
    pRect(1, -23, 4, 3, '#07070a');
    pRect(2, -22, 2, 1, 'rgba(180,30,45,.5)');
    // fallen katana
    pLine(6, -1, 26, -3, PAL.bladeDark, 2);
    pLine(6, -2, 26, -4, PAL.blade, 1);
    pRect(1, -3, 6, 2, '#0b0c11');
    // crimson wisps escaping
    const a = clamp(1 - t / 1.6, 0, 1);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const yy = -18 - t * 19 - i * 4;
      const xx = Math.sin(t * 3 + i * 1.8) * 5 + i * 1.3;
      ctx.globalAlpha = a * .5;
      ctx.fillStyle = i % 2 ? '#d23b46' : '#ff878b';
      ctx.fillRect(Math.round(xx), Math.round(yy), 1, 1);
    }
    ctx.restore();
  }

  function drawEyeAndBladeGlow(p) {
    if (!p.alive) return;
    const e = p._eyeGlow;
    if (e) {
      const sx = e.x - camViewX(), sy = e.y + camViewY();
      if (sx > -20 && sx < VW + 20) {
        glow(sx, sy, 6, 'rgba(255,40,58,.12)', .8);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,120,130,.9)';
        ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
        ctx.restore();
      }
      const e2 = p._eyeGlow2;
      if (e2) {
        const sx2 = e2.x - camViewX(), sy2 = e2.y + camViewY();
        glow(sx2, sy2, 4, 'rgba(255,40,58,.09)', .7);
      }
    }
    // a cool halo that separates the black silhouette from the stone
    const hx = p.x - camViewX(), hy = p.y - 23 + camViewY();
    glow(hx, hy, 30, 'rgba(86,105,137,.075)', .7);
    // running speed lines
    if (p.alive && p.onGround && Math.abs(p.vx) > 80 && !p.attack && !p.parry) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const yy = p.y - 9 - i * 6 + camViewY();
        const len = 8 + i * 3 + Math.abs(p.vx) * .03;
        const dir = sign(p.vx);
        pLine(p.x - dir * 11 - camViewX(), yy, p.x - dir * (11 + len) - camViewX(), yy, `rgba(137,159,189,${.10 - i * .02})`, 1);
      }
      ctx.restore();
    }
    if (p.parry) {
      const sx = p.x - camViewX(), sy = p.y - 24 + camViewY();
      const pulse = .5 + Math.sin(p.animTime * 28) * .2;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      pArc(sx, sy, 17, -1.35 + (p.facing < 0 ? Math.PI : 0), 1.1 + (p.facing < 0 ? Math.PI : 0), 'rgba(183,225,255,.8)', 1, pulse, .8);
      pArc(sx, sy, 20, -.9 + (p.facing < 0 ? Math.PI : 0), .7 + (p.facing < 0 ? Math.PI : 0), 'rgba(255,255,255,.35)', 1, pulse * .7, .8);
      ctx.restore();
    }
    // iai draw: killing intent condensing — blood glow at the sheathed blade + eyes
    if (p.attack && p.attack.t < ATTACKS[p.attackIndex].startup) {
      const pulse = .5 + .5 * Math.sin(p.animTime * 34);
      const isUlt = p.attackIndex === 2;
      const sp = getSwordPose();
      const gx = sp.handWorld.x - camViewX(), gy = sp.handWorld.y + camViewY();
      glow(gx, gy, 14 + pulse * 7, isUlt ? 'rgba(120,185,255,.34)' : 'rgba(255,38,56,.38)', .55 + pulse * .3);
      glow(gx, gy, 26 + pulse * 6, isUlt ? 'rgba(30,70,140,.10)' : 'rgba(170,14,30,.12)', .8);
      if (e) {
        glow(e.x - camViewX(), e.y + camViewY(), 9 + pulse * 5, 'rgba(255,60,80,.5)', .9);
      }
    }

    // 次元斩落鞘“咔”：鞘口冷白四芒星，没有红色圆环/能量丝
    if (p.attack && p.attackIndex === 2) {
      const bt = ultBurstTime(ATTACKS[2]);
      const at = p.attack.t;
      if (at >= bt && at < bt + .08) {
        const sp = getSwordPose();
        const gx = sp.handWorld.x - camViewX(), gy = sp.handWorld.y + camViewY();
        const a = 1 - (at - bt) / .08;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1;
        glow(gx, gy, 10 + 6 * a, 'rgba(190,230,255,.55)', .6 * a);
        pLine(gx - 4, gy, gx + 4, gy, '#ffffff', 1);
        pLine(gx, gy - 4, gx, gy + 4, '#ffffff', 1);
        pLine(gx - 2, gy - 2, gx + 2, gy + 2, '#9fd0ff', 1);
        pLine(gx - 2, gy + 2, gx + 2, gy - 2, '#9fd0ff', 1);
        ctx.restore();
      }
    }
  }

  /* ============================================================
     ENEMIES · 紫爪
     ============================================================ */
  let enemies = [];
  let enemyId = 0;

  const ENEMY_TYPES = {
    stalker: {
      key: 'stalker', name: '裂爪者', scale: 1, hp: 77, speed: 42, dmg: 14, reach: 55,
      windup: .42, strikeDur: .26, hitDelay: .055, recover: .52, lunge: 82,
      cooldown: [.5, .95], width: 22, height: 47, elite: false
    },
    brute: {
      key: 'brute', name: '紫魇', scale: 1.6, hp: 400,
      // 一阶段 400；转阶段后只把二阶段血量抬到 450，一阶段不变
      phase2Hp: 450,
      // 一阶段移速 42；二阶段只替换移速这一个数值（仍明显慢于玩家 118）
      speed: 42, phase2Speed: 60, dmg: 23, reach: 68,
      windup: .65, strikeDur: .32, hitDelay: .075, recover: .68, lunge: 96,
      // 三连爪：近战爪击约 35% 概率连挥三段——每一段都是完整的
      // 抬爪+警示符+警示音（可逐段振刀/闪避），段间短停顿，第三段后明显硬直。
      // 四连爪仅二阶段：前三段间隔与三连爪相同，第四段后硬直更长。
      clawComboChance: .35, clawComboGap: .18, clawComboRecover: 1.1,
      clawQuadChance: .3, clawQuadRecover: 1.7,
      cooldown: [.65, 1.2], width: 27, height: 61, elite: true,
      // 绿色冲击波：更长的蓄力（1.0s）后喷出更大、更厚的毒潮。
      cast: 1.0, castRange: 300, waveDmg: 18, waveR: 27, waveInterval: 3.5,
      // 裂影突袭：锁定落点 → 瞬移贴脸 → 重爪斩。落点有紫色法阵，可走位/闪身/振刀。
      riftWindup: .68, riftDmg: 26, riftReach: 96, riftLunge: 54,
      riftHitDelay: .12, riftCooldown: [1.4, 2.0],
      // 紫渊裂地：在玩家周围刻五道裂痕，地刺依次破土。可跳跃/闪身躲开。
      spikeCast: 1.0, spikeDmg: 18, spikeCount: 5, spikeWidth: 30,
      spikeCooldown: [1.5, 2.2],
      // 紫渊审判：在玩家脚下升起贯穿天地的紫光柱，横向闪身才能躲。
      beamCast: 1.0, beamDmg: 22, beamWidth: 30, beamCooldown: [2.0, 2.8],
      // ---- 二阶段新技能：只在 phase 2 的出招池中出现 ----
      // 血雨葬：五道血柱依次贯穿玩家周围，只能横向走位/闪身。
      p2NewSkillChance: .5,
      rainCast: 1.55, rainDmg: 15, rainCount: 5, rainWidth: 18,
      rainRecover: .35, rainCooldown: [2.2, 3.0],
      // 血蚀池：三片持续血池封锁地面，可走出或跳过。
      poolCast: 1.30, poolDmg: 9, poolCount: 3, poolWidth: 48,
      poolDuration: 4.0, poolRecover: .45, poolCooldown: [2.8, 3.6],
      // 血骸冲锋：蓄力直线冲锋，冲过玩家约 70px 后失稳；可跳、闪、振刀。
      chargeWindup: .72, chargeSpeed: 420, chargeOvershoot: 70,
      chargeDmg: 24, chargeHitW: 34, chargeHitH: 38,
      chargeCrash: 1.5, chargeCooldown: [2.4, 3.4]
    }
  };

  function makeEnemy(typeKey, x) {
    const type = ENEMY_TYPES[typeKey];
    const e = {
      id: ++enemyId,
      type, typeKey, x, y: FLOOR, facing: -1,
      hp: type.hp, maxHp: type.hp, scale: type.scale,
      state: 'emerge', stateT: 0, emergeDur: rand(.62, .88),
      animTime: rand(0, 8), seed: rand(0, 10),
      flash: 0, kvx: 0, deathT: 0, cooldown: rand(.5, .9),
      attackHit: false, warned: false, warnedLate: false, removed: false,
      staggerDur: 1.25, hasSpawned: false, waveCd: rand(1.5, 3.5),
      phase: 1,
      lastSkill: null, nextCooldown: 0, clawColor: null,
      clawQuad: false, bloodTimer: 0,
      riftX: 0, riftFromX: 0, riftStrike: false,
      strikeReach: 0, strikeDmg: 0, strikeLunge: 0, strikeHitDelay: 0,
      canBeHit() {
        return this.state !== 'emerge' && this.state !== 'dying' && this.hp > 0;
      },
      width() { return this.type.width * this.scale; },
      alive() { return this.state !== 'dying' && this.hp > 0; }
    };
    e.facing = player.x < x ? -1 : 1;
    return e;
  }

  function spawnEnemyAt(typeKey, x) {
    const e = makeEnemy(typeKey, x);
    enemies.push(e);
    Sound.spawn();
    addTrauma(.08);
    spawnParticles(x, FLOOR - 2, 18, {
      colors: ['#8a3fa1', '#57236b', '#c271d6', '#2a1037'],
      speed: [20, 120], life: [.35, .9], size: [1, 2], gravity: -60,
      drag: .8, angle: [-Math.PI + .25, -.25], additive: false, jitter: 8
    });
    rings.push({ x, y: FLOOR - 2, maxR: 26, life: 0, dur: .45, color: '#ac63c4', thick: 1 });
    return e;
  }

  function updateEnemies(dt, t) {
    for (const e of enemies) updateEnemy(e, dt, t);
    // [MOD 3] 怪物之间不再做横向排斥/推挤：可重叠站立，不再排队。
    for (const e of enemies) {
      e.x = clamp(e.x, 26, WORLD_W - 26);
      if (e.removed) continue;
    }
    const before = enemies.length;
    enemies = enemies.filter(e => !e.removed);
    if (enemies.length !== before) syncEnemyPips();

    // 绿色冲击波更新：水平飞行 + 绿色拖尾 + 命中玩家（振刀弹反 / 瞬移穿过）
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.life += dt;
      w.x += w.vx * dt;
      if (Math.random() < dt * 34) {
        spawnParticles(w.x - w.vx * .03, w.y + rand(-3, 3), 1, {
          colors: ['#7dffb0', '#c8ffde', '#1d8a3c'], speed: [4, 16], life: [.12, .3],
          size: [1, 1], gravity: 0, drag: 2.2,
          angle: [w.vx > 0 ? Math.PI - .35 : -.35, w.vx > 0 ? Math.PI + .35 : .35],
          additive: true
        });
      }
      const pl = player;
      if (pl.alive && gameState === 'playing' && pl.dashTimer <= 0 &&
          Math.abs(pl.x - w.x) < 15 + w.r && Math.abs(pl.y - w.y) < 44) {
        w.life = w.dur; // 波命中即消散
        if (isParryActive()) {
          // 振刀弹反：斩碎冲击波
          pl.parry = false; pl.parryT = 0; pl.parryCd = .38;
          pl.invuln = Math.max(pl.invuln, .4);
          pl.deflects++; pl.combo += 2; pl.comboTimer = 3.1;
          pl.maxCombo = Math.max(pl.maxCombo, pl.combo);
          spawnParticles(w.x, w.y, 16, {
            colors: ['#b9ffd2', '#5eff8a', '#ffffff', '#1d8a3c'], speed: [40, 190], life: [.15, .45],
            size: [1, 2], gravity: 0, drag: 1.6, angle: [0, TAU], additive: true, jitter: 5
          });
          rings.push({ x: w.x, y: w.y, maxR: 20, life: 0, dur: .26, color: '#d6ffe6', thick: 1 });
          addTrauma(.16);
          Sound.parry();
        } else {
          playerHurt(w.dmg, w.x);
        }
      }
      if (w.life >= w.dur || w.x < -80 || w.x > WORLD_W + 80) waves.splice(i, 1);
    }
    updateBossHazards(dt);
  }

  function updateEnemy(e, dt, t) {
    e.animTime += dt;
    e.stateT += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.state === 'dying') {
      e.deathT += dt;
      if (e.deathT > .92) e.removed = true;
      return;
    }
    if (e.state === 'emerge') {
      if (e.stateT >= e.emergeDur) {
        e.state = 'idle';
        e.stateT = 0;
        e.cooldown = rand(.35, .8);
        e.hasSpawned = true;
        rings.push({ x: e.x, y: FLOOR - 2, maxR: 18, life: 0, dur: .3, color: '#8a4aa0', thick: 1 });
        spawnDust(e.x, FLOOR + 1, 0, 5);
      }
      return;
    }
    // knockback
    e.x += e.kvx * dt;
    e.kvx = damp(e.kvx, 0, 5.5, dt);
    if (e.cooldown > 0) e.cooldown -= dt;
    if (e.waveCd > 0) e.waveCd -= dt;
    // 二阶段背部滴血：低频生成，单滴独立下落，落到地面即消失
    if (e.typeKey === 'brute' && e.phase === 2) updateBossBlood(e, dt);
    if (!player.alive && e.state !== 'stagger') {
      e.state = 'idle';
      e.stateT = 0;
      e.nextCooldown = 0;
      return;
    }
    const dx = player.x - e.x;
    const dist = Math.abs(dx);
    // 冲锋期间保持冲锋朝向，避免冲过玩家后身体翻转
    if (e.state !== 'strike' && e.state !== 'charge') e.facing = dx < 0 ? -1 : 1;

    if (e.state === 'stagger') {
      if (e.stateT >= e.staggerDur) {
        e.state = 'idle';
        e.stateT = 0;
        e.cooldown = rand(.4, .9);
      }
      return;
    }
    if (e.state === 'cast') {
      // 紫魇施法：更长蓄力，结束后喷出毒潮
      if (e.stateT >= e.type.cast) {
        e.state = 'chase';
        e.stateT = 0;
        e.cooldown = rand(.7, 1.3);
        spawnGreenWave(e);
      } else {
        if (!e.warned && e.stateT > e.type.cast * .45) {
          e.warned = true;
          Sound.enemyWarn(true);
        } else if (!e.warnedLate && e.stateT > e.type.cast * .75) {
          e.warnedLate = true;
          Sound.enemyWarnFinal(true);
        }
      }
      return;
    }
    if (e.state === 'rift') {
      const dur = e.type.riftWindup || .68;
      if (e.stateT >= dur) {
        e.riftFromX = e.x;
        e.x = e.riftX;
        e.facing = player.x < e.x ? -1 : 1;
        e.state = 'strike';
        e.stateT = 0;
        e.attackHit = false;
        e.riftStrike = true;
        e.strikeReach = e.type.riftReach || 96;
        e.strikeDmg = e.type.riftDmg || 26;
        e.strikeLunge = e.type.riftLunge || 54;
        e.strikeHitDelay = e.type.riftHitDelay || .12;
        e.clawColor = '#c271d6';
        Sound.enemyRift();
        Sound.enemySwing(true);
        addTrauma(.22);
        screenFlash(.08, '190,120,240');
        rings.push({ x: e.riftFromX, y: FLOOR - 2, maxR: 30, life: 0, dur: .32, color: '#c271d6', thick: 1 });
        rings.push({ x: e.x, y: FLOOR - 2, maxR: 34, life: 0, dur: .34, color: '#e2a9ef', thick: 1 });
        rings.push({ x: e.x, y: FLOOR - 2, maxR: 50, life: 0, dur: .40, color: '#8a3fa1', thick: 1 });
        spawnParticles(e.riftFromX, FLOOR - 20, 22, {
          colors: ['#8a3fa1', '#c271d6', '#e2a9ef', '#2a1037'], speed: [30, 150],
          life: [.2, .55], size: [1, 2], gravity: -20, drag: 1.4,
          angle: [-Math.PI, 0], additive: true, jitter: 7
        });
        spawnParticles(e.x, FLOOR - 22, 28, {
          colors: ['#c271d6', '#e2a9ef', '#7d3d92', '#ffffff'], speed: [40, 190],
          life: [.18, .55], size: [1, 2], gravity: 20, drag: 1.5,
          angle: [0, TAU], additive: true, jitter: 6
        });
        spawnDust(e.x, FLOOR + 1, e.facing, 8, '#7a5e78');
        return;
      }
      if (!e.warned && e.stateT > dur * .56) {
        e.warned = true;
        Sound.enemyWarn(true);
      } else if (!e.warnedLate && e.stateT > dur * .84) {
        e.warnedLate = true;
        Sound.enemyWarnFinal(true);
      }
      return;
    }
    if (e.state === 'beam') {
      const dur = e.type.beamCast || 1.0;
      if (e.stateT >= dur) {
        e.state = 'recover';
        e.stateT = 0;
        e.clawEnd = 0;
        return;
      }
      if (!e.warned && e.stateT > dur * .42) {
        e.warned = true;
        Sound.enemyWarn(true);
      } else if (!e.warnedLate && e.stateT > dur * .72) {
        e.warnedLate = true;
        Sound.enemyWarnFinal(true);
      }
      return;
    }
    if (e.state === 'spikes') {
      const dur = e.type.spikeCast || 1.0;
      if (e.stateT >= dur) {
        e.state = 'recover';
        e.stateT = 0;
        e.clawEnd = 0;
        return;
      }
      if (!e.warned && e.stateT > dur * .42) {
        e.warned = true;
        Sound.enemyWarn(true);
      } else if (!e.warnedLate && e.stateT > dur * .70) {
        e.warnedLate = true;
        Sound.enemyWarnFinal(true);
      }
      return;
    }
    if (e.state === 'rain') {
      // 血雨葬：双爪高举蓄势，血柱在玩家周围依次落下
      if (e.stateT >= (e.type.rainCast || 1.55)) {
        e.state = 'recover';
        e.stateT = 0;
        e.clawEnd = e.type.rainRecover || .35;
      } else if (!e.warned && e.stateT > (e.type.rainCast || 1.55) * .55) {
        e.warned = true;
        Sound.enemyWarn(true);
      } else if (!e.warnedLate && e.stateT > (e.type.rainCast || 1.55) * .82) {
        e.warnedLate = true;
        Sound.enemyWarnFinal(true);
      }
      return;
    }
    if (e.state === 'pools') {
      // 血蚀池：压低重心砸地，三片血池从玩家脚下涌出
      if (e.stateT >= (e.type.poolCast || 1.3)) {
        e.state = 'recover';
        e.stateT = 0;
        e.clawEnd = e.type.poolRecover || .45;
      } else if (!e.warned && e.stateT > (e.type.poolCast || 1.3) * .55) {
        e.warned = true;
        Sound.enemyWarn(true);
      } else if (!e.warnedLate && e.stateT > (e.type.poolCast || 1.3) * .82) {
        e.warnedLate = true;
        Sound.enemyWarnFinal(true);
      }
      return;
    }
    if (e.state === 'charge') {
      const phase = e.chargePhase;
      if (phase === 'windup') {
        const dur = e.type.chargeWindup || .72;
        if (e.stateT >= dur) {
          e.chargePhase = 'dash';
          e.stateT = 0;
          e.attackHit = false;
          e.facing = e.chargeDir;
          Sound.enemySwing(true);
          addTrauma(.12);
        } else if (!e.warned && e.stateT > dur * .55) {
          e.warned = true;
          Sound.enemyWarn(true);
        } else if (!e.warnedLate && e.stateT > dur * .82) {
          e.warnedLate = true;
          Sound.enemyWarnFinal(true);
        }
        return;
      }
      if (phase === 'dash') {
        const dir = e.chargeDir;
        e.x += dir * (e.type.chargeSpeed || 420) * dt;
        e.chargeDustT -= dt;
        if (e.chargeDustT <= 0) {
          e.chargeDustT = .06;
          spawnParticles(e.x - dir * e.width() * .45, FLOOR - 2, 1, {
            colors: ['#3a0a12', '#5e0e1a', '#6b4a52'], speed: [10, 34],
            life: [.16, .38], size: [1, 2], gravity: 60, drag: 1.6,
            angle: [dir > 0 ? Math.PI - .4 : -.4, dir > 0 ? Math.PI + .4 : .4],
            additive: false, jitter: 2
          });
        }
        // 冲锋只结算一次；振刀可当场截停
        if (!e.chargeHit && player.alive && gameState === 'playing' &&
            Math.abs(player.x - e.x) < (e.type.chargeHitW || 34) &&
            Math.abs(player.y - FLOOR) < (e.type.chargeHitH || 38)) {
          e.chargeHit = true;
          if (isParryActive()) {
            deflectEnemy(e);
            return;
          }
          playerHurt(e.type.chargeDmg || 24, e.x);
        }
        const reached = dir > 0 ? e.x >= e.chargeEndX : e.x <= e.chargeEndX;
        if (reached || e.stateT >= 1.0) {
          e.x = clamp(reached ? e.chargeEndX : e.x, 26, WORLD_W - 26);
          e.chargePhase = 'crash';
          e.stateT = 0;
          Sound.enemySpike();
          addTrauma(.35);
          screenFlash(.08, '180,45,60');
          rings.push({ x: e.x, y: FLOOR - 2, maxR: 40, life: 0, dur: .34, color: '#c93145', thick: 1 });
          rings.push({ x: e.x, y: FLOOR - 2, maxR: 24, life: 0, dur: .26, color: '#ffd0d4', thick: 1 });
          spawnParticles(e.x, FLOOR - 4, 18, {
            colors: ['#3a0a12', '#5e0e1a', '#8a1a28', '#c93145', '#6b4a52'], speed: [30, 150],
            life: [.2, .6], size: [1, 2], gravity: 260, drag: .8,
            angle: [dir > 0 ? Math.PI - .8 : -.8, dir > 0 ? Math.PI + .8 : .8],
            additive: false, jitter: 8
          });
        }
        return;
      }
      // crash
      if (e.stateT >= (e.type.chargeCrash || 1.5)) {
        e.state = 'chase';
        e.stateT = 0;
        e.chargePhase = null;
        e.clawCombo = false;
        e.clawQuad = false;
        e.clawEnd = 0;
        e.cooldown = e.nextCooldown || rand(e.type.cooldown[0], e.type.cooldown[1]);
        e.nextCooldown = 0;
      }
      return;
    }
    if (e.state === 'windup') {
      // 三连爪段间停顿：上一段落爪后的短暂静默（尚未抬爪，无警示音/提示）
      if (e.clawGap > 0) {
        e.clawGap -= dt;
        return;
      }
      if (e.stateT >= e.type.windup) {
        e.state = 'strike';
        e.stateT = 0;
        e.attackHit = false;
        Sound.enemySwing(e.type.elite);
        addTrauma(e.type.elite ? .16 : .1);
      } else if (!e.warned && e.stateT > e.type.windup * .56) {
        e.warned = true;
        Sound.enemyWarn(e.type.elite);
      } else if (!e.warnedLate && e.stateT > e.type.windup * .84) {
        e.warnedLate = true;
        Sound.enemyWarnFinal(e.type.elite);
      }
      return;
    }
    if (e.state === 'strike') {
      const lunge = e.strikeLunge || e.type.lunge;
      const hitDelay = e.strikeHitDelay || e.type.hitDelay;
      e.x += e.facing * lunge * dt;
      if (!e.attackHit && e.stateT >= hitDelay) {
        e.attackHit = true;
        enemyStrike(e);
      }
      if (e.stateT >= e.type.strikeDur) {
        if (e.clawCombo && e.clawSeg < (e.clawQuad ? 4 : 3)) {
          // 三连爪 / 四连爪：短间隔后进入下一段——完整警示流程（警示音/警示符）重来
          e.clawSeg++;
          e.clawGap = e.type.clawComboGap;
          e.state = 'windup';
          e.stateT = 0;
          e.warned = false;
          e.warnedLate = false;
          e.attackHit = false;
          e.facing = player.x < e.x ? -1 : 1;
          Sound.enemyWindup(e.type.elite);
          return;
        }
        e.state = 'recover';
        e.stateT = 0;
        // 连爪收招：三连爪第三段、四连爪第四段额外硬直，
        // 四连爪多判一次的奖励是更长的反击窗口（普通爪击无额外硬直）。
        e.clawEnd = e.clawCombo
          ? (e.clawQuad ? e.type.clawQuadRecover : e.type.clawComboRecover)
          : 0;
      }
      return;
    }
    if (e.state === 'recover') {
      if (e.stateT >= e.type.recover + (e.clawEnd || 0)) {
        e.state = 'chase';
        e.stateT = 0;
        e.cooldown = e.nextCooldown || rand(e.type.cooldown[0], e.type.cooldown[1]);
        e.nextCooldown = 0;
        e.clawEnd = 0;
        e.clawCombo = false;
        e.clawQuad = false;
        e.riftStrike = false;
        e.strikeReach = 0;
        e.strikeDmg = 0;
        e.strikeLunge = 0;
        e.strikeHitDelay = 0;
      }
      return;
    }
    // idle / chase
    const targetDist = e.type.reach * .85;
    if (dist > targetDist) {
      e.state = 'chase';
      const approach = clamp(dist - targetDist, 0, 80);
      // 二阶段只加快移速：42 → 60，追击更紧但仍远慢于玩家，不会被它溜着跑
      const chaseSpeed = e.typeKey === 'brute' && e.phase === 2
        ? (e.type.phase2Speed || e.type.speed)
        : e.type.speed;
      const spd = chaseSpeed * (dist < 100 ? .8 : 1);
      e.x += sign(dx) * spd * dt;
      if (chance(dt * .7)) spawnDust(e.x, FLOOR + 1, -sign(dx), 1);
    } else {
      e.state = 'idle';
      e.x += Math.sin(e.animTime * 1.8 + e.seed) * 1.4 * dt;
    }
    if (e.cooldown > 0 || !canEnemyStartAttack(e)) return;
    if (e.typeKey === 'brute') {
      // 紫魇：远距离也能出招，按距离选择爪击/绿波/裂影/裂地
      chooseBossSkill(e, dist);
    } else if (dist <= targetDist) {
      startEnemyWindup(e);
    }
  }

  function canEnemyStartAttack(e) {
    if (!player.alive || gameState !== 'playing') return false;
    const busy = enemies.some(o => o !== e &&
      (o.state === 'windup' || o.state === 'strike' || o.state === 'cast' ||
       o.state === 'rift' || o.state === 'spikes' || o.state === 'beam' ||
       o.state === 'rain' || o.state === 'pools' || o.state === 'charge'));
    return !busy;
  }

  // 紫魇出招池：远/近距离混合，避免同一招连续两次；绿波受 waveCd 限制。
  function chooseBossSkill(e, dist) {
    const canWave = e.waveCd <= 0;
    const p2 = e.phase === 2;
    // 四连爪：二阶段近身专属，连续四段完整警示；不与自身连续重复。
    // 一阶段完全不走这里；二阶段原有四招参数不变，只在其之前增加新技能预掷。
    if (p2 && dist <= e.type.reach * 1.25 && e.lastSkill !== 'claw4' &&
        Math.random() < (e.type.clawQuadChance || .3)) {
      e.lastSkill = 'claw4';
      startEnemyWindup(e, true);
      return;
    }
    // 二阶段新技能：四连爪判定之后单独预掷，未命中则回落到原有四招权重池。
    if (p2 && tryStartPhase2Skill(e, dist)) return;
    const r = Math.random();
    let choice;
    if (dist > 120) {
      if (p2) {
        if (canWave) choice = r < .20 ? 'rift' : r < .50 ? 'spikes' : r < .85 ? 'beam' : 'wave';
        else choice = r < .24 ? 'rift' : r < .59 ? 'spikes' : 'beam';
      } else if (canWave) {
        choice = r < .30 ? 'rift' : r < .55 ? 'spikes' : r < .80 ? 'beam' : 'wave';
      } else {
        choice = r < .40 ? 'rift' : r < .70 ? 'spikes' : 'beam';
      }
    } else {
      if (p2) {
        if (canWave) choice = r < .15 ? 'wave' : r < .35 ? 'rift' : r < .65 ? 'spikes' : 'beam';
        else choice = r < .24 ? 'rift' : r < .59 ? 'spikes' : 'beam';
      } else if (canWave) {
        choice = r < .25 ? 'wave' : r < .50 ? 'rift' : r < .75 ? 'spikes' : 'beam';
      } else {
        choice = r < .35 ? 'rift' : r < .68 ? 'spikes' : 'beam';
      }
    }
    if (choice === e.lastSkill) {
      if (choice === 'rift') choice = 'spikes';
      else if (choice === 'spikes') choice = 'beam';
      else if (choice === 'beam') choice = 'rift';
      else choice = 'rift';
    }
    e.lastSkill = choice;
    if (choice === 'rift') startRiftDash(e);
    else if (choice === 'spikes') startBossSpikes(e);
    else if (choice === 'beam') startBossBeam(e);
    else startEnemyWave(e);
  }

  // 二阶段新技能预掷：只从当前距离可用、且不与上一招重复的技能中选。
  // 返回 true 表示已经出招；false 时继续走原有二阶段权重池。
  function tryStartPhase2Skill(e, dist) {
    if (e.phase !== 2) return false;
    const options = [];
    if (e.lastSkill !== 'rain') options.push('rain');
    if (e.lastSkill !== 'pools' && dist < 340) options.push('pools');
    if (e.lastSkill !== 'charge' && dist < 300) options.push('charge');
    if (!options.length) return false;
    if (Math.random() >= (e.type.p2NewSkillChance || .5)) return false;
    const choice = pick(options);
    e.lastSkill = choice;
    if (choice === 'rain') startBossBloodRain(e);
    else if (choice === 'pools') startBossBloodPools(e);
    else startBossCharge(e);
    return true;
  }

  // 血雨葬：五道血柱从穹顶依次砸落；横向贯穿，跳跃躲不掉。
  function startBossBloodRain(e) {
    e.state = 'rain';
    e.stateT = 0;
    e.warned = false;
    e.warnedLate = false;
    e.attackHit = false;
    e.clawCombo = false;
    e.clawQuad = false;
    e.clawSeg = 0;
    e.clawGap = 0;
    e.clawEnd = 0;
    e.facing = player.x < e.x ? -1 : 1;
    e.clawColor = '#c93145';
    e.nextCooldown = rand(e.type.rainCooldown[0], e.type.rainCooldown[1]);
    Sound.enemyWindup(true);
    const offsets = [0, -64, 64, -128, 128];
    const seen = [];
    for (let i = 0; i < (e.type.rainCount || 5); i++) {
      const x = clamp(player.x + (offsets[i] !== undefined ? offsets[i] : 0), 30, WORLD_W - 30);
      if (seen.some(v => Math.abs(v - x) < 6)) continue;
      seen.push(x);
      bossHazards.push({
        kind: 'rain', x, w: e.type.rainWidth || 18, t: 0,
        warn: 1.05 + (seen.length - 1) * .07, active: .20,
        dmg: e.type.rainDmg || 15, hit: false, erupted: false
      });
    }
    spawnParticles(e.x, FLOOR - 34 * e.scale, 10, {
      colors: ['#8a1a28', '#c93145', '#ff6b78', '#3a0a12'], speed: [8, 45],
      life: [.3, .7], size: [1, 2], gravity: -30, drag: 1.1,
      angle: [-Math.PI, 0], additive: true, jitter: 8
    });
  }

  // 血蚀池：旧池先清空，再在玩家脚下刻三片持续 4 秒的血池。
  function startBossBloodPools(e) {
    e.state = 'pools';
    e.stateT = 0;
    e.warned = false;
    e.warnedLate = false;
    e.attackHit = false;
    e.clawCombo = false;
    e.clawQuad = false;
    e.clawSeg = 0;
    e.clawGap = 0;
    e.clawEnd = 0;
    e.facing = player.x < e.x ? -1 : 1;
    e.clawColor = '#8a1a28';
    e.nextCooldown = rand(e.type.poolCooldown[0], e.type.poolCooldown[1]);
    Sound.enemyWindup(true);
    for (let i = bossHazards.length - 1; i >= 0; i--) {
      if (bossHazards[i].kind === 'pool') {
        bossHazards[i] = bossHazards[bossHazards.length - 1];
        bossHazards.pop();
      }
    }
    const offsets = [-80, 0, 80];
    const seen = [];
    for (let i = 0; i < (e.type.poolCount || 3); i++) {
      const dx = offsets[i] !== undefined ? offsets[i] : (i % 2 ? 80 : -80);
      const x = clamp(player.x + dx, 34, WORLD_W - 34);
      if (seen.some(v => Math.abs(v - x) < 10)) continue;
      seen.push(x);
      const r = (e.type.poolWidth || 48) / 2;
      const pts = [];
      const innerPts = [];
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * TAU;
        pts.push([x + Math.cos(a) * r, FLOOR - 1 + Math.sin(a) * r * .32]);
        innerPts.push([x + Math.cos(a) * r * .62, FLOOR - 1 + Math.sin(a) * r * .29]);
      }
      bossHazards.push({
        kind: 'pool', x, w: e.type.poolWidth || 48, t: 0,
        warn: .95 + (seen.length - 1) * .05, active: e.type.poolDuration || 4,
        dmg: e.type.poolDmg || 9, hit: false, erupted: false, pts, innerPts
      });
    }
    spawnParticles(e.x, FLOOR - 4, 10, {
      colors: ['#3a0a12', '#5e0e1a', '#8a1a28', '#c93145'], speed: [15, 60],
      life: [.3, .7], size: [1, 2], gravity: -35, drag: 1.1,
      angle: [-Math.PI, 0], additive: true, jitter: 8
    });
  }

  // 血骸冲锋：蓄力 → 直线冲锋 → 到点/撞墙失稳。振刀可直接截停。
  function startBossCharge(e) {
    e.state = 'charge';
    e.stateT = 0;
    e.warned = false;
    e.warnedLate = false;
    e.attackHit = false;
    e.clawCombo = false;
    e.clawQuad = false;
    e.clawSeg = 0;
    e.clawGap = 0;
    e.clawEnd = 0;
    e.chargePhase = 'windup';
    e.chargeDir = player.x < e.x ? -1 : 1;
    e.chargeEndX = clamp(player.x + e.chargeDir * (e.type.chargeOvershoot || 70), 26, WORLD_W - 26);
    e.chargeHit = false;
    e.chargeDustT = 0;
    e.facing = e.chargeDir;
    e.clawColor = '#c93145';
    e.nextCooldown = rand(e.type.chargeCooldown[0], e.type.chargeCooldown[1]);
    Sound.enemyWindup(true);
    spawnParticles(e.x, FLOOR - 4, 12, {
      colors: ['#3a0a12', '#5e0e1a', '#8a1a28', '#6b4a52'], speed: [18, 70],
      life: [.25, .6], size: [1, 2], gravity: -40, drag: 1.1,
      angle: [-Math.PI, 0], additive: false, jitter: 7
    });
  }

  // 二阶段背部滴血：每秒 3–5 滴，暗红单粒、低频生成。
  // 使用统一的粒子预算与降载通道，不额外堆叠粒子系统。
  function updateBossBlood(e, dt) {
    if (e.typeKey !== 'brute' || e.phase !== 2) return;
    e.bloodTimer -= dt;
    if (e.bloodTimer > 0) return;
    // 0.20–0.33s 一滴 = 约 3–5 滴/秒；即使某帧预算耗尽也不补刷
    e.bloodTimer = rand(.20, .33);
    if (!player.alive || gameState !== 'playing' || e.state === 'dying') return;
    const s = e.scale;
    // 从背部偏后、偏上的位置渗出，竖直下落
    spawnParticles(
      e.x - e.facing * rand(13, 18) * s,
      e.y - rand(31, 44) * s,
      1,
      {
        colors: ['#7a1420', '#8a1a28', '#66101b'],
        speed: [1, 5], life: [1.6, 2.0], size: [1, 1],
        gravity: 320, drag: 0,
        angle: [Math.PI * .5 - .12, Math.PI * .5 + .12],
        additive: false, jitter: 1.5, blood: true
      }
    );
  }

  // 裂影突袭：锁定玩家侧前方 46px 作为落点，瞬移后接一记重爪斩。
  function startRiftDash(e) {
    e.state = 'rift';
    e.stateT = 0;
    e.warned = false;
    e.warnedLate = false;
    e.attackHit = false;
    e.clawCombo = false;
    e.clawSeg = 0;
    e.clawGap = 0;
    e.clawEnd = 0;
    e.riftFromX = e.x;
    const side = e.x <= player.x ? -1 : 1;
    e.riftX = clamp(player.x + side * 46, 40, WORLD_W - 40);
    e.facing = player.x < e.x ? -1 : 1;
    e.clawColor = '#c271d6';
    e.nextCooldown = rand(e.type.riftCooldown[0], e.type.riftCooldown[1]);
    Sound.enemyWindup(true);
    if (!riftTipShown) {
      riftTipShown = true;
      showHint('SHIFT', '裂影突袭', '地面紫环是落点 · 闪身穿过或 K 振刀', 5.2);
    }
    spawnParticles(e.x, FLOOR - 4, 10, {
      colors: ['#8a3fa1', '#c271d6', '#e2a9ef'], speed: [12, 50],
      life: [.25, .55], size: [1, 2], gravity: -30, drag: 1.2,
      angle: [-Math.PI, 0], additive: true, jitter: 6
    });
  }

  // 紫渊裂地：在玩家周围刻五道裂痕，地刺按 0.62–1.18s 依次破土。
  function startBossSpikes(e) {
    e.state = 'spikes';
    e.stateT = 0;
    e.warned = false;
    e.warnedLate = false;
    e.attackHit = false;
    e.clawCombo = false;
    e.clawSeg = 0;
    e.clawGap = 0;
    e.clawEnd = 0;
    e.facing = player.x < e.x ? -1 : 1;
    e.clawColor = '#c271d6';
    e.nextCooldown = rand(e.type.spikeCooldown[0], e.type.spikeCooldown[1]);
    Sound.enemyWindup(true);
    if (!spikeTipShown) {
      spikeTipShown = true;
      showHint('SPACE', '紫渊裂地', '五道裂痕依次破土 · 跳跃或闪身', 5.2);
    }
    const offsets = [0, -72, 72, -144, 144];
    for (let i = 0; i < e.type.spikeCount; i++) {
      const dx = offsets[i] !== undefined ? offsets[i] : (i % 2 ? 72 : -72);
      const x = clamp(player.x + dx, 28, WORLD_W - 28);
      bossHazards.push({
        kind: 'spike', x, w: e.type.spikeWidth || 30, t: 0, warn: .62 + i * .14, active: .34,
        dmg: e.type.spikeDmg, hit: false, erupted: false
      });
      spawnParticles(x, FLOOR - 2, 6, {
        colors: ['#8a3fa1', '#c271d6', '#e2a9ef'], speed: [6, 28],
        life: [.3, .7], size: [1, 1], gravity: -40, drag: 1,
        angle: [-Math.PI, 0], additive: true, jitter: 10
      });
    }
  }

  // 紫渊审判：在玩家脚下升起贯穿天地的紫光柱；横向移动/闪身才能躲，跳跃无效。
  function startBossBeam(e) {
    e.state = 'beam';
    e.stateT = 0;
    e.warned = false;
    e.warnedLate = false;
    e.attackHit = false;
    e.clawCombo = false;
    e.clawSeg = 0;
    e.clawGap = 0;
    e.clawEnd = 0;
    e.facing = player.x < e.x ? -1 : 1;
    e.clawColor = '#e2a9ef';
    e.nextCooldown = rand(e.type.beamCooldown[0], e.type.beamCooldown[1]);
    Sound.enemyWindup(true);
    if (!beamTipShown) {
      beamTipShown = true;
      showHint('SHIFT', '紫渊审判', '竖直紫光锁定脚下 · 向侧面闪身，跳跃无效', 5.2);
    }
    const x = clamp(player.x, 40, WORLD_W - 40);
    bossHazards.push({
      kind: 'beam', x, w: e.type.beamWidth || 30, t: 0, warn: .82, active: .26,
      dmg: e.type.beamDmg || 22, hit: false, erupted: false
    });
    spawnParticles(x, FLOOR - 2, 12, {
      colors: ['#c271d6', '#e2a9ef', '#8a3fa1'], speed: [10, 45],
      life: [.3, .7], size: [1, 1], gravity: -50, drag: 1,
      angle: [-Math.PI, 0], additive: true, jitter: 12
    });
  }

  function updateBossHazards(dt) {
    for (let i = bossHazards.length - 1; i >= 0; i--) {
      const h = bossHazards[i];
      h.t += dt;
      if (!h.erupted && h.t >= h.warn) {
        h.erupted = true;
        if (h.kind === 'beam') {
          Sound.enemyBeam();
          screenFlash(.10, '190,140,255');
          addTrauma(.16);
          rings.push({ x: h.x, y: FLOOR - 2, maxR: 44, life: 0, dur: .34, color: '#c271d6', thick: 1 });
          rings.push({ x: h.x, y: FLOOR - 2, maxR: 26, life: 0, dur: .28, color: '#ffffff', thick: 1 });
          spawnParticles(h.x, FLOOR - 24, 22, {
            colors: ['#c271d6', '#e2a9ef', '#ffffff', '#8a3fa1'], speed: [40, 170],
            life: [.16, .45], size: [1, 2], gravity: 100, drag: 1.2,
            angle: [-Math.PI * .75, -Math.PI * .25], additive: true, jitter: 9
          });
        } else if (h.kind === 'rain') {
          Sound.enemySpike();
          addTrauma(.06);
          rings.push({ x: h.x, y: FLOOR - 2, maxR: 20, life: 0, dur: .24, color: '#c93145', thick: 1 });
          spawnParticles(h.x, FLOOR - 10, 9, {
            colors: ['#3a0a12', '#5e0e1a', '#8a1a28', '#c93145'], speed: [20, 100],
            life: [.15, .45], size: [1, 2], gravity: 300, drag: .9,
            angle: [Math.PI * .2, Math.PI * .8], additive: false, jitter: 7
          });
        } else if (h.kind === 'pool') {
          Sound.enemySpike();
          addTrauma(.08);
          rings.push({ x: h.x, y: FLOOR - 2, maxR: 26, life: 0, dur: .3, color: '#8a1a28', thick: 1 });
          spawnParticles(h.x, FLOOR - 4, 12, {
            colors: ['#3a0a12', '#5e0e1a', '#8a1a28', '#c93145'], speed: [18, 90],
            life: [.25, .65], size: [1, 2], gravity: 170, drag: .8,
            angle: [-Math.PI, 0], additive: false, jitter: 9
          });
        } else {
          Sound.enemySpike();
          addTrauma(.12);
          rings.push({ x: h.x, y: FLOOR - 2, maxR: 28, life: 0, dur: .28, color: '#c271d6', thick: 1 });
          rings.push({ x: h.x, y: FLOOR - 2, maxR: 18, life: 0, dur: .22, color: '#e2a9ef', thick: 1 });
          rings.push({ x: h.x, y: FLOOR - 2, maxR: 36, life: 0, dur: .34, color: '#8a3fa1', thick: 1 });
          spawnParticles(h.x, FLOOR - 4, 20, {
            colors: ['#2a0e35', '#8a3fa1', '#c271d6', '#e2a9ef', '#ffd0ff'], speed: [30, 170],
            life: [.18, .55], size: [1, 2], gravity: 260, drag: .8,
            angle: [-Math.PI, 0], additive: false, jitter: 7
          });
          spawnDust(h.x, FLOOR + 1, 0, 7);
        }
      }
      if (h.erupted && h.t < h.warn + h.active) {
        const pl = player;
        if (pl.alive && gameState === 'playing' && pl.dashTimer <= 0) {
          if (h.kind === 'pool') {
            // 血池持续存在：靠玩家无敌帧限制 tick，不设一次性 hit
            if (pl.invuln <= 0 && Math.abs(pl.x - h.x) < h.w / 2 && pl.y > FLOOR - 18) {
              playerHurt(h.dmg, h.x);
            }
          } else if (!h.hit) {
            const inside = h.kind === 'beam'
              ? Math.abs(pl.x - h.x) < h.w / 2 + 6
              : h.kind === 'rain'
                ? Math.abs(pl.x - h.x) < h.w / 2 + 6
                : Math.abs(pl.x - h.x) < h.w / 2 + 8 && pl.y > FLOOR - 44;
            if (inside) {
              h.hit = true;
              playerHurt(h.dmg, h.x);
            }
          }
        }
      }
      if (h.t > h.warn + h.active + .3) {
        bossHazards[i] = bossHazards[bossHazards.length - 1];
        bossHazards.pop();
      }
    }
  }

  // 紫魇施法前摇：头顶感叹号警示（复用 drawDangerMark），爪心凝聚绿光。
  function startEnemyWave(e) {
    e.state = 'cast';
    e.stateT = 0;
    e.warned = false;
    e.warnedLate = false;
    e.facing = player.x < e.x ? -1 : 1;
    e.clawCombo = false;
    e.clawSeg = 0;
    e.clawEnd = 0;
    e.attackHit = false;
    e.clawColor = '#7dffb0';
    e.waveCd = e.type.waveInterval || 3.5;
    e.nextCooldown = 0;
    Sound.enemyWindup(true);
    // 更长的绿色蓄力：口中毒光、双层法环与上浮孢子
    const mx = e.x + e.facing * 15 * e.scale;
    const my = e.y - 35 * e.scale;
    spawnParticles(mx, my, 16, {
      colors: ['#5eff8a', '#b9ffd2', '#1d8a3c', '#eafff0'], speed: [8, 46],
      life: [.25, .6], size: [1, 2], gravity: 0, drag: 1.2,
      angle: [0, TAU], additive: true, jitter: 7
    });
    rings.push({ x: mx, y: my, maxR: 24, life: 0, dur: .55, color: '#7dffb0', thick: 1 });
    rings.push({ x: mx, y: my, maxR: 13, life: 0, dur: .42, color: '#eafff0', thick: 1 });
  }

  // 发射绿色冲击波：水平飞向玩家，可被振刀弹反、瞬移（无敌帧）穿过。
  // 波从嘴巴喷出后压到胸口高度（判定区域大幅放宽），站地玩家必定命中。
  function spawnGreenWave(e) {
    const dir = player.x < e.x ? -1 : 1;
    const ox = e.x + dir * 13 * e.scale;
    const oy = e.y - 14;
    waves.push({
      x: ox, y: oy, vx: dir * 215, vy: 0, r: e.type.waveR || 27,
      dmg: e.type.waveDmg, life: 0, dur: 3.2, seed: rand(0, TAU)
    });
    rings.push({ x: ox, y: oy, maxR: 34, life: 0, dur: .30, color: '#7dffb0', thick: 1 });
    rings.push({ x: ox, y: oy, maxR: 20, life: 0, dur: .24, color: '#eafff0', thick: 1 });
    rings.push({ x: ox, y: oy, maxR: 10, life: 0, dur: .18, color: '#ffffff', thick: 1 });
    // 吐息后坐：绿色气流从嘴向前喷出
    spawnParticles(ox, oy, 18, {
      colors: ['#7dffb0', '#c8ffde', '#1d8a3c', '#ffffff'], speed: [20, 130],
      life: [.15, .5], size: [1, 2], gravity: 40, drag: 1.8,
      angle: [dir > 0 ? -.65 : Math.PI - .65, dir > 0 ? .65 : Math.PI + .65], additive: true, jitter: 4
    });
    Sound.enemySwing(true);
    screenFlash(.05, '130,255,170');
    addTrauma(.12);
  }

  function startEnemyWindup(e, forceQuad = false) {
    e.state = 'windup';
    e.stateT = 0;
    e.warned = false;
    e.warnedLate = false;
    e.facing = player.x < e.x ? -1 : 1;
    e.attackHit = false;
    // 四连爪仅二阶段；三连爪：紫魇近战爪击约 35% 概率连挥三段，
    // 小怪 stalker 恒为 false，走原逻辑。
    e.clawQuad = !!forceQuad && e.typeKey === 'brute' && e.phase === 2;
    e.clawCombo = e.clawQuad ||
      (e.typeKey === 'brute' && Math.random() < (e.type.clawComboChance || .35));
    e.clawSeg = 1;
    e.clawGap = 0;
    e.clawEnd = 0;
    e.clawColor = null;
    e.nextCooldown = 0;
    e.riftStrike = false;
    e.strikeReach = 0;
    e.strikeDmg = 0;
    e.strikeLunge = 0;
    e.strikeHitDelay = 0;
    Sound.enemyWindup(e.type.elite);
    if (!tutorialTipShown) {
      tutorialTipShown = true;
      showHint('K', '看准紫爪', '警示符骤亮、爪锋将落的一瞬按下 K · 振刀可破其架势', 6.2);
    }
    // a flicker of purple sparks crawling up the raised claw
    spawnParticles(e.x + e.facing * 12, e.y - 25, 5, {
      colors: ['#9744ad', '#cf77df'], speed: [10, 45], life: [.25, .5], size: [1, 1],
      gravity: -45, drag: 1, angle: [-Math.PI, 0], additive: true, jitter: 6
    });
  }

  function enemyStrike(e) {
    const type = e.type;
    const reach = e.strikeReach || type.reach;
    const dmg = e.strikeDmg || type.dmg;
    const rift = !!e.riftStrike;
    const centerX = e.x + e.facing * (e.width() * .45);
    const centerY = e.y - 24 * e.scale;
    // claw streaks：普通爪击 3 道粉紫；裂影突袭 5 道紫/白重爪
    const arcCount = rift ? 5 : 3;
    for (let i = 0; i < arcCount; i++) {
      const r = 16 + i * 5;
      const a0 = e.facing > 0 ? -1.85 : Math.PI + 1.85;
      const a1 = e.facing > 0 ? -.22 : Math.PI - .22;
      slashArcs.push({
        x: centerX, y: centerY, r,
        a0: Math.min(a0, a1), a1: Math.max(a0, a1),
        color: rift
          ? (i === 2 ? '#ffffff' : i % 2 ? '#c271d6' : '#e2a9ef')
          : (i === 1 ? '#ff7ba5' : '#d46398'),
        life: 0, dur: rift ? .30 : .24, width: rift ? 7 : 6
      });
    }
    if (rift) {
      rings.push({ x: centerX, y: centerY, maxR: 58, life: 0, dur: .34, color: '#c271d6', thick: 1 });
      rings.push({ x: centerX, y: centerY, maxR: 36, life: 0, dur: .28, color: '#ffffff', thick: 1 });
      rings.push({ x: centerX, y: centerY, maxR: 76, life: 0, dur: .42, color: '#8a3fa1', thick: 1 });
    }
    // ground scratch
    spawnParticles(e.x + e.facing * (reach * .55), FLOOR - 2, rift ? 18 : 12, {
      colors: rift
        ? ['#8a3fa1', '#c271d6', '#e2a9ef', '#ffffff']
        : ['#713980', '#b268bf', '#ff7d96'],
      speed: [35, 150],
      life: [.18, .55], size: [1, 2], gravity: 300, drag: .7,
      angle: e.facing > 0 ? [-.7, .7] : [Math.PI - .7, Math.PI + .7], additive: false, jitter: 5
    });
    spawnDust(e.x + e.facing * 14, FLOOR + 1, e.facing, 6, '#7a5e78');
    addTrauma(rift ? .28 : .22);
    // actual strike resolution
    if (!player.alive || gameState !== 'playing') return;
    const forward = (player.x - e.x) * e.facing;
    const vertical = Math.abs(player.y - FLOOR);
    // a well-timed jump can clear the low claw sweep, but only near the apex
    if (forward > -8 && forward < reach + 12 && vertical < 34) {
      if (isParryActive()) {
        deflectEnemy(e);
      } else {
        playerHurt(dmg, e.x);
      }
    }
  }

  function deflectEnemy(e) {
    const p = player;
    // cancel parry into a successful deflect; freeze the world for a heartbeat
    p.parry = false;
    p.parryT = 0;
    p.parryCd = .38;
    p.invuln = Math.max(p.invuln, .55);
    p.counterTimer = 2.4;
    p.deflects++;
    p.combo += 2;
    p.comboTimer = 3.1;
    p.maxCombo = Math.max(p.maxCombo, p.combo);
    p.vx = -p.facing * 30;
    e.state = 'stagger';
    e.stateT = 0;
    e.staggerDur = 1.22;
    e.flash = .18;
    e.kvx = sign(e.x - p.x) * 165;
    e.hp = Math.max(0, e.hp - 8);
    e.nextCooldown = 0;
    e.clawCombo = false;
    e.clawQuad = false;
    e.clawEnd = 0;
    e.chargePhase = null;
    e.chargeHit = false;
    e.riftStrike = false;
    e.strikeReach = 0;
    e.strikeDmg = 0;
    e.strikeLunge = 0;
    e.strikeHitDelay = 0;
    e.clawColor = null;
    addTrauma(.72);
    screenFlash(.32, '245,240,225');
    hitstop = Math.max(hitstop, .20);
    Sound.parry();
    const mx = (p.x + e.x) / 2 + p.facing * 4;
    const my = p.y - 27;
    hitBurst(mx, my, p.facing, 'parry');
    spawnParticles(mx, my, 10, {
      colors: ['#f2fbff', '#a7d8ff', '#ffd79d', '#ffffff'], speed: [80, 240],
      life: [.18, .5], size: [1, 2], gravity: 90, drag: 1.8, angle: [0, TAU], additive: true, jitter: 4
    });
    for (let i = 0; i < 2; i++) {
      slashArcs.push({
        x: mx, y: my, r: 20 + i * 9,
        a0: e.facing > 0 ? -2.8 : -0.3, a1: e.facing > 0 ? -0.3 : 2.8,
        color: i ? '#ffe5c1' : '#dff6ff', life: 0, dur: .28, width: 5
      });
    }
    // long white sparks along the deflection
    for (let i = 0; i < 7; i++) {
      const a = rand(0, TAU);
      const sp = rand(100, 240);
      particles.push({
        x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(.12, .28), max: .28, size: 1, color: i % 2 ? '#fff8e8' : '#b9e4ff',
        gravity: 0, drag: 1.4, additive: true, streak: true
      });
    }
    // [MOD] 强化振刀火星：橙红火星雨 + 高速流星火花 + 白热星芒
    spawnParticles(mx, my, 14, {
      colors: ['#ffc27a', '#ff9d4d', '#ff5a3c', '#fff2c8', '#a7d8ff'], speed: [110, 300],
      life: [.2, .5], size: [1, 2], gravity: 220, drag: 2, angle: [0, TAU], additive: true, jitter: 6
    });
    for (let i = 0; i < 10; i++) {
      const a = rand(0, TAU);
      const sp = rand(260, 520);
      particles.push({
        x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(.16, .34), max: .34, size: 1.2,
        color: i % 3 === 0 ? '#ff8a4d' : (i % 3 === 1 ? '#fff2c8' : '#ffd9b0'),
        gravity: 120, drag: 1.2, additive: true, streak: true
      });
    }
    // 白热星芒：碰撞点的一瞬十字光
    slashArcs.push({
      x: mx, y: my, r: 12, a0: 0, a1: TAU,
      color: '#fff3d6', life: 0, dur: .12, width: 3
    });
    if (e.hp <= 0) killEnemy(e, true);
    showParryCallout();
    updateHUDCombo(true);
    syncHUD(true);
  }

  function damageEnemy(e, baseDmg) {
    if (!e.canBeHit()) return;
    const crit = player.counterTimer > 0;
    const dmg = Math.round(baseDmg * (crit ? 1.65 : 1));
    e.hp -= dmg;
    e.flash = .1;
    const dir = sign(e.x - player.x) || player.facing;
    e.kvx += dir * (ATTACKS[player.attackIndex].kb) * (e.type.elite ? .35 : .8);
    // [PERF] 攻击级反馈去重：一次攻击内（哪怕 0.5s 命中多个敌人）红闪/附加
    // 震颤/卡帧都只触发一次，其余命中只做粒子与音效——杜绝连续屏闪与叠加卡帧。
    // 次元斩的落鞘白闪由 burstUltCut 统一控制，不吃每击的红闪，避免把白爆闪染红。
    const atkFx = player.attack;
    if (atkFx && !atkFx.heavyFxDone && player.attackIndex !== 2) {
      atkFx.heavyFxDone = true;
      addTrauma(.11);
      screenFlash(.16, '255,25,40');
      addTrauma(.14);
    }
    if (atkFx && !atkFx.hitstopDone) {
      atkFx.hitstopDone = true;
      hitstop = Math.max(hitstop, .04);
    }
    Sound.hit(false); // [PERF] 内部已节流：40ms 内只合成一次打击音
    hitBurst(e.x + dir * -6 + player.facing * 3, e.y - 27, player.facing, 'slash');
    spawnParticles(e.x - player.facing * 4, e.y - 30, 8, {
      colors: ['#ad5dc0', '#753389', '#e59aed'], speed: [20, 100],
      life: [.25, .6], size: [1, 2], gravity: 280, drag: .8,
      angle: pAttackSprayAngle(), additive: false, jitter: 4
    });
    const tx = e.x + rand(-4, 4);
    addFloatingText(tx, e.y - 50 * e.scale, String(dmg), crit ? '#ffe0a1' : '#f4e9d5', crit ? 2 : 1);
    if (crit) {
      addFloatingText(tx, e.y - 60 * e.scale, 'COUNTER', '#b8e6ff', 1);
    }
    player.combo++;
    player.comboTimer = 2.8;
    player.maxCombo = Math.max(player.maxCombo, player.combo);
    // [PERF] DOM 更新合并到帧末统一执行，避免同帧多命中高频重排
    if (e.hp <= 0) killEnemy(e, false);
    hudDirty = true;
  }

  function pAttackSprayAngle() {
    return player.facing > 0 ? [-1.2, 1.2] : [Math.PI - 1.2, Math.PI + 1.2];
  }

  function killEnemy(e, fromParry) {
    // 紫魇一阶段归零：不进入正常死亡，转入二阶段 CG
    if (e.typeKey === 'brute' && e.phase !== 2) {
      if (gameState === 'playing' && player.alive && !bossCG.active) startBossPhaseCG(e);
      return;
    }
    if (e.state === 'dying') return;
    e.state = 'dying';
    e.stateT = 0;
    e.deathT = 0;
    e.hp = 0;
    if (e.type.elite) {
      bossHazards.length = 0;
      waves.length = 0;
    }
    player.kills++;
    Sound.enemyDeath(e.type.elite);
    hitstop = Math.max(hitstop, e.type.elite ? .1 : .05);
    addTrauma(e.type.elite ? .4 : .22);
    // 次元斩落鞘的白闪是主反馈，击杀紫闪不覆盖它
    if (!(player.attack && player.attackIndex === 2)) {
      screenFlash(e.type.elite ? .22 : .1, '105,45,118');
    }
    spawnParticles(e.x, e.y - 25 * e.scale, e.type.elite ? 36 : 22, {
      colors: ['#a75bc3', '#6d2d83', '#d58be0', '#3a184c'],
      speed: [30, 200], life: [.35, 1.05], size: [1, 3], gravity: 260,
      drag: .7, angle: [0, TAU], additive: false, jitter: 10
    });
    spawnParticles(e.x, e.y - 30 * e.scale, e.type.elite ? 20 : 10, {
      colors: ['#d99ae6', '#ffb2d4', '#8b4aa0'], speed: [10, 65], life: [.6, 1.4],
      size: [1, 2], gravity: -45, drag: 1.1, angle: [0, TAU], additive: true, jitter: 8
    });
    // a wisp of stolen life returns to the blade
    const orbs = e.type.elite ? 3 : 1;
    for (let i = 0; i < orbs; i++) {
      particles.push({
        x: e.x + rand(-8, 8), y: e.y - 20 - rand(0, 18), vx: rand(-18, 18), vy: rand(-40, -10),
        life: 1.5, max: 1.5, size: 2, color: i === 0 ? '#ff9aa9' : '#d99ae6',
        gravity: 0, drag: .4, additive: true, soul: true, soulDelay: .18 + i * .08
      });
    }
    if (fromParry) addFloatingText(e.x, e.y - 44, 'BREAK', '#ffe8be', 1);
    // [PERF] 击杀反馈同样合并到帧末统一执行
    hudDirty = true;
    pipsDirty = true;
  }

  /* ------------------------- phase transition CG ------------------------- */
  function hideBossCGDom() {
    const fx = Array.from(document.querySelectorAll('.fx-layer'));
    bossCG.dom = {
      mute: muteBtn.style.display,
      fx: fx.map(el => [el, el.style.display])
    };
    hud.classList.add('is-hidden');
    hintBar.classList.remove('is-visible');
    announceEl.classList.remove('is-visible');
    parryCallout.classList.remove('is-visible');
    muteBtn.style.display = 'none';
    for (const el of fx) el.style.display = 'none';
  }

  function restoreBossCGDom() {
    const dom = bossCG.dom;
    if (!dom) return;
    muteBtn.style.display = dom.mute || '';
    for (const [el, display] of dom.fx) el.style.display = display || '';
    hud.classList.remove('is-hidden');
    bossCG.dom = null;
  }

  function startBossPhaseCG(e) {
    if (bossCG.active) return;
    bossCG.active = true;
    bossCG.t = 0;
    bossCG.boss = e;
    bossCG.embers.length = 0;
    for (let i = 0; i < 12; i++) {
      const left = i % 2 === 0;
      bossCG.embers.push({
        x: left ? rand(10, 70) : rand(410, 470),
        y: rand(40, 260),
        speed: rand(6, 16),
        size: randInt(1, 2),
        phase: rand(0, TAU),
        drift: rand(2, 7)
      });
    }
    e.phase = 'cg';
    e.hp = 0;
    e.state = 'idle';
    e.stateT = 0;
    e.flash = 0;
    e.kvx = 0;
    gameState = 'cutscene';
    keys.clear();
    hideBossCGDom();
  }

  function updateBossPhaseCG(dt) {
    if (!bossCG.active) return;
    bossCG.t += dt;
    if (bossCG.t >= bossCG.dur) endBossPhaseCG();
  }

  function endBossPhaseCG() {
    if (!bossCG.active) return;
    const e = bossCG.boss;
    bossCG.active = false;
    if (e) {
      e.phase = 2;
      // 二阶段单独提高血量上限；一阶段仍保持 400
      e.maxHp = e.type.phase2Hp || e.maxHp;
      e.hp = e.maxHp;
      e.state = 'idle';
      e.stateT = 0;
      e.cooldown = rand(e.type.cooldown[0], e.type.cooldown[1]);
      e.flash = 0;
      e.kvx = 0;
      e.attackHit = false;
      e.lastSkill = null;
      e.nextCooldown = 0;
      e.clawColor = null;
      e.clawQuad = false;
      e.clawCombo = false;
      e.clawSeg = 0;
      e.clawGap = 0;
      e.clawEnd = 0;
      e.chargePhase = null;
      e.chargeHit = false;
      e.chargeDustT = 0;
      e.bloodTimer = rand(.18, .32);
      e.riftStrike = false;
      e.strikeReach = 0;
      e.strikeDmg = 0;
      e.strikeLunge = 0;
      e.strikeHitDelay = 0;
      e.facing = player.x < e.x ? -1 : 1;
    }
    bossCG.boss = null;
    bossCG.embers.length = 0;
    bossCG.t = 0;
    bossHazards.length = 0;
    waves.length = 0;
    texts.length = 0;
    hitstop = 0;
    flashAlpha = 0;
    darkFlash = 0;
    camera.trauma = 0;
    keys.clear();
    restoreBossCGDom();
    gameState = 'playing';
    syncHUD(true);
    syncEnemyPips();
  }

  function drawCGEmbers(t) {
    const a = smoothstep(0, .35, t) * (1 - smoothstep(3.25, 3.5, t));
    if (a <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const em of bossCG.embers) {
      const y = ((em.y - t * em.speed * 6) % 280 + 280) % 280;
      const x = em.x + Math.sin(t * 1.4 + em.phase) * em.drift;
      ctx.globalAlpha = a * (.32 + .22 * Math.sin(t * 3 + em.phase));
      pRect(x, y, em.size, em.size, em.size > 1 ? '#5a2270' : '#3a1749');
    }
    ctx.restore();
  }

  function drawCGSilhouette(t) {
    const a1 = smoothstep(0, .55, t);
    if (a1 <= 0) return;
    const a2 = smoothstep(.9, 1.5, t);
    const a3 = smoothstep(2.0, 2.65, t);
    const tremble = a2 * (1 - a3) * Math.sin(t * 58) * 1.3;
    const cx = 240 + tremble, base = 226;
    ctx.save();
    ctx.translate(cx, base);
    ctx.scale(1 + a3 * .12, 1 + a3 * .55);
    ctx.globalAlpha = a1;
    // 背后微紫光，保证纯黑底上仍有体积
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(0, -18, 82, 'rgba(90,30,120,.10)', .6);
    ctx.restore();
    // 蜷缩的躯干
    pPoly([
      [-58, 0], [-55, -12], [-44, -26], [-26, -35], [-6, -37],
      [14, -34], [32, -27], [45, -17], [50, -6], [42, 0]
    ], '#0b0410');
    // 低垂的头与下颚
    pPoly([[16, -30], [34, -29], [46, -21], [49, -10], [40, -2], [24, -4], [14, -12]], '#0b0410');
    pPoly([[42, -18], [60, -13], [56, -5], [40, -5]], '#0b0410');
    // 折叠的前肢与尾巴
    pLine(-42, -14, -28, -3, '#0b0410', 7);
    pLine(-28, -3, -12, 1, '#0b0410', 6);
    pLine(-34, -20, -22, -8, '#0b0410', 5);
    pLine(26, -8, 40, 1, '#0b0410', 6);
    pLine(40, 1, 50, -4, '#0b0410', 4);
    pLine(48, -8, 62, -18, '#0b0410', 3);
    pLine(62, -18, 68, -12, '#0b0410', 2);
    // 背脊 / 轮廓冷光
    pLine(-54, -8, -42, -24, '#3a1749', 1);
    pLine(-42, -24, -20, -33, '#2a0e35', 1);
    pLine(-20, -33, 6, -36, '#3a1749', 1);
    pLine(16, -31, 38, -27, '#2a0e35', 1);
    pLine(44, -20, 50, -10, '#3a1749', 1);
    pLine(-38, -25, -34, -34, '#2a0e35', 3);
    pRect(34, -20, 3, 1, '#5a2270');

    // 第二幕：胸口红光、脉络、轻微颤动
    if (a2 > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(-4, -20, 5 + 24 * a2, 'rgba(206,47,66,.45)', .50 + .35 * a2);
      pCircle(-4, -20, 1 + 2.2 * a2, '#ff4b5c');
      ctx.globalAlpha = .45 + .35 * a2;
      const veins = [
        [-30, -12], [-18, -3], [-8, -32], [10, -30],
        [24, -18], [-2, -6], [14, -8]
      ];
      for (const v of veins) {
        pLine(-4, -20, v[0], v[1], '#ce2f42', 1);
        pRect(v[0], v[1], 1, 1, '#ff4b5c');
      }
      ctx.restore();
    }
    if (a3 > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = .55 * a3;
      pLine(-54, -8, -42, -24, '#ce2f42', 1);
      pLine(16, -31, 38, -27, '#ce2f42', 1);
      pLine(44, -20, 50, -10, '#ff4b5c', 1);
      ctx.restore();
    }
    ctx.restore();

    // 上升的红色/紫色粒子
    if (a2 > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) {
        const y = 224 - (((t - .9) * 42 + i * 17) % 180);
        const x = 200 + Math.sin(i * 2.2 + t * 1.7) * 46;
        ctx.globalAlpha = a2 * (.16 + .18 * Math.sin(t * 4 + i));
        pRect(x, y, 1, 1, i % 3 === 0 ? '#ff4b5c' : '#8a3fa1');
      }
      ctx.restore();
    }
  }

  function drawCGEye(t) {
    const a = smoothstep(2.0, 2.55, t);
    if (a <= 0) return;
    const boost = smoothstep(2.9, 3.15, t);
    const cx = 240, cy = 112;
    const h = (6 + 38 * a) * (1 + .08 * boost);
    const w = (3 + 17 * a) * (1 + .05 * boost);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(cx, cy, 20 + 70 * a, 'rgba(206,47,66,.22)', .55 + .35 * a);
    // 外框到虹膜
    ctx.globalCompositeOperation = 'source-over';
    pPoly([
      [cx, cy - h], [cx + w, cy + h * .18], [cx, cy + h], [cx - w, cy + h * .18]
    ], '#2a0a10');
    pPoly([
      [cx, cy - h * .82], [cx + w * .72, cy + h * .16], [cx, cy + h * .82], [cx - w * .72, cy + h * .16]
    ], '#5c101c');
    pPoly([
      [cx, cy - h * .62], [cx + w * .45, cy + h * .13], [cx, cy + h * .62], [cx - w * .45, cy + h * .13]
    ], '#ce2f42');
    pPoly([
      [cx, cy - h * .40], [cx + w * .22, cy + h * .09], [cx, cy + h * .40], [cx - w * .22, cy + h * .09]
    ], '#ff4b5c');
    // 白色竖瞳与高光
    ctx.globalCompositeOperation = 'lighter';
    pRect(cx - 1, cy - h * .30, 3, h * .60, '#fff6f0');
    pRect(cx - 1, cy - h * .20, 1, h * .40, '#ffffff');
    pRect(cx - 2, cy - h * .08, 2, 1, '#ffffff');
    ctx.globalAlpha = .35 + .30 * a;
    pRing(cx, cy, 22 + 30 * a, '#ce2f42');
    pRing(cx, cy, 34 + 46 * a, '#5c101c');
    ctx.restore();
  }

  function drawCGClawSeams(t) {
    const a = smoothstep(2.1, 2.65, t);
    if (a <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * .82;
    for (let i = 0; i < 3; i++) {
      const x0 = 192 + i * 26, y0 = 218;
      const mx = x0 + 18, my = y0 - 22 + Math.sin(i + t * 2) * 3;
      const nx = x0 + 44, ny = y0 - 42;
      const x1 = x0 + 58, y1 = y0 - 60;
      pLine(x0, y0, mx, my, '#5c101c', 3);
      pLine(mx, my, nx, ny, '#5c101c', 2);
      pLine(nx, ny, x1, y1, '#5c101c', 2);
      pLine(x0, y0, mx, my, '#ce2f42', 1);
      pLine(mx, my, nx, ny, '#ff4b5c', 1);
      pLine(nx, ny, x1, y1, '#ff4b5c', 1);
      pRect(x1, y1, 2, 2, '#fff6f0');
    }
    ctx.restore();
  }

  function drawBossPhaseCG() {
    const t = Math.min(bossCG.t, bossCG.dur);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    pRect(0, 0, VW, VH, '#000000');
    drawCGSilhouette(t);
    drawCGEmbers(t);
    drawCGEye(t);
    drawCGClawSeams(t);
    // 第四幕：红光爆闪 → 白闪
    const red = smoothstep(2.9, 2.96, t) * (1 - smoothstep(3.05, 3.15, t));
    if (red > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = red * .55;
      pRect(0, 0, VW, VH, '#ce2f42');
      ctx.restore();
    }
    const white = smoothstep(3.22, 3.3, t) * (1 - smoothstep(3.40, 3.47, t));
    if (white > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = white * .9;
      pRect(0, 0, VW, VH, '#ffffff');
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function resetBossCGState() {
    bossCG.active = false;
    if (bossCG.dom) restoreBossCGDom();
    bossCG.t = 0;
    bossCG.boss = null;
    bossCG.embers.length = 0;
  }

  /* ------------------------- enemy drawing ------------------------- */
  function poseLerp(a, b, t) {
    return {
      sx: lerp(a.sx, b.sx, t), sy: lerp(a.sy, b.sy, t),
      ex: lerp(a.ex, b.ex, t), ey: lerp(a.ey, b.ey, t),
      hx: lerp(a.hx, b.hx, t), hy: lerp(a.hy, b.hy, t),
      spread: lerp(a.spread, b.spread, t)
    };
  }
  const ARM = {
    idleFront: { sx: 8, sy: -37, ex: 16, ey: -24, hx: 14, hy: -9, spread: 1 },
    idleBack: { sx: -8, sy: -37, ex: -17, ey: -25, hx: -15, hy: -10, spread: .85 },
    highFront: { sx: 8, sy: -39, ex: 20, ey: -53, hx: 16, hy: -64, spread: 1.65 },
    highBack: { sx: -8, sy: -39, ex: -21, ey: -52, hx: -14, hy: -62, spread: 1.45 },
    slashFront: { sx: 9, sy: -37, ex: 21, ey: -31, hx: 30, hy: -17, spread: 1.25 },
    slashBack: { sx: -8, sy: -37, ex: 2, ey: -30, hx: 18, hy: -20, spread: 1 },
    staggerFront: { sx: 8, sy: -34, ex: 17, ey: -22, hx: 15, hy: -8, spread: 1.3 },
    staggerBack: { sx: -8, sy: -34, ex: -18, ey: -21, hx: -16, hy: -7, spread: 1.2 }
  };

  function drawEnemy(e) {
    const t = e.animTime;
    const s = e.scale;
    const dying = e.state === 'dying';
    const emerging = e.state === 'emerge';
    const emergeP = clamp(e.stateT / e.emergeDur, 0, 1);
    const alpha = dying ? clamp(1 - e.deathT / .92, 0, 1) : emerging ? clamp(emergeP * 1.3, 0, 1) : 1;
    if (alpha <= .01) return;

    // shadow
    ctx.save();
    ctx.globalAlpha = .36 * alpha;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(Math.round(e.x), FLOOR + 2, 16 * s, 3.6 * s, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // spawn portal
    if (emerging) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (.4 + emergeP * .6) * (1 - emergeP * .25);
      pPoly([
        [e.x - 22 * s, FLOOR + 1], [e.x - 12 * s, FLOOR - 6], [e.x + 4 * s, FLOOR - 8],
        [e.x + 21 * s, FLOOR - 2], [e.x + 12 * s, FLOOR + 5], [e.x - 10 * s, FLOOR + 6]
      ], '#3d1453');
      pRing(e.x, FLOOR - 1, 17 * s * (.6 + emergeP * .4), '#b96bd2');
      ctx.restore();
      spawnParticles(e.x, FLOOR - 2, 1, {
        colors: ['#9d52b3', '#d085e0'], speed: [8, 35], life: [.3, .7], size: [1, 1],
        gravity: -55, drag: 1, angle: [-Math.PI, 0], additive: true, jitter: 12
      });
    }

    const bob = Math.sin(t * 2.1 + e.seed) * 1.2;
    let crouch = 0, lean = 0, headDrop = 0, mouth = 0, armFront = ARM.idleFront, armBack = ARM.idleBack;
    let clawGlow = 0, eyeIntensity = .35, bodyLean = 0, spikeScale = 1;

    if (e.state === 'beam') {
      // 紫渊审判：立起上身、双爪高举，向脚下灌注竖直紫光
      const p = clamp(e.stateT / (e.type.beamCast || 1), 0, 1);
      const w = easeOutCubic(clamp(p * 1.25, 0, 1));
      crouch = 1.0 * w;
      lean = -2.2 * w;
      armFront = poseLerp(ARM.idleFront, ARM.highFront, w);
      armBack = poseLerp(ARM.idleBack, ARM.highBack, w);
      headDrop = -1.7 * w;
      mouth = clamp((p - .08) * 1.8, 0, 1.15);
      clawGlow = w;
      eyeIntensity = .9 + w * 1.2;
      bodyLean = -1.2 * w;
      spikeScale = 1.2;
    } else if (e.state === 'rift') {
      // 裂影突袭：压低蓄势，双爪后收，紫光在爪尖凝聚
      const p = clamp(e.stateT / (e.type.riftWindup || .68), 0, 1);
      const w = easeOutCubic(clamp(p * 1.3, 0, 1));
      crouch = 2.3 * w;
      lean = -1.6 * w;
      armFront = poseLerp(ARM.idleFront, ARM.highFront, w);
      armBack = poseLerp(ARM.idleBack, ARM.highBack, w);
      headDrop = -1.1 * w;
      mouth = clamp((p - .2) * 1.6, 0, .9);
      clawGlow = w;
      eyeIntensity = .8 + w * .9;
      bodyLean = -.8 * w;
      spikeScale = 1.12;
    } else if (e.state === 'spikes') {
      // 紫渊裂地：立起上身、双爪高举，裂痕在脚下展开
      const p = clamp(e.stateT / (e.type.spikeCast || 1), 0, 1);
      const w = easeOutCubic(clamp(p * 1.25, 0, 1));
      crouch = 1.2 * w;
      lean = -2.0 * w;
      armFront = poseLerp(ARM.idleFront, ARM.highFront, w);
      armBack = poseLerp(ARM.idleBack, ARM.highBack, w);
      headDrop = -1.5 * w;
      mouth = clamp((p - .1) * 1.7, 0, 1.1);
      clawGlow = w;
      eyeIntensity = .9 + w * 1.1;
      bodyLean = -1.1 * w;
      spikeScale = 1.18;
    } else if (e.state === 'rain') {
      // 血雨葬：双爪高举，最后压低身体把血雨砸下
      const p = clamp(e.stateT / (e.type.rainCast || 1.55), 0, 1);
      const w = easeOutCubic(clamp(p * 1.2, 0, 1));
      const slam = smoothstep(.6, .82, p);
      crouch = 1.2 * w + 1.8 * slam;
      lean = -2.0 * w + 3.2 * slam;
      armFront = poseLerp(poseLerp(ARM.idleFront, ARM.highFront, w), ARM.slashFront, slam);
      armBack = poseLerp(poseLerp(ARM.idleBack, ARM.highBack, w), ARM.slashBack, slam);
      headDrop = -1.5 * w + 2.6 * slam;
      mouth = clamp((p - .1) * 1.8, 0, 1.1);
      clawGlow = w;
      eyeIntensity = .9 + w * 1.2;
      bodyLean = -1.0 * w + 2.2 * slam;
      spikeScale = 1.1;
    } else if (e.state === 'pools') {
      // 血蚀池：高举双爪后重砸地面，血池从地缝中涌出
      const p = clamp(e.stateT / (e.type.poolCast || 1.3), 0, 1);
      const w = easeOutCubic(clamp(p * 1.2, 0, 1));
      const slam = smoothstep(.55, .8, p);
      crouch = 1.4 * w + 2.2 * slam;
      lean = -1.8 * w + 3.8 * slam;
      armFront = poseLerp(poseLerp(ARM.idleFront, ARM.highFront, w), ARM.slashFront, slam);
      armBack = poseLerp(poseLerp(ARM.idleBack, ARM.highBack, w), ARM.slashBack, slam);
      headDrop = -1.2 * w + 2.4 * slam;
      mouth = clamp((p - .08) * 1.8, 0, 1.1);
      clawGlow = w;
      eyeIntensity = .9 + w;
      bodyLean = -.8 * w + 2.4 * slam;
      spikeScale = 1.12;
    } else if (e.state === 'charge') {
      if (e.chargePhase === 'windup') {
        const p = clamp(e.stateT / (e.type.chargeWindup || .72), 0, 1);
        const w = easeOutCubic(clamp(p * 1.25, 0, 1));
        crouch = 2.8 * w;
        lean = -3.2 * w;
        armFront = poseLerp(ARM.idleFront, ARM.slashFront, w * .25);
        armBack = poseLerp(ARM.idleBack, ARM.slashBack, w * .25);
        headDrop = -.9 * w;
        mouth = clamp((p - .12) * 1.8, 0, .95);
        clawGlow = .85 * w;
        eyeIntensity = .7 + w * .8;
        bodyLean = -1.4 * w;
        spikeScale = 1.12;
      } else if (e.chargePhase === 'dash') {
        crouch = 1.2;
        lean = 5.2;
        armFront = ARM.slashFront;
        armBack = ARM.slashBack;
        headDrop = 1.6;
        mouth = 1;
        clawGlow = .55;
        eyeIntensity = 1.4;
        bodyLean = 2.2;
        spikeScale = 1.08;
      } else {
        const p = clamp(e.stateT / (e.type.chargeCrash || 1.5), 0, 1);
        const w = Math.sin(clamp(p * 1.4, 0, 1) * Math.PI) * (1 - p * .45);
        const tremor = Math.sin(t * 42) * .7 * (1 - p);
        crouch = 3.2 * (1 - p * .25) + tremor;
        lean = 1.2;
        armFront = poseLerp(ARM.slashFront, ARM.staggerFront, w);
        armBack = poseLerp(ARM.slashBack, ARM.staggerBack, w);
        headDrop = 1.2;
        mouth = .2;
        clawGlow = .12;
        eyeIntensity = .25 + .2 * (1 - p);
        bodyLean = .8;
      }
    } else if (e.state === 'cast') {
      // 紫魇施法：仰头张嘴，毒绿能量在口中凝聚（冲击波将从嘴射出）
      const p = clamp(e.stateT / e.type.cast, 0, 1);
      const w = easeOutCubic(clamp(p * 1.25, 0, 1));
      crouch = 1.3 * w;
      lean = -2.4 * w;
      headDrop = -1.5 * w; // 仰头
      mouth = clamp((p - .1) * 1.75, 0, 1.15); // 张嘴
      clawGlow = .4;
      eyeIntensity = .85 + w * .85;
      bodyLean = -w * .7;
      spikeScale = 1.05;
    } else if (e.state === 'windup') {
      const p = e.stateT / e.type.windup;
      const w = easeOutCubic(clamp(p * 1.3, 0, 1));
      crouch = 1.5 * w;
      lean = -2.6 * w;
      armFront = poseLerp(ARM.idleFront, ARM.highFront, w);
      armBack = poseLerp(ARM.idleBack, ARM.highBack, w);
      headDrop = -1.3 * w;
      mouth = clamp((p - .28) * 1.8, 0, 1);
      clawGlow = w;
      eyeIntensity = .4 + w * .9;
      bodyLean = -w;
    } else if (e.state === 'strike') {
      const p = clamp(e.stateT / e.type.strikeDur, 0, 1);
      const w = easeOutQuint(clamp(p * 2.6, 0, 1));
      armFront = poseLerp(ARM.highFront, ARM.slashFront, w);
      armBack = poseLerp(ARM.highBack, ARM.slashBack, w);
      lean = 4.2 * w;
      crouch = 2.2 * w;
      headDrop = 1.4 * w;
      mouth = 1;
      clawGlow = 1 - w * .4;
      eyeIntensity = 1.35;
      bodyLean = 1.4 * w;
      spikeScale = 1.1;
    } else if (e.state === 'recover') {
      const p = clamp(e.stateT / e.type.recover, 0, 1);
      armFront = poseLerp(ARM.slashFront, ARM.idleFront, easeInOutCubic(p));
      armBack = poseLerp(ARM.slashBack, ARM.idleBack, easeInOutCubic(p));
      lean = 2.5 * (1 - p);
      crouch = 1.2 * (1 - p);
      mouth = Math.max(0, 1 - p * 2.2);
      eyeIntensity = .5;
    } else if (e.state === 'stagger') {
      const p = clamp(e.stateT / e.staggerDur, 0, 1);
      const w = Math.sin(Math.min(1, p * 1.8) * Math.PI * .8) * (1 - p * .5);
      crouch = 1.8;
      lean = -2.4 * (1 - p * .6);
      armFront = poseLerp(ARM.slashFront, ARM.staggerFront, w);
      armBack = poseLerp(ARM.slashBack, ARM.staggerBack, w);
      mouth = .35 * (1 - p);
      eyeIntensity = .2 + .4 * (1 - p);
      clawGlow = .3;
    } else if (e.state === 'chase') {
      crouch = .8 + Math.abs(Math.sin(t * 6)) * 1.2;
      lean = 1.8;
    } else if (e.state === 'idle') {
      crouch = .4;
      lean = .4;
    }
    if (emerging) {
      crouch += (1 - emergeP) * 3;
      lean += (1 - emergeP) * 2;
    }
    if (dying) {
      crouch += e.deathT * 15;
      lean -= e.deathT * 5;
    }

    const rootY = e.y + (dying ? e.deathT * 8 : 0);
    const squash = emerging ? .45 + emergeP * .55 : dying ? 1 - e.deathT * .55 : 1;
    const phase2 = e.typeKey === 'brute' && e.phase === 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(e.x), Math.round(rootY));
    ctx.scale(e.facing * s, s * squash);

    const bo = bob + crouch;
    const lx = lean;
    const stepping = e.state === 'chase' ? Math.sin(t * 8.5 + e.seed) * 2.1
      : e.state === 'idle' ? Math.sin(t * 2.4 + e.seed) * .4 : 0;

    // [PERF] 怪物体素绘制抽为局部闭包：受击闪光时用 lighter 叠加重绘一遍
    // 替代原先的 ctx.filter brightness()（CSS 滤镜在低端/大画布环境极慢，
    // 多目标同帧同时受击会叠加成明显掉帧），视觉等效为整只怪变白变亮
    const paintMonster = () => {
      // 二阶段副爪：先画，roots 被躯干盖住，只留背后的低垂剪影；
      // 固定在身体两侧偏后、偏下，只随呼吸/步伐轻摆，不参与攻击动画。
      if (phase2) drawSecondaryClaws(e, bo, lx, t);
      // legs / talons
      drawMonsterLeg(-6 + lx * .3, -14 + bo, -10 + lx * .4, -6 + bo, -13 + lx * .5 + stepping, -Math.max(0, stepping) * .8, false, e);
      drawMonsterLeg(6 + lx * .4, -14 + bo, 9 + lx * .5, -6 + bo, 11 + lx * .6 - stepping, -Math.max(0, -stepping) * .8, true, e);
      // back arm
      drawMonsterArm(armBack, false, e, clawGlow);
      // body mass
      drawMonsterBody(e, bo, lx, mouth, bodyLean, spikeScale, t);
      // front arm, claws foremost
      drawMonsterArm(armFront, true, e, clawGlow);
      // head last, so the face always reads through the clawed silhouette
      drawMonsterHead(e, bo, lx, headDrop, mouth, eyeIntensity, t);
      // faint chitin highlights
      if (!dying) {
        pRect(lx - 3, -42 + bo, 3, 1, 'rgba(190,123,205,.35)');
        pRect(lx + 5, -35 + bo, 2, 1, 'rgba(194,122,208,.25)');
        pRect(lx - 7, -25 + bo, 2, 1, 'rgba(150,85,165,.3)');
      }
    };

    // 二阶段红色调：不使用 ctx.filter（避免软件滤镜逐像素拖慢多目标/整屏），
    // 改用低透明度红色体表罩染 + 红脉 + 红边光。
    paintMonster();
    if (phase2 && !dying) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * .18;
      pPoly([
        [lx - 10, -8 + bo], [lx - 12, -20 + bo], [lx - 5, -32 + bo],
        [lx + 6, -34 + bo], [lx + 11, -25 + bo], [lx + 9, -9 + bo], [lx + 2, -4 + bo]
      ], '#ce2f42');
      pPoly([
        [lx + 1, -45 + bo], [lx + 10, -42 + bo], [lx + 12, -33 + bo],
        [lx + 4, -30 + bo], [lx - 1, -36 + bo]
      ], '#ff4b5c');
      pLine(lx - 9, -30 + bo, lx - 14, -18 + bo, '#ce2f42', 4);
      pLine(lx + 8, -30 + bo, lx + 15, -20 + bo, '#ce2f42', 4);
      pLine(lx - 8, -18 + bo, lx - 12, -8 + bo, '#ce2f42', 4);
      ctx.globalAlpha = alpha * .55;
      pLine(lx - 10, -10 + bo, lx - 6, -24 + bo, '#ff4b5c', 1);
      pLine(lx + 2, -36 + bo, lx + 9, -33 + bo, '#ff4b5c', 1);
      ctx.restore();
      // 红色脉络
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * .75;
      pLine(lx - 5, -34 + bo, lx + 4, -31 + bo, 'rgba(255,75,92,.75)', 1);
      pLine(lx + 4, -31 + bo, lx + 2, -23 + bo, 'rgba(206,47,66,.65)', 1);
      pLine(lx - 3, -28 + bo, lx - 7, -21 + bo, 'rgba(255,75,92,.5)', 1);
      pRect(lx - 5, -26 + bo, 2, 1, 'rgba(255,120,130,.65)');
      pRect(lx + 2, -24 + bo, 1, 2, 'rgba(255,75,92,.6)');
      ctx.restore();
    }
    if (e.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * Math.min(1, .35 + e.flash * 2.2);
      paintMonster();
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  function drawMonsterLeg(hx, hy, kx, ky, fx, fy, front, e) {
    const outline = '#0b0410';
    const dark = front ? '#381545' : '#2a0e35';
    const mid = front ? '#522060' : '#3b1748';
    pLine(hx, hy, kx, ky, outline, 6);
    pLine(hx, hy, kx, ky, dark, 4);
    pLine(kx, ky, fx, fy - 1, outline, 5);
    pLine(kx, ky, fx, fy - 1, mid, 3);
    pRect(kx - 2, ky - 1, 4, 2, '#5e2a6b');
    // three toes
    for (let i = 0; i < 3; i++) {
      const dx = i * 2 - 2;
      pLine(fx + dx * .4, fy - 1, fx + dx, fy - 1 + 2, '#0b0410', 2);
      pLine(fx + dx * .4, fy - 1, fx + dx, fy + 1, i === 1 ? '#bca2b2' : '#8d7484', 1);
    }
  }

  function drawMonsterBody(e, bo, lx, mouth, bodyLean, spikeScale, t) {
    const elite = e.type.elite;
    const outline = '#0b0410';
    const dark = elite ? '#341142' : '#361445';
    const body = elite ? '#4c1b62' : '#5d256f';
    const mid = elite ? '#6a3087' : '#7b3a8c';
    const light = elite ? '#9251a8' : '#a865b8';
    const hi = '#d091dd';
    // hunched silhouette
    const pts = [
      [-9 + lx, -12 + bo], [-13 + lx + bodyLean, -24 + bo], [-12 + lx + bodyLean, -37 + bo],
      [-6 + lx + bodyLean, -45 + bo], [2 + lx + bodyLean, -49 + bo], [10 + lx + bodyLean, -44 + bo],
      [13 + lx, -34 + bo], [12 + lx, -20 + bo], [7 + lx, -11 + bo], [-2 + lx, -9 + bo]
    ];
    pPoly(pts, outline);
    pPoly(pointsScaledAround(pts, lx, -27 + bo, .90, .94), body);
    // back hump shading
    pPoly([
      [-10 + lx, -24 + bo], [-11 + lx + bodyLean, -36 + bo], [-5 + lx + bodyLean, -43 + bo],
      [1 + lx + bodyLean, -41 + bo], [-2 + lx, -30 + bo], [-7 + lx, -18 + bo]
    ], dark);
    // chest / belly
    pPoly([
      [1 + lx, -39 + bo], [9 + lx, -35 + bo], [10 + lx, -23 + bo], [6 + lx, -14 + bo],
      [0 + lx, -17 + bo], [-2 + lx, -29 + bo]
    ], mid);
    pPoly([
      [4 + lx, -35 + bo], [8 + lx, -31 + bo], [8 + lx, -22 + bo], [4 + lx, -18 + bo], [2 + lx, -27 + bo]
    ], light);
    // ribs / chitin plates
    for (let i = 0; i < 4; i++) {
      pRect(lx + 1 + i * -.4, -32 + bo + i * 4, 5 - i * .6, 1, 'rgba(190,126,205,.42)');
      pRect(lx + 2, -30 + bo + i * 4, 2, 1, 'rgba(20,6,28,.5)');
    }
    // gashes / old scars
    pLine(lx - 4, -34 + bo, lx - 2, -26 + bo, '#24102e', 1);
    pLine(lx - 2, -27 + bo, lx - 5, -21 + bo, '#24102e', 1);
    pLine(lx - 6, -35 + bo, lx - 1, -36 + bo, 'rgba(211,146,227,.3)', 1);
    // rim light along the hunched back and shoulder
    pLine(-11 + lx + bodyLean * .5, -35 + bo, -6 + lx + bodyLean, -44 + bo, 'rgba(196,132,219,.38)', 1);
    pLine(11 + lx, -33 + bo, 12 + lx, -23 + bo, 'rgba(193,117,211,.30)', 1);
    // shoulder spikes
    pPoly([
      [-10 + lx, -39 + bo], [-20 + lx + bodyLean, -48 + bo * spikeScale], [-10.5 + lx, -34 + bo]
    ], outline);
    pPoly([
      [-10 + lx, -38 + bo], [-17.5 + lx + bodyLean, -45 + bo], [-10 + lx, -35 + bo]
    ], dark);
    pPoly([
      [9 + lx, -42 + bo], [13 + lx, -51 + bo], [12 + lx, -38 + bo]
    ], outline);
    pPoly([
      [9.5 + lx, -41 + bo], [12 + lx, -48 + bo], [11 + lx, -38 + bo]
    ], dark);
    // row of smaller dorsal spikes with pale tips
    for (let i = 0; i < 3; i++) {
      const sx = -10 + i * 4.5 + lx;
      const sy = -41 - i * 1.8 + bo;
      const h = 5 - i;
      pPoly([[sx, sy], [sx - 2.5, sy - h], [sx + 2, sy - 1]], '#170821');
      pRect(sx - 2.5, sy - h, 1, 2, 'rgba(205,177,197,.45)');
    }
    // layered chest plates
    pLine(lx + 1, -36 + bo, lx + 9, -31 + bo, 'rgba(218,154,232,.36)', 1);
    pLine(lx + 1, -31 + bo, lx + 9, -27 + bo, 'rgba(218,154,232,.26)', 1);
    pLine(lx + 2, -26 + bo, lx + 8, -23 + bo, 'rgba(215,150,230,.22)', 1);
    pRect(lx + 3, -31 + bo, 1, 8, 'rgba(31,8,42,.65)');
    pRect(lx + 8, -34 + bo, 1, 9, 'rgba(28,7,38,.45)');
    // exposed rib hints under the hide
    pLine(lx + 2, -22 + bo, lx + 7, -19 + bo, 'rgba(206,185,194,.3)', 1);
    pLine(lx + 1, -18 + bo, lx + 6, -16 + bo, 'rgba(195,172,182,.2)', 1);
    // glowing chitin veins down the back
    if (!e.type.elite) {
      pLine(-8 + lx, -34 + bo, -6 + lx, -25 + bo, 'rgba(207,105,226,.32)', 1);
      pRect(-7 + lx, -30 + bo, 1, 3, 'rgba(255,157,231,.35)');
    } else {
      pLine(-9 + lx, -32 + bo, -5 + lx, -20 + bo, 'rgba(225,117,236,.28)', 1);
      pRect(-10 + lx, -27 + bo, 2, 1, 'rgba(255,165,232,.38)');
      pRect(7 + lx, -29 + bo, 2, 1, 'rgba(255,165,232,.3)');
    }
    // chains dangling from the brute's hide
    if (e.type.elite) {
      const sway = Math.sin(t * .9 + e.seed) * 1.2;
      pLine(-5 + lx, -19 + bo, -7 + lx + sway, -10 + bo, '#2e2830', 1);
      pRect(-7 + lx + sway, -11 + bo, 2, 1, '#514650');
    }
  }

  function drawMonsterHead(e, bo, lx, headDrop, mouth, eyeIntensity, t) {
    const hy = bo + headDrop - 1.5;
    const hx = lx + 1.5;
    // neck & collar
    pRect(hx + 1, -37 + hy, 9, 4, '#2c0e37');
    pRect(hx + 3, -35 + hy, 7, 2, '#411650');
    pPoly([
      [hx - 1, -38 + hy], [hx + 10, -38 + hy], [hx + 12, -33 + hy], [hx + 3, -31 + hy]
    ], '#170721');
    // skull silhouette — thrust forward into a jagged snout
    const outlinePts = [
      [hx - 2, -42 + hy], [hx + 1, -49 + hy], [hx + 7, -52 + hy], [hx + 13, -48 + hy],
      [hx + 17, -43 + hy], [hx + 16, -38 + hy], [hx + 12, -34 + hy], [hx + 6, -33 + hy],
      [hx + 1, -35 + hy], [hx - 2, -38 + hy]
    ];
    pPoly(outlinePts, '#0b0410');
    // 大boss 头骨：绿紫混合（深绿主体 + 紫线勾勒，从头顶绿渐变到下颌深紫）
    pPoly(pointsScaledAround(outlinePts, hx + 7, -42 + hy, .88, .88), e.type.elite ? '#3f523a' : '#6c3080');
    // upper skull plate — elite 上颅板亮绿，与下颌深紫形成绿紫渐变
    pPoly([
      [hx, -44 + hy], [hx + 3, -49 + hy], [hx + 8, -50 + hy], [hx + 13, -47 + hy],
      [hx + 15, -43 + hy], [hx + 9, -43 + hy], [hx + 2, -41 + hy]
    ], e.type.elite ? '#5c8a4a' : '#88459b');
    pLine(hx + 3, -48 + hy, hx + 11, -46 + hy, 'rgba(230,168,242,.55)', 1);
    // deep eye sockets in a black band
    pPoly([
      [hx + 2, -45 + hy], [hx + 15, -45 + hy], [hx + 14, -40 + hy], [hx + 3, -41 + hy]
    ], '#15051e');
    // three burning eyes — central one raised like a crown jewel
    pRect(hx + 4, -44 + hy, 3, 1, '#ff3f91');
    pRect(hx + 4, -44 + hy, 1, 1, '#ffe3ee');
    pRect(hx + 10, -44 + hy, 2, 1, '#ff6aa8');
    pRect(hx + 8, -47 + hy, 1, 2, '#ff9ac3');
    pRect(hx + 8, -47 + hy, 1, 1, '#fff3f8');
    // snout ridge & nostril
    pLine(hx + 11, -41 + hy, hx + 16, -39 + hy, 'rgba(203,133,220,.35)', 1);
    pRect(hx + 15, -40 + hy, 1, 1, '#1a051f');
    // maw / jaw
    const open = mouth * (e.type.elite ? 4 : 3.4);
    pPoly([
      [hx + 3, -36 + hy], [hx + 15, -37 + hy], [hx + 13, -33 + hy + open],
      [hx + 6, -32 + hy + open], [hx + 2, -34 + hy]
    ], '#16040d');
    pRect(hx + 4, -35 + hy, 10, 2 + open, '#24051a');
    if (open > .3) {
      // 大boss 施法时嘴内为毒绿（冲击波从嘴射出）；其余状态保持血红
      const castMaw = e.type.elite && e.state === 'cast';
      pRect(hx + 5, -34 + hy, 7, open, castMaw ? '#0d3d1e' : '#4f0e2d');
      pRect(hx + 7, -33 + hy, 4, Math.max(1, open - .8), castMaw ? '#3ee06b' : '#d1466d');
      pRect(hx + 9, -33 + hy, 1, 1, castMaw ? '#b8ffd2' : '#ff93ab');
      // 施法蓄力：口中绿光凝聚、脉动（张嘴特效 + 出波位置）
      if (castMaw) {
        const gpu = .5 + .5 * Math.sin(e.animTime * 28);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        pRect(hx + 6, -34 + hy + open * .45, 6, 2, `rgba(94,255,138,${.55 + gpu * .4})`);
        glow(hx + 9, -33 + hy + open * .55, 7 + gpu * 4, 'rgba(94,255,138,.55)', .65 + gpu * .3);
        ctx.restore();
      }
      // needle teeth
      for (let i = 0; i < 4; i++) {
        const tx = hx + 4 + i * 2.6;
        pRect(tx, -36 + hy, 1, 1 + (i % 2), '#e2ced7');
        pRect(tx + 1, -34 + hy + open, 1, 1 + ((i + 1) % 2), '#c4abb7');
      }
    } else {
      for (let i = 0; i < 4; i++) pRect(hx + 4 + i * 2.5, -36 + hy, 1, 1, '#d2bac4');
      pRect(hx + 5, -35 + hy, 8, 1, '#2b0b20');
    }
    // jaw hinge shadow
    pRect(hx + 2, -34 + hy, 3, 2, '#1b0722');
    // horns / crown
    const hornCol = e.type.elite ? '#e0cad4' : '#bda2b0';
    const hornShade = e.type.elite ? '#a88c99' : '#866d7a';
    pPoly([[hx + 2, -49 + hy], [hx - 3 - (e.type.elite ? 2 : 0), -60 + hy], [hx + 3, -52 + hy]], '#3d2333');
    pPoly([[hx + 2, -49 + hy], [hx - 2 - (e.type.elite ? 2 : 0), -59 + hy], [hx + 3, -51 + hy]], hornCol);
    pPoly([[hx + 8, -50 + hy], [hx + 12, -59 + hy], [hx + 12, -48 + hy]], '#3d2333');
    pPoly([[hx + 8, -50 + hy], [hx + 11, -57 + hy], [hx + 11, -49 + hy]], hornCol);
    if (e.type.elite) {
      pPoly([[hx - 1, -43 + hy], [hx - 8, -48 + hy], [hx - 1, -39 + hy]], '#7e5f70');
      pPoly([[hx + 14, -46 + hy], [hx + 19, -51 + hy], [hx + 16, -44 + hy]], hornShade);
    }
    // cheek tendrils drifting in the stale air
    pLine(hx + 13, -37 + hy, hx + 19 + Math.sin(t * 3 + e.seed) * .9, -31 + hy, '#45194f', 1);
    pLine(hx + 12, -36 + hy, hx + 17, -29 + hy + Math.sin(t * 2 + e.seed) * 1.3, '#2c0d35', 1);
  }

  // 二阶段副爪：两条低垂的额外肢体，纯剪影，不参与攻击姿态/判定。
  function drawSecondaryClaws(e, bo, lx, t) {
    const swayL = Math.sin(t * 1.6 + e.seed) * 1.2;
    const swayR = Math.sin(t * 1.6 + e.seed + 2.4) * 1.2;
    drawSecondaryClaw(
      -7 + lx * .3, -25 + bo,
      -16 + lx * .4 + swayL, -16 + bo,
      -24 + lx * .45 + swayL * 1.6, -6 + bo,
      -1
    );
    drawSecondaryClaw(
      7 + lx * .3, -22 + bo,
      16 + lx * .4 + swayR, -14 + bo,
      24 + lx * .45 + swayR * 1.6, -6 + bo,
      1
    );
  }

  function drawSecondaryClaw(ax, ay, bx, by, cx, cy, dir) {
    const outline = '#0b0410';
    // 低一档的暗红肢体：比主爪更沉，避免抢主爪的视觉重心
    pRect(ax - 2, ay - 1, 4, 3, outline);
    pLine(ax, ay, bx, by, outline, 5);
    pLine(ax, ay, bx, by, '#3a0b16', 3);
    pLine(ax + dir, ay - 1, bx + dir, by - 1, '#7a1826', 1);
    // elbow
    pRect(bx - 1, by - 1, 3, 3, outline);
    pRect(bx, by, 1, 2, '#6b1421');
    // forearm
    pLine(bx, by, cx, cy, outline, 5);
    pLine(bx, by, cx, cy, '#5e101d', 3);
    pLine(bx - 1, by - 1, cx - 1, cy - 1, 'rgba(206,47,66,.55)', 1);
    // hand pad
    pRect(cx - 2, cy - 2, 4, 4, outline);
    pRect(cx - 1.5, cy - 1.5, 3, 3, '#65131f');
    // three low-slung talons
    const baseAng = Math.atan2(cy - by, cx - bx) + .18;
    for (let i = 0; i < 3; i++) {
      const a = baseAng + (i - 1) * .42;
      const len = 6.5 - Math.abs(i - 1) * 1;
      const tx = cx + Math.cos(a) * len;
      const ty = cy + Math.sin(a) * len;
      pLine(cx, cy, tx, ty, '#0d0512', 2);
      pLine(cx, cy, tx, ty, i === 1 ? '#c9aeb5' : '#8d6a72', 1);
      pRect(tx, ty, 1, 1, i === 1 ? '#ffd4da' : '#c98b95');
    }
    // wrist wrap
    pLine(cx - 2, cy, cx + 2, cy + 1, '#2a0910', 2);
  }

  function drawMonsterArm(arm, front, e, clawGlow) {
    const outline = '#0b0410';
    // 大boss（elite）手部改毒绿渐变（暗绿 → 中绿 → 亮绿高光）；普通怪保持紫
    const green = e.type.elite;
    const dark = green ? (front ? '#1d5a33' : '#143d23') : (front ? '#57236a' : '#3a1749');
    const mid = green ? (front ? '#2e7a44' : '#20552e') : (front ? '#713688' : '#54285f');
    const light = green ? (front ? '#57c46e' : '#3b8a52') : (front ? '#a461b8' : '#78448a');
    const thick = front ? 6 : 5;
    // upper arm
    pLine(arm.sx, arm.sy, arm.ex, arm.ey, outline, thick + 2);
    pLine(arm.sx, arm.sy, arm.ex, arm.ey, dark, thick);
    pLine(arm.sx + 1, arm.sy - 1, arm.ex + 1, arm.ey - 1, mid, 2);
    // elbow spike
    const ea = Math.atan2(arm.ey - arm.sy, arm.ex - arm.sx) - Math.PI / 2;
    pPoly([
      [arm.ex + Math.cos(ea) * 2, arm.ey + Math.sin(ea) * 2],
      [arm.ex + Math.cos(ea) * 8, arm.ey + Math.sin(ea) * 8],
      [arm.ex + Math.cos(ea) * 2 + 2, arm.ey + Math.sin(ea) * 2 + 2]
    ], '#14061b');
    // forearm
    pLine(arm.ex, arm.ey, arm.hx, arm.hy, outline, thick + 2);
    pLine(arm.ex, arm.ey, arm.hx, arm.hy, green ? (front ? '#2a7a42' : '#1c5230') : (front ? '#6a2c80' : '#4a1e57'), thick);
    pLine(arm.ex - 1, arm.ey - 1, arm.hx - 1, arm.hy - 1, green ? (front ? '#4fbf70' : '#33884d') : (front ? '#a765ba' : '#7d4b8e'), 1);
    pLine(arm.ex + 1, arm.ey + 2, arm.hx + 1, arm.hy + 1, green ? (front ? 'rgba(120,255,160,.34)' : 'rgba(70,200,110,.22)') : (front ? 'rgba(218,152,232,.32)' : 'rgba(167,110,181,.2)'), 1);
    // forearm ridges
    for (let i = 1; i <= 2; i++) {
      const px = lerp(arm.ex, arm.hx, i / 3);
      const py = lerp(arm.ey, arm.hy, i / 3);
      pLine(px - 2, py, px + 2, py + 1, green ? 'rgba(120,255,160,.4)' : 'rgba(173,99,190,.45)', 1);
    }
    // hand pad
    pRect(arm.hx - 2, arm.hy - 2, 4, 4, outline);
    pRect(arm.hx - 1.5, arm.hy - 1.5, 3, 3, green ? (front ? '#2e7a44' : '#1d5a33') : (front ? '#85429a' : '#5b296a'));
    // claws
    const baseAng = Math.atan2(arm.hy - arm.ey, arm.hx - arm.ex) + .35;
    const count = 3;
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * .44 * arm.spread;
      const a = baseAng + off;
      const len = (front ? 11 : 8) - Math.abs(i - 1) * 1.5;
      const mx = arm.hx + Math.cos(a) * len * .55 + Math.cos(a + 1.57) * 2;
      const my = arm.hy + Math.sin(a) * len * .55 + Math.sin(a + 1.57) * 2;
      const tx = arm.hx + Math.cos(a) * len;
      const ty = arm.hy + Math.sin(a) * len;
      pLine(arm.hx, arm.hy, mx, my, '#0d0512', 2);
      pLine(mx, my, tx, ty, '#e6d2dd', 2);
      pRect(tx, ty, 1, 1, '#fff1f5');
      if (clawGlow > .1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = clawGlow * .55;
        ctx.fillStyle = e.phase === 2
          ? '#ff4b5c'
          : (e.clawColor || (e.type.elite ? '#7dffb0' : '#ff547f'));
        ctx.fillRect(Math.round(tx), Math.round(ty), 1, 1);
        ctx.restore();
      }
    }
    // wrist wraps
    pLine(arm.hx - 2, arm.hy, arm.hx + 2, arm.hy + 1, '#b595a7', 1);
  }

  function drawEnemyOverlay(e) {
    if (e.state === 'dying') return;
    const sx = e.x - camViewX();
    const sy = e.y + camViewY();
    if (sx < -100 || sx > VW + 100) return;
    const s = e.scale;
    const bob = Math.sin(e.animTime * 2.1 + e.seed) * 1.2;
    const p2 = e.typeKey === 'brute' && e.phase === 2;
    // body sheen: phase 1 violet, phase 2 blood red
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(sx, sy - 28 * s, 30 * s, p2 ? 'rgba(206,47,66,.20)' : 'rgba(138,57,170,.13)', p2 ? .9 : .8);
    if (p2) glow(sx, sy - 30 * s, 46 * s, 'rgba(255,75,92,.10)', .7);
    ctx.restore();
    const warning = e.state === 'windup' || e.state === 'cast' || e.state === 'rift' ||
      e.state === 'spikes' || e.state === 'beam' || e.state === 'rain' ||
      e.state === 'pools' || (e.state === 'charge' && e.chargePhase === 'windup');
    if (warning) {
      const dur = e.state === 'windup' ? e.type.windup
        : e.state === 'cast' ? e.type.cast
        : e.state === 'rift' ? (e.type.riftWindup || .68)
        : e.state === 'spikes' ? (e.type.spikeCast || 1)
        : e.state === 'rain' ? (e.type.rainCast || 1.55)
        : e.state === 'pools' ? (e.type.poolCast || 1.3)
        : e.state === 'charge' ? (e.type.chargeWindup || .72)
        : (e.type.beamCast || 1);
      const p = clamp(e.stateT / dur, 0, 1);
      const pulse = .55 + .45 * Math.sin(e.animTime * (9 + p * 12));
      const danger = smoothstep(.1, .92, p);
      // 头顶感叹号是所有攻击/施法前摇的统一警示；血骸冲锋额外用一条地面虚线提示路径
      drawDangerMark(sx, sy - 86 * s + bob, pulse, danger);
      if (e.state === 'charge') drawChargeTelegraph(e);
    }
    // 绿色冲击波蓄力：口前毒光凝聚 + 旋转孢子环
    if (e.state === 'cast') {
      const p = clamp(e.stateT / e.type.cast, 0, 1);
      const mx = sx + e.facing * 16 * s;
      const my = sy - 38 * s + bob;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(mx, my, 18 + 20 * p, 'rgba(94,255,138,.30)', .55 + .35 * p);
      ctx.globalAlpha = .45 + .35 * p;
      pRing(mx, my, 4 + 10 * p, '#7dffb0');
      pRing(mx, my, 8 + 18 * p, '#c8ffde');
      pRing(mx, my, 13 + 26 * p, '#eafff0');
      for (let i = 0; i < 5; i++) {
        const a = e.animTime * 2.2 + i * (TAU / 5);
        const r0 = 8 + 10 * p, r1 = 20 + 22 * p;
        pLine(
          mx + Math.cos(a) * r0, my + Math.sin(a) * r0,
          mx + Math.cos(a) * r1, my + Math.sin(a) * r1,
          i % 2 ? '#5eff8a' : '#c8ffde', 1
        );
      }
      pRect(mx - 2, my - 2, 4, 4, '#ffffff');
      ctx.restore();
    }
    // eyes — always burning
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const eyeA = (e.state === 'windup' || e.state === 'rain' || e.state === 'pools' ||
      (e.state === 'charge' && e.chargePhase === 'windup')) ? .9
      : (e.state === 'strike' || (e.state === 'charge' && e.chargePhase === 'dash')) ? 1 : .55;
    const ex = sx + e.facing * 10 * s;
    const ey = sy - 45 * s + bob;
    glow(ex, ey, 8 * s, p2 ? 'rgba(255,60,72,.32)' : 'rgba(255,56,150,.20)', eyeA);
    glow(ex - e.facing * 4 * s, ey - 2 * s, 5 * s, p2 ? 'rgba(255,120,130,.24)' : 'rgba(255,120,190,.16)', eyeA);
    ctx.restore();
    // [MOD] 怪物下方血量条（替代头顶血点，始终清晰可见、不受光影影响）
    const hpP = clamp(e.hp / e.maxHp, 0, 1);
    const bw = 26 * s, bh = 3.4;
    const hx = Math.round(sx - bw / 2), hy = Math.round(sy + 9 * s);
    pRect(hx - 1, hy - 1, bw + 2, bh + 2, 'rgba(5,2,8,.85)');
    pRect(hx, hy, bw, bh, '#1a0b22');
    pRect(hx, hy, bw * hpP, bh, hpP > .5 ? '#6fd88a' : hpP > .25 ? '#e8c44a' : '#e44a4a');
    pRect(hx, hy, bw * hpP, 1.2, 'rgba(255,255,255,.4)');
  }

  function drawDangerMark(x, y, pulse, danger) {
    const a = .55 + pulse * .35;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(x, y, 21, 'rgba(255,38,65,.17)', a * .95);
    ctx.globalAlpha = .88;
    // dark diamond bed
    pPoly([
      [x, y - 11], [x + 7, y], [x, y + 11], [x - 7, y]
    ], '#1a050b');
    // pulsing border
    ctx.globalAlpha = a;
    pLine(x, y - 11, x + 7, y, '#ff4059', 1);
    pLine(x + 7, y, x, y + 11, '#ff4059', 1);
    pLine(x, y + 11, x - 7, y, '#b52039', 1);
    pLine(x - 7, y, x, y - 11, '#b52039', 1);
    pRect(x - 1, y - 11, 3, 1, '#ffcad0');
    // exclamation
    drawPixelText('!', x, y - 5, 1, '#fff0e8', 'center', '#43000c');
    // inner charging glint
    if (danger > .55) {
      pRect(x - 1, y + 6, 3, 1, `rgba(255,118,136,${danger})`);
      pRect(x - 1, y - 13, 3, 1, `rgba(255,160,170,${danger * .7})`);
    }
    ctx.restore();
  }

  function drawSpawnPortalOverlay(e) {
    if (e.state !== 'emerge') return;
    const sx = e.x - camViewX(), sy = FLOOR + camViewY();
    const p = clamp(e.stateT / e.emergeDur, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (1 - p) * .7;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 42);
    g.addColorStop(0, 'rgba(165,78,190,.35)');
    g.addColorStop(1, 'rgba(60,15,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - 42, sy - 42, 84, 84);
    ctx.restore();
  }

  function drawRiftTarget(e) {
    if (!e.riftX) return;
    const p = clamp(e.stateT / (e.type.riftWindup || .68), 0, 1);
    const pulse = .55 + .45 * Math.sin(e.animTime * (10 + p * 16));
    const x = e.riftX, y = FLOOR;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(x, y - 6, 22 + p * 18, 'rgba(150,70,190,.17)', .5 + p * .3);
    ctx.globalAlpha = .35 + .45 * p;
    pRing(x, y, 10 + p * 10, '#c271d6');
    pRing(x, y, 5 + p * 6, '#e2a9ef');
    // 外层法阵与四枚旋转碎片
    ctx.globalAlpha = .18 + .28 * p;
    pRing(x, y, 15 + p * 13, '#8a3fa1');
    for (let i = 0; i < 4; i++) {
      const a0 = e.animTime * 2.2 + i * (TAU / 4);
      const rr0 = 13 + p * 5;
      pLine(
        x + Math.cos(a0) * rr0, y - 3 + Math.sin(a0) * rr0 * .5,
        x + Math.cos(a0 + .22) * (rr0 + 5), y - 3 + Math.sin(a0 + .22) * (rr0 + 5) * .5,
        '#e2a9ef', 1
      );
    }
    // 中心向外爬的空间裂纹
    ctx.globalAlpha = .22 + .30 * p;
    for (let i = 0; i < 6; i++) {
      const ca = e.animTime * 1.2 + i * (TAU / 6);
      pLine(x, y - 3, x + Math.cos(ca) * (16 + p * 8), y - 3 + Math.sin(ca) * (9 + p * 4), '#8a3fa1', 1);
    }
    // 旋转菱形
    const a = e.animTime * 1.8;
    const rr = 8 + p * 4;
    pLine(
      x + Math.cos(a) * rr, y - 3 + Math.sin(a) * rr * .42,
      x + Math.cos(a + 1.57) * rr, y - 3 + Math.sin(a + 1.57) * rr * .42,
      '#e2a9ef', 1
    );
    pLine(
      x + Math.cos(a + 1.57) * rr, y - 3 + Math.sin(a + 1.57) * rr * .42,
      x + Math.cos(a + 3.14) * rr, y - 3 + Math.sin(a + 3.14) * rr * .42,
      '#c271d6', 1
    );
    // 竖直裂隙：落点会在这里“裂开”
    ctx.globalAlpha = .22 + .32 * p * pulse;
    pLine(x, y - 4, x, y - 44 - p * 10, '#c271d6', 1);
    pLine(x - 1, y - 6, x - 1, y - 34, '#8a3fa1', 1);
    pRect(x - 1, y - 46 - p * 10, 3, 2, '#ffd0ff');
    // Boss → 落点的虚线
    const n = 10;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = t0 + .045;
      pLine(
        lerp(e.x, x, t0), y - 2, lerp(e.x, x, t1), y - 2,
        'rgba(194,113,214,.32)', 1
      );
    }
    ctx.restore();
  }

  function drawChargeTelegraph(e) {
    if (!Number.isFinite(e.chargeEndX)) return;
    const x0 = e.x - camViewX(), x1 = e.chargeEndX - camViewX();
    const y = FLOOR + camViewY() - 2;
    const p = clamp(e.stateT / (e.type.chargeWindup || .72), 0, 1);
    const dx = x1 - x0;
    if (Math.abs(dx) < 8) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .22 + .26 * p;
    // 用短 pRect 画虚线，避免长线逐像素绘制
    const n = 10;
    const seg = Math.abs(dx) / n * .48;
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, (i + .25) / n);
      pRect(x - seg / 2, y, seg, 1, '#8a1a28');
      pRect(x - seg / 2, y + 1, seg, 1, 'rgba(201,49,69,.80)');
    }
    const dir = sign(dx);
    pLine(x1, y - 4, x1 - dir * 6, y, '#c93145', 1);
    pLine(x1, y + 4, x1 - dir * 6, y, '#c93145', 1);
    pRect(x1 - 1, y - 1, 2, 2, '#ffd0d4');
    ctx.restore();
  }

  function drawBossBeamHazard(h) {
    const x = h.x, y = FLOOR;
    if (h.t < h.warn) {
      const p = clamp(h.t / h.warn, 0, 1);
      const pulse = .55 + .45 * Math.sin(h.t * 24);
      const rr = 7 + p * 5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(x, y - 8, 26 + 18 * p, 'rgba(170,80,220,.20)', .55 + .3 * p);
      ctx.globalAlpha = (.25 + .45 * p) * (.75 + .25 * pulse);
      pRing(x, y, 10 + 13 * p, '#c271d6');
      pRing(x, y, 4 + 7 * p, '#e2a9ef');
      // 竖直预警柱
      ctx.globalAlpha = .05 + .10 * p;
      pRect(x - 7 - 2 * p, -30, 14 + 4 * p, y + 30, '#a64fc4');
      ctx.globalAlpha = .20 + .35 * p;
      pLine(x - 4, -20, x - 4, y, '#8a3fa1', 1);
      pLine(x, -20, x, y, '#c271d6', 1);
      pLine(x + 4, -20, x + 4, y, '#8a3fa1', 1);
      // 地面菱形
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = .55 + .25 * p;
      pPoly([
        [x, y - rr - 3], [x + rr * .7, y - 3], [x, y + rr - 3], [x - rr * .7, y - 3]
      ], 'rgba(24,6,32,.8)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = .55 + .3 * p;
      pLine(x, y - rr - 3, x + rr * .7, y - 3, '#e2a9ef', 1);
      pLine(x + rr * .7, y - 3, x, y + rr - 3, '#c271d6', 1);
      pLine(x, y + rr - 3, x - rr * .7, y - 3, '#8a3fa1', 1);
      pLine(x - rr * .7, y - 3, x, y - rr - 3, '#8a3fa1', 1);
      ctx.restore();
    } else {
      const t = h.t - h.warn;
      const fade = 1 - clamp((t - h.active) / .3, 0, 1);
      if (fade <= 0) return;
      const w = h.w, top = -40;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.globalCompositeOperation = 'lighter';
      pRect(x - w * 1.5, top, w * 3, y - top, 'rgba(120,60,180,.10)');
      // 柱体：暗紫外壳 + 亮紫内芯 + 白热中心
      ctx.globalCompositeOperation = 'source-over';
      pRect(x - w / 2, top, w, y - top, '#2a0e35');
      pRect(x - w / 2 + 4, top, w - 8, y - top, '#522060');
      ctx.globalCompositeOperation = 'lighter';
      pRect(x - w / 4, top, w / 2, y - top, 'rgba(166,79,196,.85)');
      pRect(x - 3, top, 6, y - top, '#e2a9ef');
      pRect(x - 1, top, 2, y - top, '#ffffff');
      // 两侧锯齿流光
      for (let i = 0; i < 8; i++) {
        const yy = top + (y - top) * (i + .5) / 8;
        const dx = Math.sin(i * 2.7 + h.t * 20) * 3;
        pLine(x - w / 2 - 2, yy, x - w / 2 + 2 + dx, yy + 5, '#c271d6', 1);
        pLine(x + w / 2 + 2, yy, x + w / 2 - 2 - dx, yy + 5, '#8a3fa1', 1);
      }
      // 落点冲击环
      ctx.globalAlpha = fade * .8;
      const rr = 22 + 10 * clamp(t / .2, 0, 1);
      pRing(x, y, rr, '#e2a9ef');
      pRing(x, y, rr * .55, '#ffffff');
      ctx.restore();
    }
  }

  function drawBossRainHazard(h) {
    const x = h.x, y = FLOOR;
    if (h.t < h.warn) {
      const p = clamp(h.t / h.warn, 0, 1);
      const pulse = .6 + .4 * Math.sin(h.t * 24);
      const dropY = lerp(-18, y - 22, p);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(x, y - 4, 14 + 10 * p, 'rgba(160,30,48,.16)', .45 + .3 * p);
      ctx.globalAlpha = (.18 + .32 * p) * (.8 + .2 * pulse);
      // 用竖直 pRect 画出贯穿上下的预警线，避免长 pLine 逐像素循环
      pRect(x - 1, -18, 2, y + 18, 'rgba(138,26,40,.30)');
      pRect(x, -18, 1, y + 18, 'rgba(201,49,69,.42)');
      ctx.globalAlpha = .55 + .3 * p;
      pRect(x - 1, dropY, 3, 5, '#c93145');
      pRect(x, dropY + 1, 1, 2, '#ffd0d4');
      const rr = 7 + p * 5;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = .6;
      pPoly([[x, y - rr - 3], [x + rr * .72, y - 3], [x, y + rr - 3], [x - rr * .72, y - 3]], 'rgba(30,5,11,.82)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = .55 + .3 * p;
      pLine(x, y - rr - 3, x + rr * .72, y - 3, '#c93145', 1);
      pLine(x + rr * .72, y - 3, x, y + rr - 3, '#8a1a28', 1);
      pLine(x, y + rr - 3, x - rr * .72, y - 3, '#8a1a28', 1);
      pLine(x - rr * .72, y - 3, x, y - rr - 3, '#c93145', 1);
      ctx.restore();
    } else {
      const t = h.t - h.warn;
      const fade = 1 - clamp((t - h.active) / .28, 0, 1);
      if (fade <= 0) return;
      const w = h.w;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.globalCompositeOperation = 'lighter';
      glow(x, FLOOR - 14, 30, 'rgba(201,49,69,.18)', .55 * fade);
      ctx.globalAlpha = fade * .72;
      pRect(x - w / 2 - 4, -18, w + 8, y + 18, 'rgba(120,20,35,.16)');
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade;
      pRect(x - w / 2, -18, w, y + 18, '#3a0a12');
      pRect(x - w * .28, -18, w * .56, y + 18, '#5e0e1a');
      ctx.globalCompositeOperation = 'lighter';
      pRect(x - 3, -18, 6, y + 18, 'rgba(201,49,69,.86)');
      pRect(x - 1, -18, 2, y + 18, '#ffd0d4');
      ctx.globalAlpha = fade * .85;
      pRect(x - w * .9, y - 3, w * 1.8, 2, 'rgba(138,26,40,.55)');
      pRect(x - w * .5, y - 5, w, 1, 'rgba(255,107,120,.45)');
      for (let i = 0; i < 3; i++) {
        const fx = x + Math.sin(t * 17 + i * 2.1) * w * .7;
        const fy = -10 + ((t * 190 + i * 83) % (y + 10));
        pRect(fx, fy, 1, 3, i % 2 ? '#8a1a28' : '#c93145');
      }
      ctx.restore();
    }
  }

  function drawBossPoolHazard(h) {
    const x = h.x, y = FLOOR - 1;
    if (h.t < h.warn) {
      const p = clamp(h.t / h.warn, 0, 1);
      const pulse = .6 + .4 * Math.sin(h.t * 20);
      const rr = 8 + p * 8;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(x, y - 4, 12 + 14 * p, 'rgba(138,26,40,.16)', .4 + .3 * p);
      ctx.globalAlpha = (.25 + .35 * p) * (.8 + .2 * pulse);
      pLine(x - rr, y, x + rr, y, '#8a1a28', 1);
      pLine(x, y - rr * .42, x, y + rr * .42, '#c93145', 1);
      for (let i = 0; i < 4; i++) {
        const a = i * TAU / 4 + .4;
        pLine(x, y, x + Math.cos(a) * (rr + 5), y + Math.sin(a) * (rr + 5) * .35, '#5e0e1a', 1);
      }
      pRect(x - 2, y - 2, 5, 4, 'rgba(201,49,69,.55)');
      ctx.restore();
    } else {
      const t = h.t - h.warn;
      const fade = 1 - clamp((t - h.active) / .3, 0, 1);
      if (fade <= 0) return;
      const r = h.w / 2;
      ctx.save();
      ctx.globalAlpha = .86 * fade;
      ctx.globalCompositeOperation = 'source-over';
      if (h.pts) pPoly(h.pts, '#2a0810');
      if (h.innerPts) pPoly(h.innerPts, '#5e0e1a');
      ctx.globalAlpha = .9 * fade;
      pRect(x - r * .7, y - 1, r * 1.4, 1, 'rgba(138,26,40,.75)');
      pRect(x - r * .4, y - 2, r * .8, 1, 'rgba(201,49,69,.55)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * (.32 + .18 * Math.sin(t * 5 + h.x));
      pRect(x - r, y - 1, r * 2, 1, '#8a1a28');
      for (let i = 0; i < 3; i++) {
        const bx = x + Math.sin(t * 1.7 + i * 2.1) * r * .55;
        const by = y - 2 - ((t * 7 + i * 4) % 9);
        pRect(bx, by, 2, 2, i === 1 ? '#c93145' : '#8a1a28');
        pRect(bx, by, 1, 1, '#ff6b78');
      }
      ctx.restore();
    }
  }

  function drawBossHazards() {
    for (const h of bossHazards) {
      if (h.kind === 'beam') {
        drawBossBeamHazard(h);
        continue;
      }
      if (h.kind === 'rain') {
        drawBossRainHazard(h);
        continue;
      }
      if (h.kind === 'pool') {
        drawBossPoolHazard(h);
        continue;
      }
      const x = h.x, y = FLOOR;
      if (h.t < h.warn) {
        const p = clamp(h.t / h.warn, 0, 1);
        const pulse = .55 + .45 * Math.sin(h.t * 22);
        const rr = 7 + p * 5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(x, y - 6, 18 + 14 * p, 'rgba(150,70,190,.18)', .5 + .3 * p);
        ctx.globalAlpha = (.22 + .45 * p) * (.72 + .28 * pulse);
        pRing(x, y, 8 + 10 * p, '#b96bd2');
        pRing(x, y, 3 + 6 * p, '#e2a9ef');
        // 暗色菱形底 + 亮边
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = .55 + .3 * p;
        pPoly([
          [x, y - rr - 3], [x + rr * .7, y - 3], [x, y + rr - 3], [x - rr * .7, y - 3]
        ], 'rgba(24,6,32,.78)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = .55 + .3 * p;
        pLine(x, y - rr - 3, x + rr * .7, y - 3, '#c271d6', 1);
        pLine(x + rr * .7, y - 3, x, y + rr - 3, '#c271d6', 1);
        pLine(x, y + rr - 3, x - rr * .7, y - 3, '#8a3fa1', 1);
        pLine(x - rr * .7, y - 3, x, y - rr - 3, '#8a3fa1', 1);
        // 旋转碎片与地面裂纹
        ctx.globalAlpha = .35 + .3 * p;
        for (let i = 0; i < 4; i++) {
          const a0 = h.t * 2.4 + i * (TAU / 4);
          const r0 = 13 + p * 4;
          pLine(
            x + Math.cos(a0) * r0, y - 3 + Math.sin(a0) * r0 * .45,
            x + Math.cos(a0 + .25) * (r0 + 5), y - 3 + Math.sin(a0 + .25) * (r0 + 5) * .45,
            '#e2a9ef', 1
          );
        }
        for (let i = 0; i < 3; i++) {
          const a0 = h.t * 1.4 + i * (TAU / 3);
          pLine(x, y - 3, x + Math.cos(a0) * (16 + p * 6), y - 3 + Math.sin(a0) * (9 + p * 4), '#8a3fa1', 1);
        }
        // 竖直高度线：告诉玩家地刺会多高
        ctx.globalAlpha = .18 + .35 * p;
        pLine(x, y - 3, x, y - 44, '#c271d6', 1);
        pRect(x - 1, y - 46, 3, 2, '#ffd0ff');
        ctx.restore();
      } else {
        const t = h.t - h.warn;
        const rise = clamp(t / .12, 0, 1);
        const fade = 1 - clamp((t - h.active) / .3, 0, 1);
        if (fade <= 0) continue;
        const hh = 46 * easeOutCubic(rise) * (.55 + .45 * fade);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade;
        glow(x, y - 6, 26, 'rgba(160,80,200,.25)', .6 * fade);
        // 三根锯齿柱：中间高、两侧矮
        for (let i = -1; i <= 1; i++) {
          const bx = x + i * 8;
          const ph = hh * (i === 0 ? 1 : .72);
          ctx.globalCompositeOperation = 'source-over';
          pPoly([
            [bx - 5, y], [bx - 2, y - ph * .55], [bx - 1, y - ph],
            [bx + 2, y - ph * .6], [bx + 5, y]
          ], '#2a0e35');
          pPoly([
            [bx - 2.5, y], [bx - 1, y - ph * .5], [bx, y - ph * .86],
            [bx + 1.5, y - ph * .55], [bx + 3, y]
          ], '#4a1a5e');
          ctx.globalCompositeOperation = 'lighter';
          pLine(bx, y - 2, bx, y - ph, '#c271d6', 1);
          pLine(bx - 2, y - 4, bx - 1, y - ph * .75, '#e2a9ef', 1);
          pLine(bx + 1.5, y - 4, bx + 1, y - ph * .6, '#8a3fa1', 1);
          pRect(bx - 1, y - ph, 2, 2, '#ffd0ff');
        }
        // 根部飞散碎片
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * (.5 + .5 * rise);
        for (let i = 0; i < 4; i++) {
          const a0 = h.t * 3 + i * (TAU / 4);
          const r0 = 8 + 10 * rise;
          pLine(
            x + Math.cos(a0) * r0, y - 3, x + Math.cos(a0) * (r0 + 5), y - 3 + Math.sin(a0) * 4,
            i % 2 ? '#e2a9ef' : '#8a3fa1', 1
          );
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * .5;
        pRing(x, y, 10 + 6 * rise, '#b96bd2');
        pRing(x, y, 17 + 9 * rise, '#e2a9ef');
        ctx.restore();
      }
    }
  }

  /* ============================================================
     WAVES · RUN FLOW
     ============================================================ */
  const WAVES = [
    [{ type: 'stalker', count: 3 }],
    [{ type: 'stalker', count: 4 }],
    [{ type: 'brute', count: 1 }]
  ];
  let waveIndex = 0;
  let wavePhase = 'idle';
  let waveTimer = 0;
  let waveTotal = 0;
  let spawnQueue = [];
  let spawnSide = 1;
  // [MOD] 出生点安全区：开局不刷怪，玩家从出生点向前推进 ≥220px 后才开始生成
  let spawnSafe = true;
  let runSpawnX = 0;
  let deathDelay = 0;
  let elapsedRun = 0;
  let tutorialTipShown = false;
  let riftTipShown = false;
  let spikeTipShown = false;
  let beamTipShown = false;

  function beginRun() {
    resetBossCGState();
    Sound.init();
    Sound.resume();
    hideAllScreens();
    hud.classList.remove('is-hidden');
    resetPlayer(252);
    runSpawnX = player.x;
    spawnSafe = true;
    enemies = [];
    particles.length = 0;
    rings.length = 0;
    slashArcs.length = 0;
    flashLines.length = 0;
    waves.length = 0;
    bossHazards.length = 0;
    ultOrb = null;
    darkFlash = 0;
    texts.length = 0;
    ghosts.length = 0;
    flashAlpha = 0;
    hitstop = 0;
    camera.trauma = 0;
    camera.x = clamp(player.x - VW / 2, 0, WORLD_W - VW);
    gameState = 'playing';
    waveIndex = -1;
    wavePhase = 'idle';
    waveTotal = 0;
    spawnQueue = [];
    elapsedRun = 0;
    tutorialTipShown = false;
    riftTipShown = false;
    spikeTipShown = false;
    beamTipShown = false;
    parryCallout.classList.remove('is-visible');
    hintBar.classList.remove('is-visible');
    syncHUD(true);
    startWave(0);
    showHint('K', '刃反 · 振刀', '盯住紫爪：警示符骤亮、爪锋将落时按下 K', 5.8);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function startWave(index) {
    waveIndex = index;
    wavePhase = 'intro';
    waveTimer = 1.28;
    waveTotal = 0;
    spawnQueue = [];
    spawnSide = index % 2 === 0 ? 1 : -1;
    for (const spec of WAVES[index]) {
      for (let i = 0; i < spec.count; i++) spawnQueue.push(spec.type);
      waveTotal += spec.count;
    }
    camera.trauma = Math.max(camera.trauma, .1);
    waveRomanEl.textContent = roman(index);
    syncEnemyPips();
    Sound.wave();
    const copy = [
      ['第 一 波', 'WAVE I', '她消失的那夜，回廊刮起了紫色的风'],
      ['第 二 波', 'WAVE II', '循着她的气息，穿过每一道渗血的墙'],
      ['最 后 一 波', 'FINAL WAVE', '守夜人拦在尽头——她就在那后面']
    ][index] || ['寻 她', 'WAVE', ''];
    showAnnounce(copy[0], copy[1], copy[2], 2.35);
  }

  function updateWaves(dt) {
    if (gameState !== 'playing') return;
    switch (wavePhase) {
      case 'intro':
        waveTimer -= dt;
        if (waveTimer <= 0) {
          wavePhase = 'spawning';
          waveTimer = .2;
        }
        break;
      case 'spawning':
        waveTimer -= dt;
        if (waveTimer <= 0) {
          if (spawnQueue.length > 0) {
            // 出生点安全区：玩家向前推进 ≥220px 前不刷怪（原地等待不消耗队列）
            if (spawnSafe && player.x - runSpawnX > 220) spawnSafe = false;
            if (!spawnSafe) {
              spawnNextEnemy();
              waveTimer = rand(.28, .48);
            } else {
              waveTimer = .12;
            }
          } else {
            wavePhase = 'active';
            syncEnemyPips();
          }
        }
        break;
      case 'active':
        if (remainingEnemies() <= 0) {
          wavePhase = 'cleared';
          waveTimer = 2.15;
          onWaveCleared();
        }
        break;
      case 'cleared':
        waveTimer -= dt;
        if (waveTimer <= 0) {
          if (waveIndex >= WAVES.length - 1) triggerVictory();
          else startWave(waveIndex + 1);
        }
        break;
    }
  }

  function spawnNextEnemy() {
    const typeKey = spawnQueue.shift();
    let side = spawnSide;
    spawnSide *= -1;
    // alternate sides so the player is flanked instead of fighting one purple wall
    if (chance(.18)) side *= -1;
    let x = player.x + side * rand(118, 188);
    if (x < 52 || x > WORLD_W - 52) {
      side *= -1;
      x = player.x + side * rand(118, 175);
    }
    x = clamp(x, 48, WORLD_W - 48);
    if (Math.abs(x - player.x) < 95) {
      x = clamp(player.x + (player.x < WORLD_W * .5 ? 148 : -148), 48, WORLD_W - 48);
    }
    if (typeKey === 'brute') {
      // keep the warden a little farther back from the smaller claws
      x = clamp(x + side * 16, 60, WORLD_W - 60);
    }
    spawnEnemyAt(typeKey, x);
    syncEnemyPips();
  }

  function remainingEnemies() {
    return enemies.filter(e => e.hp > 0 && e.state !== 'dying').length + spawnQueue.length;
  }

  function onWaveCleared() {
    spawnQueue = [];
    waves.length = 0;
    bossHazards.length = 0;
    syncEnemyPips();
    Sound.waveClear();
    const heal = waveIndex >= WAVES.length - 1 ? 22 : 18;
    const before = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + heal);
    const actual = Math.round(player.hp - before);
    if (actual > 0) {
      spawnParticles(player.x, player.y - 22, 14, {
        colors: ['#e9cf8d', '#aee8b3', '#fff1c1'], speed: [15, 70], life: [.4, .9],
        size: [1, 2], gravity: -70, drag: 1, angle: [0, TAU], additive: true, jitter: 7
      });
      addFloatingText(player.x, player.y - 46, '+' + actual, '#c9e8b7', 1);
    }
    syncHUD(true);
    if (waveIndex < WAVES.length - 1) {
      showAnnounce('风 停 一 刻', 'THE WIND HOLDS', actual > 0 ? '伤口愈合 · 离她更近一步' : '气息未乱 · 离她更近一步', 2.3);
    } else {
      showAnnounce('灯 火 在 望', 'A LIGHT AHEAD', '尽头的光，会是她的灯火吗', 2.15);
    }
    // let the last corpse dissolve while the room breathes
    for (const e of enemies) {
      if (e.state !== 'dying') {
        e.state = 'stagger';
        e.stateT = 0;
        e.staggerDur = 2.1;
      }
    }
  }

  function triggerVictory() {
    if (gameState !== 'playing') return;
    gameState = 'victory';
    hud.classList.add('is-hidden');
    announceEl.classList.remove('is-visible');
    hintBar.classList.remove('is-visible');
    clearTimeout(hintTimeout);
    Sound.victory();
    screenFlash(.25, '235,205,150');
    addTrauma(.15);
    $('winKills').textContent = player.kills;
    $('winCombo').textContent = player.maxCombo;
    $('winDeflects').textContent = player.deflects;
    $('winTime').textContent = fmtTime(elapsedRun);
    victoryScreen.classList.remove('is-hidden');
    parryCallout.classList.remove('is-visible');
  }

  function showDeathScreen() {
    if (gameState === 'dead') return;
    gameState = 'dead';
    waves.length = 0;
    bossHazards.length = 0;
    hud.classList.add('is-hidden');
    hintBar.classList.remove('is-visible');
    announceEl.classList.remove('is-visible');
    clearTimeout(hintTimeout);
    $('deathKills').textContent = player.kills;
    $('deathCombo').textContent = player.maxCombo;
    $('deathDeflects').textContent = player.deflects;
    $('deathWave').textContent = roman(Math.max(0, waveIndex));
    deathScreen.classList.remove('is-hidden');
    parryCallout.classList.remove('is-visible');
  }

  function togglePause(pausing) {
    if (pausing && gameState === 'playing') {
      gameState = 'paused';
      keys.clear();
      pauseScreen.classList.remove('is-hidden');
    } else if (!pausing && gameState === 'paused') {
      gameState = 'playing';
      player.invuln = Math.max(player.invuln, .4);
      pauseScreen.classList.add('is-hidden');
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }
  }

  function returnToTitle() {
    resetBossCGState();
    gameState = 'title';
    hideAllScreens();
    titleScreen.classList.remove('is-hidden');
    hud.classList.add('is-hidden');
    pauseScreen.classList.add('is-hidden');
    deathScreen.classList.add('is-hidden');
    victoryScreen.classList.add('is-hidden');
    announceEl.classList.remove('is-visible');
    hintBar.classList.remove('is-visible');
    parryCallout.classList.remove('is-visible');
    clearTimeout(hintTimeout);
    enemies = [];
    particles.length = 0;
    rings.length = 0;
    slashArcs.length = 0;
    flashLines.length = 0;
    waves.length = 0;
    bossHazards.length = 0;
    ultOrb = null;
    darkFlash = 0;
    texts.length = 0;
    ghosts.length = 0;
    flashAlpha = 0;
    hitstop = 0;
    camera.trauma = 0;
    camera.x = 0;
    resetPlayer(356);
    player.animTime = rand(0, 10);
    wavePhase = 'idle';
    waveTotal = 0;
    spawnQueue = [];
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function hideAllScreens() {
    titleScreen.classList.add('is-hidden');
    pauseScreen.classList.add('is-hidden');
    deathScreen.classList.add('is-hidden');
    victoryScreen.classList.add('is-hidden');
  }

  /* ============================================================
     HUD
     ============================================================ */
  const hudCache = { hp: -1, max: -1, deflects: -1, kills: -1, wave: -1, pips: -1, combo: -1 };
  let announceTimeout = null;
  let hintTimeout = null;

  function syncHUD(force = false) {
    if (!player) return;
    const p = player;
    if (force || p.hp !== hudCache.hp || p.maxHp !== hudCache.max) {
      hudCache.hp = p.hp;
      hudCache.max = p.maxHp;
      const pct = clamp(p.hp / p.maxHp * 100, 0, 100);
      hpFill.style.width = pct + '%';
      hpLag.style.width = pct + '%';
      hpText.textContent = Math.ceil(p.hp) + ' / ' + p.maxHp;
      hpFill.classList.toggle('is-low', pct <= 30);
    }
    if (force || p.deflects !== hudCache.deflects) {
      hudCache.deflects = p.deflects;
      deflectCountEl.textContent = pad2(p.deflects);
    }
    if (force || p.kills !== hudCache.kills) {
      hudCache.kills = p.kills;
      killCountEl.textContent = '斩 ' + pad2(p.kills);
    }
    syncComboHUD(false);
  }

  function syncComboHUD(pop = false) {
    if (!player) return;
    const visible = player.combo >= 2;
    comboHud.classList.toggle('is-visible', visible);
    if (player.combo !== hudCache.combo) {
      hudCache.combo = player.combo;
      comboNum.textContent = player.combo;
    }
    if (pop && visible) {
      comboHud.classList.remove('bump');
      void comboHud.offsetWidth;
      comboHud.classList.add('bump');
    }
  }
  function updateHUDCombo(pop = false) { syncComboHUD(pop); }

  function syncEnemyPips() {
    const alive = remainingEnemies();
    if (alive === hudCache.pips && waveTotal === hudCache.wave) return;
    hudCache.pips = alive;
    hudCache.wave = waveTotal;
    let html = '';
    for (let i = 0; i < waveTotal; i++) {
      html += `<i class="${i < alive ? 'is-alive' : 'is-dead'}"></i>`;
    }
    enemyPips.innerHTML = html;
    enemyPips.setAttribute('aria-label', `剩余敌人 ${alive}`);
  }

  function showAnnounce(zh, en, sub = '', duration = 2.4) {
    announceZh.textContent = zh;
    announceEn.textContent = en;
    announceSub.textContent = sub;
    announceEl.classList.add('is-visible');
    clearTimeout(announceTimeout);
    announceTimeout = setTimeout(() => announceEl.classList.remove('is-visible'), duration * 1000);
  }

  function showHint(key, title, sub, duration = 5200) {
    hintKey.textContent = key;
    hintTitle.textContent = title;
    hintSub.textContent = sub;
    hintBar.classList.add('is-visible');
    clearTimeout(hintTimeout);
    hintTimeout = setTimeout(() => hintBar.classList.remove('is-visible'), duration * 1000);
  }

  function showParryCallout() {
    if (gameState === 'cutscene') return;
    parryCallout.classList.remove('is-visible');
    void parryCallout.offsetWidth;
    parryCallout.classList.add('is-visible');
  }

  /* ============================================================
     CAMERA & VIEW
     ============================================================ */
  let viewX = 0;
  let viewY = 0;
  function camViewX() { return viewX; }
  function camViewY() { return viewY; }

  function updateCamera(dt, title = false) {
    if (title) {
      camera.x = Math.sin(ambientTime * .075) * 5;
      camera.trauma = Math.max(0, camera.trauma - dt);
    } else {
      const target = clamp(player.x - VW / 2 + player.facing * 24 + player.vx * .09, 0, WORLD_W - VW);
      camera.x = damp(camera.x, target, 4.2, dt);
      camera.trauma = Math.max(0, camera.trauma - dt * 1.55);
    }
    const s = camera.trauma * camera.trauma;
    camera.shakeX = Math.sin(ambientTime * 71.7) * s * 5.2 + Math.sin(ambientTime * 39.1) * s * 2.3;
    camera.shakeY = Math.cos(ambientTime * 59.3) * s * 3.2 + Math.sin(ambientTime * 87.1) * s * 1.3;
  }

  /* ============================================================
     TITLE / UPDATE / RENDER
     ============================================================ */
  function updateTitle(dt) {
    player.animTime += dt;
    player.x = 356;
    player.y = FLOOR;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.attack = null;
    player.parry = false;
    player.dashTimer = 0;
    player.hurtT = 0;
    player.facing = 1;
    updateCamera(dt, true);
  }

  function updateGame(dt) {
    if (gameState === 'playing') elapsedRun += dt;
    if (gameState === 'playing') {
      updatePlayer(dt);
      if (gameState === 'cutscene') return;
      updateEnemies(dt, ambientTime);
      if (gameState === 'cutscene') return;
      if (gameState === 'playing') updateWaves(dt);
      updateCamera(dt);
    } else if (gameState === 'dying') {
      deathDelay -= dt;
      updatePlayer(dt);
      updateEnemies(dt, ambientTime);
      updateCamera(dt);
      if (deathDelay <= 0) showDeathScreen();
    }
    updateEffects(dt);
    syncHUD(false);
  }

  function drawGhosts() {
    for (const g of ghosts) {
      const a = clamp(1 - g.life / g.dur, 0, 1) * .28;
      if (a <= .01) continue;
      const fake = {
        x: g.x, y: g.y, facing: g.facing, animTime: g.animTime, runPhase: g.runPhase, runFrame: g.runFrame,
        redGhost: g.redGhost,
        hurtT: g.state === 'hurt' ? 1 : 0, parry: g.state === 'parry',
        dashTimer: g.state === 'dash' ? 1 : 0, attack: g.state === 'attack' ? { t: g.attackT } : null,
        attackIndex: g.attackIndex, onGround: g.onGround, vx: g.vx, vy: g.vy, alive: true
      };
      drawPlayerSprite(fake, { ghost: true, alpha: a, redGhost: g.redGhost });
      if (g.redGhost) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a * 1.35;
        glow(g.x, g.y - 20, 24, 'rgba(255,75,92,.34)', .8);
        glow(g.x, g.y - 18, 10, 'rgba(255,160,170,.22)', .8);
        ctx.restore();
      }
    }
  }

  function render() {
    viewX = Math.round(camera.x + camera.shakeX);
    viewY = Math.round(camera.shakeY);
    const t = ambientTime;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, VW, VH);
    if (gameState === 'cutscene') {
      drawBossPhaseCG();
      return;
    }

    drawBackground(t);
    drawAtmosphereScreen(t);

    // world entities
    ctx.save();
    ctx.translate(-viewX, viewY);
    for (const e of enemies) drawEnemy(e);
    drawGhosts();
    drawPlayer(player);
    ctx.restore();

    // a faint personal aura so the fight stays legible in the dark
    lightSources.push({
      x: player.x - viewX, y: player.y - 22 + viewY,
      r: player.alive ? 84 : 48, warm: false, strength: .35
    });
    // 次元斩的小圆球本身发出冷光，让球心周围的暗部有一圈微弱反差
    if (ultOrb) {
      const og = easeOutCubic(clamp(ultOrb.t / ultOrb.dur, 0, 1));
      lightSources.push({
        x: ultOrb.x - viewX, y: ultOrb.y + viewY,
        r: 30 + og * 16, warm: false, strength: .32
      });
    }
    for (const e of enemies) {
      if (e.state === 'dying') continue;
      lightSources.push({
        x: e.x - viewX, y: e.y - 26 * e.scale + viewY,
        r: 38 * e.scale + 12, warm: false, strength: .25
      });
    }

    // darkness, with holes cut by torches and eyes
    applyLighting();

    // glowing details live above the darkness
    for (const e of enemies) {
      drawSpawnPortalOverlay(e);
      drawEnemyOverlay(e);
    }
    drawEyeAndBladeGlow(player);
    drawPlayerAttackArc(player);
    drawWorldEffects(viewX, viewY);
    drawAmbientFront(t);
    drawForeground(t);
    drawFlash();
  }

  /* ============================================================
     SCREEN WIRING
     ============================================================ */
  $('startBtn').addEventListener('click', () => {
    Sound.init();
    Sound.resume();
    beginRun();
  });
  $('resumeBtn').addEventListener('click', () => {
    Sound.init(); Sound.resume();
    togglePause(false);
  });
  $('pauseQuitBtn').addEventListener('click', () => {
    Sound.init(); Sound.resume();
    returnToTitle();
  });
  $('retryBtn').addEventListener('click', () => {
    Sound.init(); Sound.resume();
    beginRun();
  });
  $('deathTitleBtn').addEventListener('click', () => {
    Sound.init(); Sound.resume();
    returnToTitle();
  });
  $('winRetryBtn').addEventListener('click', () => {
    Sound.init(); Sound.resume();
    beginRun();
  });
  $('winTitleBtn').addEventListener('click', () => {
    Sound.init(); Sound.resume();
    returnToTitle();
  });

  /* ============================================================
     MAIN LOOP
     ============================================================ */
  resetPlayer(356);
  player.animTime = rand(2, 8);
  camera.x = 0;
  gameState = 'title';
  hud.classList.add('is-hidden');
  pauseScreen.classList.add('is-hidden');
  deathScreen.classList.add('is-hidden');
  victoryScreen.classList.add('is-hidden');

  let lastTime = performance.now();
  function loop(now) {
    const raw = Math.min((now - lastTime) / 1000, .033);
    lastTime = now;
    if (gameState !== 'cutscene') {
      ambientTime += raw;
      updateAmbient(raw, ambientTime);
    }
    // [PERF] 每帧重置特效预算与反馈去重标志
    // [PERF] 帧率自适应降载：峰值敏感——单帧超过 30ms 记 +3，正常帧 -1。
    // 出现几次尖峰即进入降载（关闭光晕 + 粒子预算减半），平稳后自动回满
    const fms = raw * 1000;
    if (fms > 30) slowFrameCount += 3;
    else slowFrameCount = Math.max(0, slowFrameCount - 1);
    if (slowFrameCount > 8) {
      if (!perfMode) { perfMode = 1; glowEnable = false; }
    } else if (slowFrameCount < 3) {
      if (perfMode) { perfMode = 0; glowEnable = true; }
    }
    fxBudget = perfMode ? (FX_BUDGET >> 1) : FX_BUDGET;

    if (gameState === 'cutscene') {
      updateBossPhaseCG(raw);
    } else if (gameState === 'title') {
      updateTitle(raw);
    } else if (gameState === 'playing' || gameState === 'dying') {
      let simDt = raw;
      if (hitstop > 0) {
        hitstop -= raw;
        simDt = raw * .16;
        if (hitstop < 0) hitstop = 0;
      }
      updateGame(simDt);
    } else if (gameState === 'paused') {
      // hold the breath; only the torches keep moving
    }
    render();
    // [PERF] DOM 更新统一到帧末执行一次（血条、连击、敌人数量）
    if (hudDirty || pipsDirty) {
      hudDirty = false;
      pipsDirty = false;
      syncHUD(true);
      updateHUDCombo(true);
      syncEnemyPips();
    }
    requestAnimationFrame(loop);
  }

  // ===== HUD 角色大头照 =====
  function drawPlayerPortrait() {
    const c = document.getElementById('portraitCanvas');
    if (!c || c.dataset.done) return;
    c.dataset.done = '1';
    const g = c.getContext('2d');
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    // 深空底色
    px(0, 0, 44, 44, '#0a0912');
    // 兜帽主体（深靛蓝，梯形收底）
    px(7, 2, 30, 4, '#0c0e18');
    px(5, 5, 34, 4, '#10131f');
    px(6, 8, 32, 4, '#141724');
    px(8, 11, 28, 3, '#111420');
    px(10, 14, 24, 2, '#0d0f1a');
    // 兜帽受光高光（左侧受光，更有立体感）
    px(8, 3, 11, 2, '#2b3348');
    px(7, 6, 9, 2, '#232b3e');
    px(6, 9, 6, 2, '#1c2334');
    px(9, 12, 5, 1, '#1a2030');
    // 兜帽右尾尖（随风飘）
    px(34, 6, 6, 2, '#141724');
    px(38, 7, 3, 2, '#0c0e18');
    // 额前头罩折痕
    px(10, 15, 9, 1, '#181d2c');
    px(23, 15, 9, 1, '#141926');
    // 面罩（黑，只露眼缝）
    px(9, 17, 26, 10, '#08080c');
    px(11, 26, 22, 3, '#0a0a0f');
    px(13, 29, 18, 2, '#060609');
    // 眉骨阴影
    px(12, 17, 9, 2, '#05050a');
    px(25, 17, 8, 2, '#05050a');
    // 左眼：锐利上挑的红色斜缝
    px(12, 19, 9, 2, '#ff3045');
    px(12, 19, 4, 1, '#ffb2ba');
    px(19, 19, 2, 1, '#a8112a');
    // 右眼（镜像）
    px(25, 19, 8, 2, '#ff3045');
    px(25, 19, 3, 1, '#ffb2ba');
    px(31, 19, 2, 1, '#a8112a');
    // 眼角上挑（凌厉）
    px(11, 20, 2, 1, '#ff3045');
    px(33, 20, 1, 1, '#ff3045');
    // 围巾领口（深灰蓝 + 高光 + 右侧飘带）
    px(7, 30, 30, 4, '#2a2d39');
    px(7, 30, 30, 1, '#4a4f65');
    px(9, 34, 26, 2, '#20232e');
    px(30, 31, 8, 1, '#2a2d39');
    px(36, 30, 6, 2, '#343a4e');
    px(40, 31, 3, 1, '#232836');
    // 围巾内侧暗红镶边（呼应刀与血）
    px(7, 32, 30, 1, '#4a1d28');
    // 衣领
    px(10, 36, 24, 2, '#12141d');
    px(12, 38, 20, 2, '#0b0c12');
    // 暗红描边角光（左上）
    px(3, 3, 2, 1, '#3a1018');
    px(2, 4, 1, 2, '#3a1018');
  }

  drawPlayerPortrait();
  requestAnimationFrame(loop);

})();