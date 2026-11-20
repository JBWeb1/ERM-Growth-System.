/* ERM-Growth System — core utilities, icons, charts, modal/toast.  (no dependencies) */
(function (w) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  /* ---------- formatting ---------- */
  function fmtN(n) {
    n = Math.round(n || 0); const a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString('en-US');
  }
  const fmtFull = n => Math.round(n || 0).toLocaleString('en-US');
  const fmtPct = (n, d = 1) => (n || 0).toFixed(d) + '%';
  const CUR = { USD: '$', ZAR: 'R' };
  function money(n, cur = 'USD') { return (CUR[cur] || '') + Math.round(n || 0).toLocaleString('en-US'); }
  function fmtHours(h) { return h >= 100 ? fmtN(h) + ' h' : h.toFixed(1) + ' h'; }
  const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = s => { if (!s) return '—'; const d = parse(s.slice(0, 10)); return d.getDate() + ' ' + MON[d.getMonth()]; };
  const fmtDateY = s => { if (!s) return '—'; const d = parse(s.slice(0, 10)); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
  const todayISO = () => iso(new Date());
  const uid = p => p + Math.random().toString(36).slice(2, 8);
  const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  function ago(ts) {
    const m = Math.round((Date.now() - ts) / 6e4);
    if (m < 1) return 'just now'; if (m < 60) return m + 'm ago';
    if (m < 1440) return Math.round(m / 60) + 'h ago'; return Math.round(m / 1440) + 'd ago';
  }

  /* ---------- icons ---------- */
  const P = {
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    check: 'M20 6L9 17l-5-5',
    checksq: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    calendar: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M16 2v4 M8 2v4 M3 10h18',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    dollar: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 6l-10 7L2 6',
    settings: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
    bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    comment: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
    share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8.59 13.51l6.83 3.98 M15.41 6.51l-6.82 3.98',
    bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
    userplus: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M20 8v6 M23 11h-6',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
    trend: 'M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6',
    up: 'M12 19V5 M5 12l7-7 7 7',
    down: 'M12 5v14 M19 12l-7 7-7-7',
    menu: 'M3 12h18 M3 6h18 M3 18h18',
    plus: 'M12 5v14 M5 12h14',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
    copy: 'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    send: 'M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z',
    image: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21',
    refresh: 'M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
    x: 'M18 6L6 18 M6 6l12 12',
    chev: 'M9 18l6-6-6-6',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    trash: 'M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    play: 'M5 3l14 9-14 9V3z',
    edit: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
    bars: 'M12 20V10 M18 20V4 M6 20v-4',
    lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4',
    globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
    phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
    filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    dots: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    gift: 'M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z'
  };
  function ico(n, s = 18, cls = '') {
    return `<svg class="ico ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(P[n] || '').split(' M').map((d, i) => `<path d="${i ? 'M' : ''}${d}"/>`).join('')}</svg>`;
  }

  /* ---------- platforms ---------- */
  const PLAT = {
    tiktok: { name: 'TikTok', color: '#25f4ee', bg: 'linear-gradient(135deg,#111,#2a2a2a)' },
    instagram: { name: 'Instagram', color: '#f472b6', bg: 'linear-gradient(135deg,#f58529,#dd2a7b 50%,#8134af)' },
    facebook: { name: 'Facebook', color: '#4f8dff', bg: 'linear-gradient(135deg,#1877f2,#0d5bd1)' },
    youtube: { name: 'YouTube Shorts', color: '#ff4d4d', bg: 'linear-gradient(135deg,#ff2b2b,#c4001d)' }
  };
  const PKEYS = Object.keys(PLAT);
  function platIcon(p, s = 32) {
    const g = {
      tiktok: '<path d="M16 3v10.5a4.5 4.5 0 1 1-4.5-4.5 M16 3c.3 2.4 2 4 4.5 4.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
      instagram: '<rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="#fff" stroke-width="2"/><circle cx="17" cy="7" r="1.1" fill="#fff"/>',
      facebook: '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H6v4h3v8h4v-8h3l1-4h-4V6.5c0-.3.2-.5.5-.5H16z" fill="#fff"/>',
      youtube: '<rect x="3" y="6" width="18" height="12" rx="4" fill="none" stroke="#fff" stroke-width="2"/><path d="M10.5 9.5v5l4.2-2.5z" fill="#fff"/>'
    }[p];
    return `<span class="pico" style="width:${s}px;height:${s}px;background:${PLAT[p].bg}" title="${PLAT[p].name}"><svg width="${s * .62}" height="${s * .62}" viewBox="0 0 24 24">${g}</svg></span>`;
  }

  /* ---------- logos ---------- */
  function ermLogo(s = 36) {
    return `<svg width="${s}" height="${s}" viewBox="0 0 48 48" aria-label="ERM Marketing"><defs><linearGradient id="ermg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect width="48" height="48" rx="14" fill="url(#ermg)"/><path d="M15 14h18v4.2H19.4v4.1H31v4.1H19.4v4.4H33V35H15z" fill="#fff"/><path d="M33 12l4 4-4 4" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(-1 -1)"/></svg>`;
  }
  function clientLogo(c, s = 44) {
    if (c.logoUrl) return `<img class="clogo" src="${esc(c.logoUrl)}" width="${s}" height="${s}" alt="${esc(c.name)}" style="border-radius:${s * .3}px;object-fit:cover">`;
    return `<span class="clogo" style="width:${s}px;height:${s}px;border-radius:${s * .3}px;font-size:${s * .38}px;background:linear-gradient(135deg,${c.color},${c.color2})">${esc(initials(c.name))}</span>`;
  }

  /* ---------- animated counters ---------- */
  function animateCount(el, to, opts = {}) {
    const from = +el.dataset.val || 0; const fmt = opts.fmt || fmtFull; const dur = opts.dur || 1100;
    el.dataset.val = to;
    if (from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    cancelAnimationFrame(el._raf);
    const step = t => {
      const k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) el._raf = requestAnimationFrame(step); else el.textContent = fmt(to);
    };
    el._raf = requestAnimationFrame(step);
  }
  function runCounters(root = document) {
    $$('[data-count]', root).forEach(el => {
      const mode = el.dataset.fmt;
      const fmt = mode === 'k' ? fmtN : mode === 'pct' ? (n => n.toFixed(1) + '%') : mode === 'hrs' ? fmtHours : mode === 'full' ? fmtFull : mode === 'money' ? (n => money(n, el.dataset.cur)) : fmtFull;
      animateCount(el, parseFloat(el.dataset.count), { fmt });
    });
  }

  /* ---------- charts (pure SVG) ---------- */
  function smoothPath(pts) {
    if (pts.length < 2) return '';
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }
  let gid = 0;
  /* series: [{name,color,data:[],dashed?,area?}]  labels: [] */
  function lineChart({ series, labels, height = 280, light = false, area = true, yFmt = fmtN, tipFmt = fmtFull, id }) {
    const W = 760, H = height, L = 46, R = 14, T = 14, B = 28;
    const iw = W - L - R, ih = H - T - B; const n = labels.length;
    const max = Math.max(1, ...series.flatMap(s => s.data)) * 1.1;
    const X = i => L + (n === 1 ? iw / 2 : i * iw / (n - 1)), Y = v => T + ih - (v / max) * ih;
    const grid = light ? '#e5e7f0' : 'rgba(255,255,255,.07)', txt = light ? '#6b7090' : '#8b90b0';
    const uid_ = 'g' + (++gid);
    let o = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img"><defs>`;
    series.forEach((s, k) => { o += `<linearGradient id="${uid_}a${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity="${light ? .25 : .38}"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`; });
    o += `<linearGradient id="${uid_}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>`;
    for (let g = 0; g <= 4; g++) {
      const y = T + ih * g / 4; o += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${grid}" stroke-dasharray="${g ? '3 5' : ''}"/><text x="${L - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="${txt}">${yFmt(max * (1 - g / 4))}</text>`;
    }
    const step = Math.max(1, Math.ceil(n / 7));
    labels.forEach((l, i) => { if (i % step === 0 || i === n - 1) o += `<text x="${X(i)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}" font-size="11" fill="${txt}">${esc(l)}</text>`; });
    series.forEach((s, k) => {
      const pts = s.data.map((v, i) => [X(i), Y(v)]);
      if (n === 1) { o += `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="5" fill="${s.color}"/>`; return; }
      const d = smoothPath(pts);
      if (area && s.area !== false && !s.dashed) o += `<path class="area" d="${d} L${X(n - 1)},${T + ih} L${X(0)},${T + ih}Z" fill="url(#${uid_}a${k})"/>`;
      const stroke = (series.length === 1 && !light) ? `url(#${uid_}s)` : s.color;
      o += s.dashed ? `<path class="dash" d="${d}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-dasharray="6 6" opacity=".6"/>` : `<path class="line" pathLength="1" d="${d}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>`;
    });
    // hover columns
    if (!light) {
      const cw = n === 1 ? iw : iw / (n - 1);
      for (let i = 0; i < n; i++) {
        const tip = `<b>${esc(labels[i])}</b>` + series.map(s => `<div><i style="background:${s.color}"></i>${esc(s.name)} <b>${tipFmt(s.data[i])}</b></div>`).join('');
        o += `<rect class="hit" x="${X(i) - cw / 2}" y="${T}" width="${cw}" height="${ih}" fill="transparent" data-tip="${esc(tip)}" data-x="${X(i)}"/>`;
      }
      o += `<line class="cursor" x1="0" x2="0" y1="${T}" y2="${T + ih}" stroke="rgba(255,255,255,.3)" stroke-dasharray="3 4" style="display:none"/>`;
    }
    return o + '</svg>';
  }

  function sparkline(data, color = '#fff', w = 120, h = 36) {
    if (data.length < 2) return '';
    const mx = Math.max(...data), mn = Math.min(...data), r = mx - mn || 1;
    const pts = data.map((v, i) => [i * w / (data.length - 1), h - 3 - (v - mn) / r * (h - 6)]);
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path class="line" pathLength="1" d="${smoothPath(pts)}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`;
  }

  function donut({ parts, size = 190, thick = 26, center = '', light = false }) {
    const r = (size - thick) / 2, c = 2 * Math.PI * r, tot = parts.reduce((a, p) => a + p.value, 0) || 1;
    let off = 0; const track = light ? '#eceef7' : 'rgba(255,255,255,.07)';
    let o = `<svg class="donut" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${thick}"/>`;
    parts.forEach(p => {
      const len = p.value / tot * c, gap = parts.length > 1 ? 3 : 0;
      const tip = `<b>${esc(p.name)}</b><div>${fmtFull(p.value)} · ${(p.value / tot * 100).toFixed(1)}%</div>`;
      o += `<circle class="seg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${thick}" stroke-dasharray="${Math.max(0, len - gap)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})" ${light ? '' : `data-tip="${esc(tip)}"`}/>`;
      off += len;
    });
    return o + `</svg><div class="donut-c">${center}</div>`;
  }

  function barChart({ items, height = 200, light = false, fmt = fmtN, color = '#6d7cff' }) {
    const W = 520, H = height, L = 8, B = 26, T = 20; const mx = Math.max(1, ...items.map(i => i.value)) * 1.08;
    const bw = (W - L * 2) / items.length; const txt = light ? '#6b7090' : '#8b90b0';
    let o = `<svg class="chart" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="bg${++gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a855f7"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs>`;
    items.forEach((it, i) => {
      const h = (it.value / mx) * (H - B - T), x = L + i * bw + bw * .18, w = bw * .64, y = H - B - h;
      const fill = it.color || (light ? color : `url(#bg${gid})`);
      o += `<rect class="bchart" x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${fill}" style="animation-delay:${i * 60}ms" ${light ? '' : `data-tip="${esc(`<b>${esc(it.label)}</b><div>${fmt(it.value)}</div>`)}"`}/>`;
      o += `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="${txt}">${esc(it.label)}</text>`;
      o += `<text x="${x + w / 2}" y="${y - 6}" text-anchor="middle" font-size="11" font-weight="600" fill="${light ? '#2a2d4a' : '#dfe2ff'}">${fmt(it.value)}</text>`;
    });
    return o + '</svg>';
  }

  /* heatmap: grid[day][slot] values */
  function heatmap(grid, days, slots, light = false) {
    const mx = Math.max(1, ...grid.flat());
    let o = `<div class="heat" style="grid-template-columns:44px repeat(${slots.length},1fr)"><span></span>${slots.map(s => `<em>${s}</em>`).join('')}`;
    grid.forEach((row, di) => {
      o += `<em class="rl">${days[di]}</em>`;
      row.forEach((v, si) => {
        const k = v / mx; const a = 0.08 + k * .92;
        const tip = `<b>${days[di]} · ${slots[si]}</b><div>Avg ${fmtN(v)} views / post</div>`;
        o += `<span class="hc ${k > .82 ? 'top' : ''}" style="background:rgba(${light ? '90,80,240' : '124,92,255'},${a.toFixed(2)})" ${light ? '' : `data-tip="${esc(tip)}"`}></span>`;
      });
    });
    return o + '</div>';
  }

  /* tooltip delegation */
  let tipEl;
  document.addEventListener('mousemove', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.id = 'tip'; document.body.appendChild(tipEl); }
    if (!t) { tipEl.style.opacity = 0; $$('.cursor').forEach(c => c.style.display = 'none'); return; }
    tipEl.innerHTML = t.dataset.tip; tipEl.style.opacity = 1;
    const tw = tipEl.offsetWidth; let x = e.clientX + 14; if (x + tw > innerWidth - 8) x = e.clientX - tw - 14;
    tipEl.style.left = x + 'px'; tipEl.style.top = (e.clientY + 14) + 'px';
    if (t.dataset.x) { const cur = t.closest('svg').querySelector('.cursor'); if (cur) { cur.setAttribute('x1', t.dataset.x); cur.setAttribute('x2', t.dataset.x); cur.style.display = ''; } }
  });
  document.addEventListener('mouseleave', () => { if (tipEl) tipEl.style.opacity = 0; });

  /* ---------- modal / toast ---------- */
  function modal({ title, body, wide = false, foot = '', onMount, cls = '' }) {
    const root = document.createElement('div'); root.className = 'modal-wrap';
    root.innerHTML = `<div class="modal glass ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true"><header><h3>${title}</h3><button class="icon-btn" data-x aria-label="Close">${ico('x')}</button></header><div class="mbody">${body}</div>${foot ? `<footer>${foot}</footer>` : ''}</div>`;
    document.body.appendChild(root); document.body.classList.add('noscroll');
    requestAnimationFrame(() => root.classList.add('in'));
    const close = () => { root.classList.remove('in'); document.body.classList.remove('noscroll'); setTimeout(() => root.remove(), 200); document.removeEventListener('keydown', esc_); };
    const esc_ = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc_);
    root.addEventListener('mousedown', e => { if (e.target === root) close(); });
    $('[data-x]', root).onclick = close;
    root.close = close;
    onMount && onMount(root, close);
    return root;
  }
  function toast(msg, kind = 'ok') {
    let c = $('#toasts'); if (!c) { c = document.createElement('div'); c.id = 'toasts'; document.body.appendChild(c); }
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = (kind === 'ok' ? ico('check', 16) : ico('bell', 16)) + `<span>${esc(msg)}</span>`;
    c.appendChild(t); requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 3200);
  }
  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); } catch (e) {
      const a = document.createElement('textarea'); a.value = txt; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove();
    }
    toast('Copied to clipboard');
  }
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

  w.U = { $, $$, esc, clamp, fmtN, fmtFull, fmtPct, money, fmtHours, iso, parse, addDays, diffDays, fmtDate, fmtDateY, todayISO, uid, initials, ago, ico, PLAT, PKEYS, platIcon, ermLogo, clientLogo, animateCount, runCounters, lineChart, sparkline, donut, barChart, heatmap, modal, toast, copyText, download, MON };
})(window);
