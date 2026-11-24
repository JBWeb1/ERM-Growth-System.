/* ERM-Growth System — deeper view tracking: audience, post drill-down, live pulse, milestones, CSV, admin analytics, link tracker.
 * Phase 1: deterministic SAMPLE data derived from each client. Phase 2: replace the generators with real API snapshots
 * (see docs/INTEGRATIONS.md for which fields each platform actually exposes). */
(function (w) {
  const { $, $$, esc, fmtN, fmtFull, ico, PLAT, PKEYS, platIcon, clientLogo, modal, toast, copyText, addDays, todayISO, fmtDate, fmtDateY, uid, ago, download } = U;
  const TODAY = todayISO();
  const hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const norm = a => { const t = a.reduce((x, y) => x + y, 0) || 1; return a.map(v => v / t * 100); };
  const DB = () => Store.db;

  /* ---------- audience (sample) ---------- */
  const AGES = ['13–17', '18–24', '25–34', '35–44', '45–54', '55+'];
  const AGE_BASE = { Dental: [2, 14, 30, 26, 18, 10], Café: [4, 30, 34, 18, 9, 5], Gym: [5, 34, 34, 16, 8, 3], Hospitality: [1, 12, 28, 28, 20, 11], Education: [10, 38, 22, 14, 10, 6] };
  const COUNTRIES = { US: [['United States', 74], ['Canada', 6], ['United Kingdom', 5], ['Australia', 3], ['Mexico', 3], ['Other', 9]], ZA: [['South Africa', 79], ['Namibia', 4], ['Botswana', 3], ['United Kingdom', 4], ['United States', 4], ['Other', 6]] };
  const CITIES = { US: ['Los Angeles', 'New York', 'Chicago', 'Houston', 'San Francisco', 'Dallas'], ZA: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Gqeberha', 'Bloemfontein'] };
  const SRC = ['Recommended feed', 'Followers & home', 'Profile visits', 'Search & hashtags', 'Shares & DMs', 'Other'];
  const SRC_W = { tiktok: [71, 9, 6, 8, 3, 3], instagram: [38, 26, 12, 12, 8, 4], facebook: [30, 38, 6, 6, 16, 4], youtube: [58, 14, 4, 12, 3, 9] };

  function audienceFor(c, p) {
    const r = rng(hash(c.id + p)); const key = Object.keys(AGE_BASE).find(k => c.industry.includes(k)) || 'Dental';
    const ages = norm((AGE_BASE[key] || AGE_BASE.Dental).map(v => v * (.8 + r() * .4)));
    const f = 44 + r() * 22; const o = 1 + r() * 1.5;
    const countries = norm(COUNTRIES[c.country].map(([, v]) => v * (.85 + r() * .3))).map((v, i) => [COUNTRIES[c.country][i][0], v]);
    const cities = norm(CITIES[c.country].map((_, i) => (6 - i) * (.7 + r() * .6))).map((v, i) => [CITIES[c.country][i], v * .62]);
    return { ages, gender: { f: f * (100 - o) / 100, m: (100 - f) * (100 - o) / 100, o }, countries, cities };
  }
  /** audience blended across the selected platforms, weighted by their views */
  function audience(c, q, plats) {
    const ws = plats.map(p => Math.max(1, q.byPlatform[p] ? q.byPlatform[p].views : 1)), tot = ws.reduce((a, b) => a + b, 0);
    const parts = plats.map(p => audienceFor(c, p)); const blend = fn => parts.reduce((acc, a, i) => { const v = fn(a); return acc.map((x, k) => x + v[k] * ws[i] / tot); }, new Array(fn(parts[0]).length).fill(0));
    const ages = blend(a => a.ages), gender = blend(a => [a.gender.f, a.gender.m, a.gender.o]);
    const countries = parts[0].countries.map(([n], i) => [n, parts.reduce((s, a, k) => s + a.countries[i][1] * ws[k] / tot, 0)]);
    const cities = parts[0].cities.map(([n], i) => [n, parts.reduce((s, a, k) => s + a.cities[i][1] * ws[k] / tot, 0)]);
    const sources = SRC.map((n, i) => [n, plats.reduce((s, p, k) => s + norm(SRC_W[p])[i] * ws[k] / tot, 0)]);
    return { ages, gender: { f: gender[0], m: gender[1], o: gender[2] }, countries, cities, sources };
  }

  /* ---------- per-post analytics (sample) ---------- */
  function retention(post) {
    const r = rng(hash(post.id + 'ret')), hook = .6 + r() * .26, decay = .86 + r() * .07, len = [15, 22, 28, 35, 45][Math.floor(r() * 5)];
    const pts = [100]; for (let i = 1; i <= 10; i++) pts.push(hook * 100 * Math.pow(decay, i - 1));
    const avg = pts.reduce((a, b) => a + b, 0) / pts.length; return { pts, avg, len, hook: hook * 100 };
  }
  function velocity(post) {
    const r = rng(hash(post.id + 'vel')), tau = 5 + r() * 9, pts = []; for (let h = 0; h <= 48; h += 3) pts.push(post.views * (1 - Math.exp(-h / tau)));
    return { pts, labels: pts.map((_, i) => i * 3 + 'h'), first24: pts[8] / post.views * 100 };
  }
  const medianViews = cid => { const v = Metrics.posts(cid).map(p => p.views).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 1; };

  /* ---------- followers / milestones ---------- */
  function followers(c, q, plats) {
    const all = Metrics.query(c.id, { from: addDays(TODAY, -269), to: TODAY, platforms: plats }).daily;
    const base = Math.round(5200 * c.scale * plats.length); const cum = []; let run = base; all.forEach(d => { run += d.followers; cum.push(run); });
    const i0 = all.findIndex(d => d.d === q.from), i1 = all.findIndex(d => d.d === q.to);
    const slice = cum.slice(Math.max(0, i0), i1 + 1), start = cum[Math.max(0, i0) - 1] || base;
    return { data: slice, labels: all.slice(Math.max(0, i0), i1 + 1).map(d => fmtDate(d.d)), total: cum[cum.length - 1], gained: (slice[slice.length - 1] || start) - start, pct: ((slice[slice.length - 1] || start) - start) / start * 100 };
  }
  function milestones(cid) {
    const out = [], all = Metrics.query(cid, { from: addDays(TODAY, -269), to: TODAY }).daily; let run = 0, best = { v: 0 };
    const TH = [100e3, 250e3, 500e3, 1e6, 2.5e6, 5e6, 10e6], hit = new Set();
    all.forEach(d => { run += d.views; TH.forEach(t => { if (run >= t && !hit.has(t)) { hit.add(t); out.push({ icon: 'star', text: `Crossed ${fmtN(t)} total views`, date: d.d, kind: 'milestone' }); } }); if (d.views > best.v) best = { v: d.views, d: d.d }; });
    out.push({ icon: 'trend', text: `Best day ever: ${fmtN(best.v)} views`, date: best.d, kind: 'record' });
    const med = medianViews(cid); Metrics.posts(cid).filter(p => p.views > med * 3.2).slice(0, 3).forEach(p => out.push({ icon: 'zap', text: `Viral: “${p.title}” on ${PLAT[p.platform].name} is ${(p.views / med).toFixed(1)}× your typical post`, date: p.date, kind: 'viral' }));
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }

  /* ---------- live pulse (sample: views per 10 s) ---------- */
  function pulse(c, plats) {
    const week = Metrics.query(c.id, { from: addDays(TODAY, -7), to: addDays(TODAY, -1), platforms: plats }).totals.views / 7;
    const h = new Date().getHours(), diur = .55 + .9 * Math.pow(Math.sin((h - 5) / 19 * Math.PI), 2), rate = week / 8640 * diur;
    const nb = Math.floor(Date.now() / 10000), cities = CITIES[c.country], conn = plats.length ? plats : Metrics.connected(c.id);
    const bucket = b => Math.round(rate * (.55 + rng(hash(c.id + b))() * .9));
    const data = []; for (let i = 29; i >= 0; i--) data.push(bucket(nb - i));
    let hour = 0; for (let i = 0; i < 360; i++) hour += bucket(nb - i);
    const feed = []; for (let i = 0; i < 4; i++) { const b = nb - i * 2, r = rng(hash(c.id + 'f' + b)); feed.push({ n: Math.max(1, bucket(b)), city: cities[Math.floor(r() * 4)], p: conn[Math.floor(r() * conn.length)], t: i * 20 }); }
    return { data, hour, feed, now: data[data.length - 1] };
  }
  function pulseCard(c, plats) {
    const p = pulse(c, plats);
    return `<div class="glass card pulse" id="pulse"><div class="card-h"><h3><span class="live"><i></i>Live pulse</span></h3><small class="muted">views per 10 s · last 5 min · sample data</small></div>
    <div class="pulse-g"><div><div class="pulse-n"><span id="pu-hour">${fmtFull(p.hour)}</span></div><div class="muted sm">views in the last hour</div><div class="pulse-s" id="pu-chart">${U.lineChart({ series: [{ name: 'Views / 10 s', color: 'var(--c1)', data: p.data }], labels: p.data.map((_, i) => (i === 0 ? '−5m' : i === 29 ? 'now' : '')), height: 130, tipFmt: fmtFull }).replace('class="chart"', 'class="chart noanim"')}</div></div>
    <div class="feed" id="pu-feed">${feedHTML(p)}</div></div></div>`;
  }
  const feedHTML = p => p.feed.map(f => `<div class="feed-i">${platIcon(f.p, 22)}<span><b>+${f.n}</b> views from ${esc(f.city)}</span><small class="muted">${f.t ? f.t + 's ago' : 'just now'}</small></div>`).join('');
  function refreshPulse(main, c, plats) {
    const el = $('#pulse', main); if (!el) return; const p = pulse(c, plats);
    U.animateCount($('#pu-hour', main), p.hour, { dur: 600 });
    $('#pu-chart', main).innerHTML = U.lineChart({ series: [{ name: 'Views / 10 s', color: 'var(--c1)', data: p.data }], labels: p.data.map((_, i) => (i === 0 ? '−5m' : i === 29 ? 'now' : '')), height: 130, tipFmt: fmtFull }).replace('class="chart"', 'class="chart noanim"');
    $('#pu-feed', main).innerHTML = feedHTML(p);
  }
  function milestoneStrip(c) {
    const m = milestones(c.id).slice(0, 3); if (!m.length) return '';
    return `<div class="ms-strip">${m.map(x => `<div class="glass ms ${x.kind}"><span class="ti">${ico(x.icon, 16)}</span><div><b>${esc(x.text)}</b><small class="muted">${fmtDateY(x.date)}</small></div></div>`).join('')}</div>`;
  }

  /* ---------- Audience tab body ---------- */
  function hbars(rows, fmt = v => v.toFixed(0) + '%') { const mx = Math.max(...rows.map(r => r[1])) || 1; return `<div class="hb-list">${rows.map(([n, v]) => `<div class="hb"><span>${esc(n)}</span><div class="bar sm"><i style="width:${v / mx * 100}%"></i></div><b>${fmt(v)}</b></div>`).join('')}</div>`; }
  function audienceBody(c, q, plats) {
    const a = audience(c, q, plats), fl = followers(c, q, plats), T = q.totals;
    const posts = Metrics.posts(c.id, { from: q.from, to: q.to, platforms: plats });
    const table = plats.map(p => { const t = q.byPlatform[p], pp = posts.filter(x => x.platform === p); const g = q.pgrowth(p, 'views');
      return `<tr><td><span class="inl">${platIcon(p, 24)} ${PLAT[p].name}</span></td><td><b>${fmtN(t.views)}</b></td><td>${(t.views / (T.views || 1) * 100).toFixed(0)}%</td><td>${t.engagement.toFixed(1)}%</td><td>+${fmtFull(t.followers)}</td><td>${pp.length ? fmtN(pp.reduce((s, x) => s + x.views, 0) / pp.length) : '—'}</td><td class="${g >= 0 ? 'up' : 'dn'}">${g >= 0 ? '▲' : '▼'} ${Math.abs(g).toFixed(1)}%</td></tr>`; }).join('');
    const notes = { tiktok: 'Audience & traffic-source data needs TikTok Business/Studio access; the public API only gives per-video counts.', instagram: 'Age, gender, country & city need ≥100 followers; Meta provides them for Business/Creator accounts.', facebook: 'Page insights give country/city/age/gender fans and views by source.', youtube: 'YouTube Analytics API provides age, gender, country and traffic sources.' };
    return `<div class="grid tiles4"><div class="glass tile"><div class="tile-h"><span class="ti">${ico('users', 16)}</span>Total followers</div><div class="tile-v"><span class="count" data-count="${fl.total}" data-fmt="k">0</span></div><div class="muted sm">across selected platforms</div></div>
      <div class="glass tile"><div class="tile-h"><span class="ti">${ico('userplus', 16)}</span>Gained in range</div><div class="tile-v">+<span class="count" data-count="${fl.gained}" data-fmt="full">0</span></div><div class="muted sm">${fl.pct.toFixed(2)}% growth</div></div>
      <div class="glass tile"><div class="tile-h"><span class="ti">${ico('zap', 16)}</span>Views per follower</div><div class="tile-v">${(T.views / (fl.total || 1)).toFixed(2)}</div><div class="muted sm">reach beyond your followers</div></div>
      <div class="glass tile"><div class="tile-h"><span class="ti">${ico('clock', 16)}</span>Avg watch time / view</div><div class="tile-v">${T.views ? (T.watch * 3600 / T.views).toFixed(1) : 0}s</div><div class="muted sm">from ${fmtN(T.views)} views</div></div></div>
    <div class="grid charts"><div class="glass card span2"><div class="card-h"><h3>Follower growth</h3></div><div class="chart-wrap">${U.lineChart({ series: [{ name: 'Followers', color: 'var(--c1)', data: fl.data }], labels: fl.labels, height: 250, yMin: Math.floor(Math.min(...fl.data) * .995) })}</div></div>
      <div class="glass card"><div class="card-h"><h3>Gender</h3></div><div class="donut-wrap">${U.donut({ parts: [{ name: 'Women', value: a.gender.f, color: '#f472b6' }, { name: 'Men', value: a.gender.m, color: '#4f8dff' }, { name: 'Other', value: a.gender.o, color: '#94a3b8' }], size: 170, center: `<b>${a.gender.f.toFixed(0)}%</b><small>women</small>` })}</div><div class="legend"><div><i style="background:#f472b6"></i>Women<b>${a.gender.f.toFixed(0)}%</b></div><div><i style="background:#4f8dff"></i>Men<b>${a.gender.m.toFixed(0)}%</b></div><div><i style="background:#94a3b8"></i>Other<b>${a.gender.o.toFixed(1)}%</b></div></div></div>
      <div class="glass card"><div class="card-h"><h3>Age groups</h3></div>${U.barChart({ items: AGES.map((l, i) => ({ label: l, value: a.ages[i] })), height: 210, fmt: v => v.toFixed(0) + '%' })}</div>
      <div class="glass card"><div class="card-h"><h3>Top countries</h3></div>${hbars(a.countries)}</div>
      <div class="glass card"><div class="card-h"><h3>Top cities</h3></div>${hbars(a.cities)}</div>
      <div class="glass card span3"><div class="card-h"><h3>Where views come from</h3><small class="muted">share of views by discovery source</small></div><div class="stackbar">${a.sources.map(([n, v], i) => `<i style="width:${v}%;opacity:${1 - i * .13}" data-tip="${esc(`<b>${n}</b><div>${v.toFixed(1)}% of views</div>`)}"></i>`).join('')}</div><div class="legend src-l">${a.sources.map(([n, v], i) => `<div><i style="background:var(--a1);opacity:${1 - i * .13}"></i>${n}<b>${v.toFixed(0)}%</b></div>`).join('')}</div>
        <p class="hint">A high “Recommended feed” share means the algorithm is pushing you to new people; a high “Followers” share means you're reaching mainly existing fans.</p></div>
      <div class="glass card span3 tbl-wrap"><div class="card-h"><h3>Platform comparison</h3></div><table class="tbl"><tr><th>Platform</th><th>Views</th><th>Share</th><th>Engagement</th><th>Followers</th><th>Avg views / post</th><th>Growth</th></tr>${table}</table></div></div>
    <h2 class="sec">🎉 Milestones &amp; alerts</h2><div class="glass card">${milestones(c.id).slice(0, 8).map(x => `<div class="li"><div><b><span class="inl">${ico(x.icon, 15)} ${esc(x.text)}</span></b></div><span class="muted sm">${fmtDateY(x.date)}</span></div>`).join('')}</div>
    <h2 class="sec">What the platforms really let us see</h2><div class="grid cl-grid">${plats.map(p => `<div class="glass acct"><div class="acct-h">${platIcon(p, 34)}<b>${PLAT[p].name}</b></div><p class="muted sm">${notes[p]}</p></div>`).join('')}</div>
    <p class="hint">Sample data in Phase 1. Platforms never reveal <i>who</i> individual viewers are — only aggregate counts and audience breakdowns.</p>`;
  }

  /* ---------- post drill-down ---------- */
  function postModal(id, c) {
    const post = Metrics.posts(c.id).find(p => p.id === id); if (!post) return;
    const ret = retention(post), vel = velocity(post), med = medianViews(c.id), mult = post.views / med, a = audienceFor(c, post.platform), eng = (post.likes + post.comments + post.shares + post.saves) / post.views * 100;
    const srcW = norm(SRC_W[post.platform]);
    const body = `<div class="pm"><div class="pm-h"><div class="thumb sm" style="background:linear-gradient(135deg,hsl(${post.hue},75%,58%),hsl(${(post.hue + 55) % 360},70%,38%))"><span class="emoji">${post.emoji}</span></div>
      <div><span class="inl">${platIcon(post.platform, 26)} <b>${PLAT[post.platform].name}</b></span><h2>${esc(post.title)}</h2><p class="muted">Posted ${fmtDateY(post.date)} · ${String(post.hour).padStart(2, '0')}:00 · ${ret.len}s video</p>
      <span class="gchip ${mult >= 1 ? 'up' : 'dn'}">${ico(mult >= 1 ? 'up' : 'down', 12)}${mult.toFixed(1)}× your typical post</span></div></div>
      <div class="mini-kpis"><div><b>${fmtN(post.views)}</b><span>Views</span></div><div><b>${fmtN(post.likes)}</b><span>Likes</span></div><div><b>${fmtN(post.comments)}</b><span>Comments</span></div><div><b>${fmtN(post.shares)}</b><span>Shares</span></div><div><b>${fmtN(post.saves)}</b><span>Saves</span></div><div><b>${eng.toFixed(1)}%</b><span>Engagement</span></div></div>
      <div class="grid two"><div class="glass card"><div class="card-h"><h3>How views built up</h3><small class="muted">${vel.first24.toFixed(0)}% arrived in the first 24h</small></div>${U.lineChart({ series: [{ name: 'Cumulative views', color: 'var(--c1)', data: vel.pts }], labels: vel.labels, height: 200 })}</div>
      <div class="glass card"><div class="card-h"><h3>Audience retention</h3><small class="muted">avg ${ret.avg.toFixed(0)}% watched · ${(ret.len * ret.avg / 100).toFixed(1)}s of ${ret.len}s</small></div>${U.lineChart({ series: [{ name: 'Still watching', color: '#2fbf8f', data: ret.pts }], labels: ret.pts.map((_, i) => i * 10 + '%'), height: 200, yFmt: v => Math.round(v) + '%', tipFmt: v => v.toFixed(0) + '%' })}<p class="hint">${ret.hook >= 75 ? '✔ Strong hook — most viewers stay past the first seconds.' : '⚠ Hook drop-off — test a punchier first 2 seconds.'}</p></div></div>
      <div class="grid two"><div class="glass card"><div class="card-h"><h3>Top countries</h3></div>${hbars(a.countries.slice(0, 4))}</div><div class="glass card"><div class="card-h"><h3>Traffic sources</h3></div>${hbars(SRC.map((n, i) => [n, srcW[i]]).slice(0, 5))}</div></div></div>`;
    modal({ title: 'Post performance', body, wide: true, foot: `<button class="btn" id="pm-csv">${ico('download', 16)} Export CSV</button>`, onMount(root) { U.runCounters(root); $('#pm-csv', root).onclick = () => { download(`post-${post.id}.csv`, new Blob([['hour,cumulative_views'].concat(vel.pts.map((v, i) => `${i * 3},${Math.round(v)}`)).join('\n')], { type: 'text/csv' })); }; } });
  }

  /* ---------- CSV ---------- */
  function exportCSV(c, q, plats) {
    const rows = ['date,platform,views,likes,comments,shares,saves,followers_gained,watch_hours,reach'];
    plats.forEach(p => Metrics.query(c.id, { from: q.from, to: q.to, platforms: [p] }).daily.forEach(d => rows.push([d.d, p, Math.round(d.views), Math.round(d.likes), Math.round(d.comments), Math.round(d.shares), Math.round(d.saves), Math.round(d.followers), d.watch.toFixed(2), Math.round(d.reach)].join(','))));
    download(`${c.name.replace(/\W+/g, '-')}-metrics-${q.from}_${q.to}.csv`, new Blob([rows.join('\n')], { type: 'text/csv' })); toast('CSV downloaded');
  }

  /* ---------- portal activity (who looked at the dashboard) ---------- */
  function logView(cid) { const D = DB(); D.activity = D.activity || []; const last = D.activity.filter(a => a.cid === cid).pop(); if (!last || Date.now() - last.ts > 10 * 6e4) { D.activity.push({ cid, ts: Date.now() }); Store.save(); } }
  function activity(cid) {
    const r = rng(hash(cid + 'act')), sample = []; for (let d = 0; d < 30; d++) { const n = r() < .6 ? 1 + Math.floor(r() * 4) : 0; for (let k = 0; k < n; k++) sample.push(Date.now() - d * 864e5 - Math.floor(r() * 864e5) - 36e5); }
    const real = (DB().activity || []).filter(a => a.cid === cid).map(a => a.ts), all = sample.concat(real).sort((a, b) => b - a);
    return { count: all.length, last: all[0] };
  }

  /* ---------- link tracker (sample clicks; real redirects need the Phase 2 backend) ---------- */
  function links() {
    const D = DB(); if (!D.links) { D.links = [['Link in bio — TikTok', 'c1', 'https://brightsmile.demo/book', 'tt-bs'], ['Spring promo — Instagram story', 'c2', 'https://ctcoffee.demo/promo', 'ig-cc'], ['Free trial week', 'c3', 'https://atlasfit.demo/trial', 'atl-7d'], ['Safari package', 'c4', 'https://karoolodge.demo/stay', 'karoo']].map(([name, cid, url, code], i) => { const r = rng(hash(code)); return { id: 'lk' + i, name, cid, url, code, clicks: Array.from({ length: 30 }, () => Math.round(r() * 40 * (1 + i * .3) + 6)) }; }); Store.save(); }
    return D.links;
  }
  function linkForm() {
    const D = DB();
    modal({ title: 'New tracked link', body: `<form class="form" id="lkf"><label>Name<input name="name" required placeholder="Link in bio — Instagram"></label><label>Client<select name="cid">${D.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label>Destination URL<input name="url" type="url" required placeholder="https://client.com/offer"></label><label>Source (utm_source)<input name="src" value="instagram"></label><label>Campaign (utm_campaign)<input name="camp" value="spring-promo"></label><p class="hint">Phase 1 builds the UTM link and tracks demo clicks. In Phase 2 a redirect on your domain (e.g. go.ermmarketing.co/&lt;code&gt;) records each click; unique visitors need a consent-aware pixel (POPIA / GDPR).</p></form>`,
      foot: '<button class="btn primary" form="lkf">Create link</button>', onMount(root, close) { $('#lkf', root).onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); const u = new URL(d.url); u.searchParams.set('utm_source', d.src); u.searchParams.set('utm_medium', 'social'); u.searchParams.set('utm_campaign', d.camp); links().unshift({ id: uid('lk'), name: d.name, cid: d.cid, url: u.toString(), code: Math.random().toString(36).slice(2, 7), clicks: new Array(30).fill(0) }); Store.save(); toast('Tracked link created'); close(); document.dispatchEvent(new Event('erm:refresh')); }; } });
  }

  /* ---------- Admin analytics page ---------- */
  function analyticsHTML() {
    const D = DB(), from = addDays(TODAY, -29), rows = D.clients.map(c => ({ c, q: Metrics.query(c.id, { from, to: TODAY }), act: activity(c.id) })).sort((a, b) => b.q.totals.views - a.q.totals.views);
    const tot = rows.reduce((a, r) => a + r.q.totals.views, 0), ptot = rows.reduce((a, r) => a + r.q.prev.totals.views, 0), fol = rows.reduce((a, r) => a + r.q.totals.followers, 0), eng = rows.reduce((a, r) => a + r.q.totals.engagement, 0) / (rows.length || 1);
    const labels = rows[0].q.daily.map(d => fmtDate(d.d));
    const alerts = D.clients.flatMap(c => milestones(c.id).map(m => ({ ...m, c }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
    const top = D.clients.flatMap(c => Metrics.posts(c.id).map(p => ({ ...p, c }))).sort((a, b) => b.views - a.views).slice(0, 6);
    const G = ((tot - ptot) / (ptot || 1) * 100);
    return `<div class="page-h"><div><h1>Analytics</h1><p class="muted">Views and growth across every client · last 30 days</p></div></div>
    <div class="grid tiles4"><div class="glass tile"><div class="tile-h"><span class="ti">${ico('eye', 16)}</span>Total views</div><div class="tile-v"><span class="count" data-count="${tot}" data-fmt="k">0</span></div><span class="gchip ${G >= 0 ? 'up' : 'dn'}">${ico(G >= 0 ? 'up' : 'down', 12)}${Math.abs(G).toFixed(1)}%</span></div>
      <div class="glass tile"><div class="tile-h"><span class="ti">${ico('zap', 16)}</span>Avg engagement</div><div class="tile-v">${eng.toFixed(1)}%</div><div class="muted sm">across clients</div></div>
      <div class="glass tile"><div class="tile-h"><span class="ti">${ico('userplus', 16)}</span>Followers gained</div><div class="tile-v">+<span class="count" data-count="${fol}" data-fmt="full">0</span></div><div class="muted sm">all clients</div></div>
      <div class="glass tile"><div class="tile-h"><span class="ti">${ico('globe', 16)}</span>Portal visits</div><div class="tile-v">${rows.reduce((a, r) => a + r.act.count, 0)}</div><div class="muted sm">client dashboard sessions · 30d</div></div></div>
    <div class="grid charts"><div class="glass card span2"><div class="card-h"><h3>Views per client</h3></div><div class="chart-wrap">${U.lineChart({ series: rows.map(r => ({ name: r.c.name, color: r.c.color, data: r.q.daily.map(d => d.views) })), labels, height: 420, area: false })}</div></div>
      <div class="glass card"><div class="card-h"><h3>Alerts &amp; milestones</h3></div>${alerts.map(m => `<div class="li"><div><b><span class="inl">${ico(m.icon, 14)} ${esc(m.c.name)}</span></b><small class="muted">${esc(m.text)}</small></div><span class="muted sm">${fmtDate(m.date)}</span></div>`).join('')}</div></div>
    <h2 class="sec">Client leaderboard</h2><div class="glass tbl-wrap"><table class="tbl"><tr><th>Client</th><th>Views</th><th>Growth</th><th>Engagement</th><th>Followers</th><th>Trend</th><th>Last portal visit</th></tr>${rows.map(r => { const g = r.q.growth('views'); return `<tr><td><a href="#/admin/client/${r.c.id}/performance" class="inl">${clientLogo(r.c, 26)} <b>${esc(r.c.name)}</b></a></td><td><b>${fmtN(r.q.totals.views)}</b></td><td class="${g >= 0 ? 'up' : 'dn'}">${g >= 0 ? '▲' : '▼'} ${Math.abs(g).toFixed(1)}%</td><td>${r.q.totals.engagement.toFixed(1)}%</td><td>+${fmtFull(r.q.totals.followers)}</td><td>${U.sparkline(r.q.daily.map(d => d.views), 'var(--c1)', 90, 26)}</td><td>${r.act.last ? ago(r.act.last) : '—'} <small class="muted">· ${r.act.count} visits</small></td></tr>`; }).join('')}</table></div>
    <h2 class="sec">Top posts across all clients</h2><div class="grid cl-grid">${top.map(p => `<div class="glass li post-li"><div class="thumb xs" style="background:linear-gradient(135deg,hsl(${p.hue},75%,58%),hsl(${(p.hue + 55) % 360},70%,38%))">${p.emoji}</div><div><b>${esc(p.title)}</b><small class="muted">${esc(p.c.name)} · ${PLAT[p.platform].name}</small></div><b>${fmtN(p.views)}</b></div>`).join('')}</div>
    <h2 class="sec">Tracked links <button class="btn sm primary more-btn" id="new-link">${ico('plus', 14)} New link</button></h2><div class="glass tbl-wrap"><table class="tbl"><tr><th>Link</th><th>Client</th><th>Clicks · 30d</th><th>Trend</th><th></th></tr>${links().map(l => `<tr><td><b>${esc(l.name)}</b><small class="muted block">${esc(l.url)}</small></td><td>${esc(cName(l.cid))}</td><td><b>${fmtFull(l.clicks.reduce((a, b) => a + b, 0))}</b></td><td>${U.sparkline(l.clicks, 'var(--c1)', 90, 26)}</td><td class="ra"><button class="btn sm" data-copy="${esc(l.url)}">${ico('copy', 13)} Copy</button></td></tr>`).join('')}</table></div>
    <p class="hint">Click counts are sample data in Phase 1. Real click tracking needs the Phase 2 redirect service.</p>`;
  }
  const cName = id => (Store.client(id) || { name: '—' }).name;
  function bindAnalytics(main) {
    const nl = $('#new-link', main); if (nl) nl.onclick = linkForm;
    $$('[data-copy]', main).forEach(b => b.onclick = () => copyText(b.dataset.copy));
  }

  w.Insights = { activity, pulseCard, refreshPulse, milestoneStrip, audienceBody, postModal, exportCSV, logView, analyticsHTML, bindAnalytics, milestones };
})(window);
