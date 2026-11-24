/* ERM-Growth System — Studio: daily briefing · content studio & auto-planner · satisfaction pulse · revenue forecast · benchmarks · referrals.
 * Phase 1 uses rule/template logic. Phase 2 can plug the Claude API into generateIdeas() for fully custom copy. */
(function (w) {
  const { $, $$, esc, clamp, fmtN, fmtFull, money, ico, PLAT, PKEYS, platIcon, clientLogo, modal, toast, copyText, addDays, todayISO, fmtDate, fmtDateY, diffDays, uid, ago } = U;
  const TODAY = todayISO();
  const DB = () => Store.db;
  const refresh = () => document.dispatchEvent(new Event('erm:refresh'));
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* ======================= satisfaction pulse ======================= */
  function feedbackAll() {
    const D = DB(); if (!D.feedback) { D.feedback = [{ id: 'f1', cid: 'c1', score: 9, comment: 'Love the whitening reels!', ts: Date.now() - 864e5 * 9 }, { id: 'f2', cid: 'c2', score: 10, comment: 'Best agency we have worked with.', ts: Date.now() - 864e5 * 12 }, { id: 'f3', cid: 'c3', score: 8, comment: '', ts: Date.now() - 864e5 * 5 }, { id: 'f4', cid: 'c4', score: 6, comment: 'Approvals feel a bit rushed.', ts: Date.now() - 864e5 * 3 }]; Store.save(); }
    return D.feedback;
  }
  const feedbackFor = cid => feedbackAll().filter(f => f.cid === cid).sort((a, b) => b.ts - a.ts);
  function feedbackCard(c, ctx) {
    if (ctx.admin) return ''; const last = feedbackFor(c.id)[0];
    if (last && Date.now() - last.ts < 30 * 864e5) return '';
    return `<div class="glass card nps" id="nps"><div class="card-h"><h3>How are we doing? 💬</h3><small class="muted">Takes 5 seconds</small></div><p class="muted sm">How likely are you to recommend ERM Marketing to a friend or colleague?</p><div class="nps-row">${Array.from({ length: 11 }, (_, i) => `<button class="nps-b" data-nps="${i}">${i}</button>`).join('')}</div><div class="nps-ends"><small class="muted">Not likely</small><small class="muted">Very likely</small></div><div id="nps-more" hidden><textarea rows="2" placeholder="Anything we could do better? (optional)" id="nps-c"></textarea><button class="btn primary" id="nps-send">Send feedback</button></div></div>`;
  }

  /* ======================= referral ======================= */
  function referralCard(c) {
    const url = location.href.split('#')[0] + '#/lead-form?ref=' + c.id, n = DB().leads.filter(l => (l.source || '').includes('Referral: ' + c.name)).length, reward = DB().settings.referralReward || '1 free month of content';
    return `<div class="glass card refer"><div class="card-h"><h3>🎁 Refer a business, get rewarded</h3></div><p class="muted">Know a business owner who'd love results like yours? Share your personal link — when they sign up you get <b>${esc(reward)}</b>.</p><div class="row2"><input readonly value="${esc(url)}" id="ref-url"><button class="btn primary" id="ref-copy">${ico('copy', 16)} Copy link</button></div><small class="muted">${n ? `${n} referral${n > 1 ? 's' : ''} so far — thank you!` : 'No referrals yet'}</small></div>`;
  }
  function bindPortal(main, c, ctx, draw) {
    const rc = $('#ref-copy', main); if (rc) rc.onclick = () => copyText($('#ref-url', main).value);
    let score = null; $$('[data-nps]', main).forEach(b => b.onclick = () => { score = +b.dataset.nps; $$('[data-nps]', main).forEach(x => x.classList.toggle('on', x === b)); $('#nps-more', main).hidden = false; });
    const ns = $('#nps-send', main); if (ns) ns.onclick = () => { if (score === null) return; feedbackAll().unshift({ id: uid('f'), cid: c.id, score, comment: $('#nps-c', main).value.trim(), ts: Date.now() }); Store.log(c.id, `Satisfaction rating: ${score}/10`, 'star'); Store.notify(`${c.name} rated us ${score}/10${score <= 6 ? ' — follow up!' : ''}`, score <= 6 ? 'bell' : 'star'); Store.save(); $('#nps', main).innerHTML = `<div class="lf-ok"><div class="e-ico">${ico('check', 26)}</div><b>Thank you!</b><p class="muted">${score >= 9 ? 'We love hearing that 🙌' : 'We\'ll use your feedback to improve.'}</p></div>`; };
  }

  /* ======================= benchmarks ======================= */
  const IND_ENG = { Dental: 6.5, 'Café': 8.2, Gym: 8.8, Hospitality: 6.9, Education: 7.4, other: 7 };
  const indKey = c => Object.keys(IND_ENG).find(k => c.industry.includes(k)) || 'other';
  function meter(label, val, bench, avg, fmt, unit) {
    const mx = Math.max(val, bench, avg || 0) * 1.35 || 1, r = val / (bench || 1), v = r >= 1.1 ? ['Above industry', 'ok'] : r >= .9 ? ['On par', 'mid'] : ['Below industry', 'bad'];
    return `<div class="meter"><div class="meter-h"><b>${label}</b><span class="hp ${v[1]}"><i></i>${v[0]}</span></div><div class="meter-t"><i class="mv" style="width:${val / mx * 100}%"></i><em class="mk" style="left:${bench / mx * 100}%" title="Industry ${fmt(bench)}${unit}"></em>${avg ? `<em class="mk avg" style="left:${avg / mx * 100}%" title="Your ERM peers ${fmt(avg)}${unit}"></em>` : ''}</div><div class="meter-f"><span><b>${fmt(val)}${unit}</b> you</span><span class="muted">industry ${fmt(bench)}${unit}</span>${avg ? `<span class="muted">ERM clients ${fmt(avg)}${unit}</span>` : ''}</div></div>`;
  }
  function benchmarkCard(c, q) {
    const act = DB().clients.filter(x => x.status === 'Active' && x.id !== c.id), from = addDays(TODAY, -29), qs = act.map(x => Metrics.query(x.id, { from, to: TODAY }));
    const avgEng = qs.length ? qs.reduce((a, x) => a + x.totals.engagement, 0) / qs.length : 0, avgGr = qs.length ? qs.reduce((a, x) => a + x.growth('views'), 0) / qs.length : 0;
    const posts = Metrics.posts(c.id, { from, to: TODAY }).length / 4.3;
    return `<div class="glass card" style="margin-bottom:16px"><div class="card-h"><h3>How you compare</h3><small class="muted">industry: ${indKey(c) === 'other' ? 'general' : indKey(c)}</small></div><div class="grid meters">${meter('Engagement rate', q.totals.engagement, IND_ENG[indKey(c)], avgEng, v => v.toFixed(1), '%')}${meter('View growth', Math.max(0.1, q.growth('views')), 5, Math.max(0.1, avgGr), v => v.toFixed(1), '%')}${meter('Posts per week', posts, 4, 0, v => v.toFixed(1), '')}</div><p class="hint">Industry figures are sample averages in Phase 1. “ERM clients” is the live average across the other clients on this platform (anonymised).</p></div>`;
  }

  /* ======================= content studio ======================= */
  const IND = {
    Dental: { topics: ['teeth whitening', 'a child\'s first dental visit', 'invisible aligners', 'gum health', 'dental anxiety', 'smile makeovers'], benefit: 'a brighter, healthier smile', scenario: 'you finally book that check-up', tags: ['dentist', 'smile', 'oralhealth', 'dentaltok', 'teethwhitening'], cta: 'Book your visit — link in bio 🦷' },
    'Café': { topics: ['pour-over coffee', 'cold brew', 'latte art', 'our roasting process', 'rooibos drinks', 'weekend brunch'], benefit: 'the perfect cup', scenario: 'your Monday starts with great coffee', tags: ['coffee', 'capetown', 'barista', 'coffeetok', 'latteart'], cta: 'Tag a coffee lover ☕' },
    Gym: { topics: ['abs workouts', 'protein myths', 'leg-day form', 'beginner gym tips', 'fat loss', 'strength training'], benefit: 'real results', scenario: 'you finally stick to your workout plan', tags: ['fitness', 'gym', 'workout', 'fittok', 'strengthtraining'], cta: 'Save this for your next workout 💪' },
    Hospitality: { topics: ['our safari suite', 'sunrise game drives', 'Karoo sunsets', 'hidden gems nearby', 'honeymoon stays', 'the chef\'s table'], benefit: 'an unforgettable getaway', scenario: 'you wake up to this view', tags: ['travel', 'safari', 'southafrica', 'karoo', 'lodgelife'], cta: 'DM us to plan your stay 🌅' },
    Education: { topics: ['exam study tips', 'maths hacks', 'how to focus', 'homework routines', 'matric prep', 'learning styles'], benefit: 'better marks', scenario: 'maths finally clicks', tags: ['studytok', 'education', 'matric', 'tutoring', 'learning'], cta: 'Follow for daily study tips 📚' },
    other: { topics: ['our story', 'behind the scenes', 'customer favourites', 'how we work', 'top tips', 'your questions answered'], benefit: 'better results', scenario: 'you find the perfect solution', tags: ['smallbusiness', 'behindthescenes', 'tips'], cta: 'Follow for more ✨' }
  };
  const HOOKS = ['3 things nobody tells you about {t}', 'Stop doing this if you want {b}', 'POV: {s}', 'I tried {t} for 30 days — here\'s what happened', 'The #1 mistake people make with {t}', '{t}: myth vs reality', 'Watch how {n} does {t} in 30 seconds', 'Would you try this {t} trick?', 'Why customers keep coming back to {n}', 'Before vs after: {t}', 'Nobody talks about {t} — so let\'s', 'Save this if you care about {b}'];
  const FORMATS = ['Talking head to camera', 'Voice-over + b-roll', 'Text-on-screen with trending audio', 'Before / after reveal', 'Time-lapse process', 'Day in the life', 'Reaction / answer-a-comment', 'Quick 3-step tutorial'];
  const TONES = { Friendly: ['😊', 'Here\'s the simple version:'], Bold: ['🔥', 'Let\'s be real:'], Educational: ['📌', 'Quick breakdown:'], Luxury: ['✨', 'A closer look:'] };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  const S = { cid: null, platform: 'tiktok', tone: 'Friendly', topic: '' }; let ideas = [];
  const ind = c => IND[Object.keys(IND).find(k => c.industry.includes(k)) || 'other'];
  function bestSlots(cid) { const heat = Metrics.heat(cid), all = []; heat.forEach((row, d) => row.forEach((v, s) => all.push({ d, s, v }))); return all.sort((a, b) => b.v - a.v); }
  const slotLabel = x => `${DOW[x.d]} ~${String(x.s * 3 + 1).padStart(2, '0')}:00`;
  function generateIdeas(c, platform, tone, topic, n = 8) {
    const I = ind(c), top = Metrics.posts(c.id).sort((a, b) => b.views - a.views)[0], slots = bestSlots(c.id), T = TONES[tone], used = new Set(), out = [];
    const topics = shuffle(topic ? [topic, ...I.topics] : I.topics);
    for (let i = 0; i < n; i++) {
      const t = topics[i % topics.length], h = HOOKS.filter(x => !used.has(x))[0] || pick(HOOKS); used.add(h);
      let hook = h.replace('{t}', t).replace('{b}', I.benefit).replace('{s}', I.scenario).replace('{n}', c.name);
      if (tone === 'Bold') hook = hook.toUpperCase(); if (tone === 'Luxury') hook = hook.replace(/!/g, '');
      const fmt = FORMATS[(i * 3 + Math.floor(Math.random() * 3)) % FORMATS.length], tags = shuffle(I.tags).slice(0, 4).concat([platform === 'youtube' ? 'shorts' : platform === 'tiktok' ? 'fyp' : 'reels']).map(x => '#' + x);
      out.push({ hook, fmt, caption: `${hook} ${T[0]}\n\n${T[1]} ${t} is all about ${I.benefit}. We break it down in under 30 seconds.\n\n${I.cta}`, tags, platform, time: slotLabel(slots[i % 4]), len: [15, 20, 25, 30][i % 4] });
    }
    if (top) out[0].proven = `Based on your top post “${top.title}” (${fmtN(top.views)} views)`;
    return out;
  }
  function studioHTML() {
    const D = DB(); if (!S.cid || !Store.client(S.cid)) S.cid = D.clients[0].id; const c = Store.client(S.cid), conn = Metrics.connected(c.id); if (!conn.includes(S.platform)) S.platform = conn[0];
    if (!ideas.length || ideas[0].cid !== c.id) ideas = generateIdeas(c, S.platform, S.tone, S.topic).map(x => ({ ...x, cid: c.id }));
    return `<div class="page-h"><div><h1>Content <span class="grad">studio</span></h1><p class="muted">Hooks, captions and hashtags tailored to each client — and a ready-made 2-week plan.</p></div><div class="actions"><button class="btn primary" id="st-plan">${ico('calendar', 16)} Auto-plan 2 weeks</button></div></div>
    <div class="glass card studio-f"><label>Client<select id="st-c">${D.clients.map(x => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label><label>Platform<select id="st-p">${conn.map(p => `<option value="${p}" ${p === S.platform ? 'selected' : ''}>${PLAT[p].name}</option>`).join('')}</select></label><label>Tone<select id="st-t">${Object.keys(TONES).map(t => `<option ${t === S.tone ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label>Topic (optional)<input id="st-topic" value="${esc(S.topic)}" placeholder="e.g. summer promo"></label><button class="btn primary" id="st-gen">${ico('refresh', 16)} Generate ideas</button></div>
    <div class="grid cl-grid ideas">${ideas.map((x, i) => `<div class="glass idea"><div class="idea-h">${platIcon(x.platform, 28)}<span class="muted sm">${esc(x.fmt)} · ~${x.len}s</span></div><h3>${esc(x.hook)}</h3>${x.proven ? `<small class="proven">${ico('star', 12)} ${esc(x.proven)}</small>` : ''}<p class="muted pre">${esc(x.caption.split('\n\n').slice(1).join('\n\n'))}</p><div class="tagrow">${x.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div><div class="idea-f"><small class="muted">${ico('clock', 12)} Best slot: ${x.time}</small><div><button class="btn sm" data-ci="${i}">${ico('copy', 13)} Copy</button><button class="btn sm primary" data-ai="${i}">${ico('plus', 13)} Add to calendar</button></div></div></div>`).join('')}</div>
    <p class="hint">Phase 1 uses smart templates built from the client's industry, top posts and best posting times. Phase 2 can call the Claude API for fully custom copy in each client's brand voice.</p>`;
  }
  function nextFreeDate(cid) { let d = addDays(TODAY, 1); const taken = new Set(DB().content.filter(k => k.cid === cid).map(k => k.date)); while (taken.has(d)) d = addDays(d, 1); return d; }
  function buildPlan(c, platformsAll, tone) {
    const slots = bestSlots(c.id), bestPerDow = {}; slots.forEach(s => { if (!bestPerDow[s.d]) bestPerDow[s.d] = s; });
    const days = Array.from({ length: 14 }, (_, i) => addDays(TODAY, i + 1)), byWeek = [days.slice(0, 7), days.slice(7)];
    const chosen = byWeek.flatMap(wk => wk.map(d => ({ d, s: bestPerDow[U.parse(d).getDay()] })).sort((a, b) => b.s.v - a.s.v).slice(0, 5)).sort((a, b) => a.d.localeCompare(b.d));
    const list = shuffle(generateIdeas(c, platformsAll[0], tone, '', 10));
    return chosen.map((x, i) => { const idea = list[i % list.length], p = platformsAll[i % platformsAll.length]; return { cid: c.id, title: idea.hook.length > 70 ? idea.hook.slice(0, 67) + '…' : idea.hook, platform: p, date: x.d, status: 'planned', approval: '', comments: [], notes: `Post ~${String(x.s.s * 3 + 1).padStart(2, '0')}:00 · ${idea.fmt}\n\n${idea.caption}\n${idea.tags.join(' ')}` }; });
  }
  function bindAdmin(main) {
    const gen = () => { const c = Store.client(S.cid); ideas = generateIdeas(c, S.platform, S.tone, S.topic).map(x => ({ ...x, cid: c.id })); refresh(); };
    const sel = (id, k, regen) => { const e = $(id, main); if (e) e.onchange = () => { S[k] = e.value; if (k === 'cid') ideas = []; regen && gen(); if (k === 'cid') refresh(); }; };
    sel('#st-c', 'cid'); sel('#st-p', 'platform', 1); sel('#st-t', 'tone', 1);
    const tp = $('#st-topic', main); if (tp) tp.onchange = () => { S.topic = tp.value.trim(); gen(); };
    const g = $('#st-gen', main); if (g) g.onclick = () => { S.topic = $('#st-topic', main).value.trim(); gen(); };
    $$('[data-ci]', main).forEach(b => b.onclick = () => { const x = ideas[+b.dataset.ci]; copyText(`${x.caption}\n\n${x.tags.join(' ')}`); });
    $$('[data-ai]', main).forEach(b => b.onclick = () => { const x = ideas[+b.dataset.ai]; Store.add('content', { cid: x.cid, title: x.hook.length > 70 ? x.hook.slice(0, 67) + '…' : x.hook, platform: x.platform, date: nextFreeDate(x.cid), status: 'planned', approval: '', comments: [], notes: `Post ~${x.time} · ${x.fmt}\n\n${x.caption}\n${x.tags.join(' ')}` }); toast('Added to the content calendar'); b.disabled = true; b.textContent = 'Added ✓'; });
    const pl = $('#st-plan', main); if (pl) pl.onclick = () => { const c = Store.client(S.cid), conn = Metrics.connected(c.id), items = buildPlan(c, conn, S.tone);
      modal({ title: `2-week plan — ${esc(c.name)}`, wide: true, body: `<p class="muted">5 posts per week, placed on this client's strongest posting slots and rotated across ${conn.map(p => PLAT[p].name).join(', ')}.</p><div class="stack">${items.map(k => `<div class="glass li"><div style="display:flex;gap:12px;align-items:center">${platIcon(k.platform, 30)}<div><b>${esc(k.title)}</b><small class="muted">${DOW[U.parse(k.date).getDay()]} ${fmtDate(k.date)} · ${esc(k.notes.split('\n')[0])}</small></div></div></div>`).join('')}</div>`, foot: `<button class="btn primary" id="plan-add">${ico('calendar', 16)} Add all ${items.length} to calendar</button>`, onMount(root, close) { $('#plan-add', root).onclick = () => { items.forEach(k => Store.add('content', k)); Store.log(c.id, `Auto-planned ${items.length} posts`, 'calendar'); toast(`${items.length} posts added to the calendar`); close(); location.hash = '#/admin/tasks'; }; } }); };
  }

  /* ======================= revenue forecast ======================= */
  const STAGE_P = { New: .1, Contacted: .2, 'Proposal Sent': .4, Negotiation: .6 };
  function forecast() {
    const D = DB(), act = D.clients.filter(c => c.status === 'Active'), now = new Date();
    const rows = act.map(c => { const h = Growth.health(c.id), usd = Store.toUSD(c.retainer, c.currency), p = clamp(.55 + h.score / 100 * .43, .5, .98); return { c, h, usd, p, left: diffDays(TODAY, c.end) }; });
    const months = Array.from({ length: 6 }, (_, m) => { const end = U.iso(new Date(now.getFullYear(), now.getMonth() + m + 1, 0)); return { m, end, label: U.MON[new Date(now.getFullYear(), now.getMonth() + m, 1).getMonth()] }; });
    const open = D.leads.filter(l => STAGE_P[l.stage]), wp = open.reduce((a, l) => a + Store.toUSD(l.value, l.currency) * STAGE_P[l.stage], 0), allOpen = open.reduce((a, l) => a + Store.toUSD(l.value, l.currency), 0);
    const proj = months.map(x => ({ label: x.label, value: Math.round(rows.reduce((a, r) => a + (r.c.end > x.end ? r.usd : r.usd * r.p), 0) + (x.m >= 2 ? wp : 0)) }));
    const cons = months.map(x => Math.round(rows.reduce((a, r) => a + (r.c.end > x.end ? r.usd : 0), 0))), opt = months.map(x => Math.round(rows.reduce((a, r) => a + r.usd, 0) + (x.m >= 2 ? allOpen : 0)));
    const atRisk = rows.reduce((a, r) => a + (r.left <= 90 ? r.usd * (1 - r.p) : r.h.score < 50 ? r.usd * .25 : 0), 0), mrr = rows.reduce((a, r) => a + r.usd, 0);
    return { rows, proj, cons, opt, atRisk, mrr, wp, open, months };
  }
  function forecastHTML() {
    const F = forecast(), D = DB();
    return `<div class="page-h"><div><h1>Revenue <span class="grad">forecast</span></h1><p class="muted">Next 6 months · USD equivalent @ R${D.settings.zarRate}/$ · indicative, based on contracts, client health and your pipeline</p></div></div>
    <div class="grid tiles4"><div class="glass tile"><div class="tile-h"><span class="ti">${ico('dollar', 16)}</span>MRR today</div><div class="tile-v">${money(F.mrr)}</div><div class="muted sm">ARR ≈ ${money(F.mrr * 12)}</div></div><div class="glass tile"><div class="tile-h"><span class="ti">${ico('bell', 16)}</span>MRR at risk</div><div class="tile-v dn">${money(F.atRisk)}</div><div class="muted sm">${(F.atRisk / (F.mrr || 1) * 100).toFixed(0)}% of MRR</div></div><div class="glass tile"><div class="tile-h"><span class="ti">${ico('target', 16)}</span>Weighted pipeline</div><div class="tile-v">${money(F.wp)}</div><div class="muted sm">${F.open.length} open leads</div></div><div class="glass tile"><div class="tile-h"><span class="ti">${ico('trend', 16)}</span>Expected MRR · month 6</div><div class="tile-v">${money(F.proj[5].value)}</div><div class="muted sm">range ${money(F.cons[5])} – ${money(F.opt[5])}</div></div></div>
    <div class="grid charts"><div class="glass card span2"><div class="card-h"><h3>Expected MRR by month</h3><small class="muted">contracts × renewal probability + weighted pipeline</small></div><div class="chart-wrap">${U.barChart({ items: F.proj, height: 240, fmt: v => money(v) })}</div></div>
      <div class="glass card"><div class="card-h"><h3>Scenarios · month 6</h3></div><div class="legend"><div><i style="background:#ef6b7b"></i>Conservative (contracted only)<b>${money(F.cons[5])}</b></div><div><i style="background:var(--a1)"></i>Expected<b>${money(F.proj[5].value)}</b></div><div><i style="background:#2fbf8f"></i>Optimistic (win every lead)<b>${money(F.opt[5])}</b></div></div><p class="hint">Renewal probability rises with client health. Improve health scores to lift the expected line.</p></div></div>
    <h2 class="sec">By client</h2><div class="glass tbl-wrap"><table class="tbl"><tr><th>Client</th><th>MRR (USD)</th><th>Contract ends</th><th>Health</th><th>Renewal probability</th><th>Expected 12-mo value</th></tr>${F.rows.sort((a, b) => a.p - b.p).map(r => `<tr><td><a href="#/admin/client/${r.c.id}/health" class="inl">${clientLogo(r.c, 26)} <b>${esc(r.c.name)}</b></a></td><td>${money(r.usd)}</td><td>${fmtDate(r.c.end)} <small class="${r.left <= 60 ? 'dn' : 'muted'}">${r.left > 0 ? r.left + 'd' : 'expired'}</small></td><td><span class="hp ${r.h.cls}"><i></i>${r.h.score}</span></td><td><div class="bar sm ${r.p >= .8 ? '' : r.p >= .65 ? 'amber' : 'red'}"><i style="width:${r.p * 100}%"></i></div> ${(r.p * 100).toFixed(0)}%</td><td><b>${money(r.usd * 12 * (r.left > 365 ? 1 : (r.left > 0 ? r.left / 365 + (1 - r.left / 365) * r.p : r.p)))}</b></td></tr>`).join('')}</table></div>
    <h2 class="sec">Pipeline</h2><div class="glass tbl-wrap"><table class="tbl"><tr><th>Stage</th><th>Leads</th><th>Value (USD)</th><th>Win probability</th><th>Weighted</th></tr>${Object.entries(STAGE_P).map(([s, p]) => { const l = D.leads.filter(x => x.stage === s), v = l.reduce((a, x) => a + Store.toUSD(x.value, x.currency), 0); return `<tr><td><b>${s}</b></td><td>${l.length}</td><td>${money(v)}</td><td>${(p * 100).toFixed(0)}%</td><td><b>${money(v * p)}</b></td></tr>`; }).join('')}</table></div>`;
  }

  /* ======================= today's briefing ======================= */
  function briefing() {
    const D = DB(), items = [], cn = id => (Store.client(id) || { name: '' }).name;
    D.invoices.filter(i => i.status === 'overdue').forEach(i => items.push({ p: 92, icon: 'dollar', t: `Chase invoice ${i.no}`, s: `${cn(i.cid)} · ${money(i.amount, i.currency)} overdue`, href: '#/admin/invoices', a: 'Open' }));
    D.clients.filter(c => c.status === 'Active').forEach(c => { const f = feedbackFor(c.id)[0]; if (f && f.score <= 6 && Date.now() - f.ts < 30 * 864e5) items.push({ p: 88, icon: 'comment', t: `Check in with ${c.name}`, s: `They rated us ${f.score}/10${f.comment ? ` — “${f.comment}”` : ''}`, href: `#/admin/client/${c.id}/health`, a: 'Review' }); });
    Growth.renewals().filter(r => r.left <= 45 && r.c.status === 'Active').forEach(r => items.push({ p: 82, icon: 'refresh', t: `Renew ${r.c.name}`, s: r.left > 0 ? `Contract ends in ${r.left} days` : 'Contract has expired', renew: r.c.id, a: 'Draft offer' }));
    D.leads.filter(l => !['Won', 'Lost'].includes(l.stage) && l.follow <= TODAY).forEach(l => items.push({ p: 78, icon: 'target', t: `Follow up: ${l.name}`, s: `${l.stage} · ${money(l.value, l.currency)}${l.follow < TODAY ? ' · overdue' : ''}`, href: '#/admin/leads', a: 'Open' }));
    D.clients.filter(c => c.status === 'Active').map(c => ({ c, h: Growth.health(c.id) })).filter(x => x.h.score < 70).forEach(x => items.push({ p: 74, icon: 'bell', t: `Review ${x.c.name}`, s: `Health ${x.h.score} — ${x.h.tips[0] || 'needs attention'}`, href: `#/admin/client/${x.c.id}/health`, a: 'Open' }));
    D.content.filter(k => k.approval === 'pending' && k.date <= addDays(TODAY, 3)).forEach(k => items.push({ p: 70, icon: 'checksq', t: `Awaiting approval: ${k.title}`, s: `${cn(k.cid)} · publishes ${fmtDate(k.date)}`, href: `#/admin/client/${k.cid}/content`, a: 'Open' }));
    D.tasks.filter(t => t.status !== 'done' && t.due <= TODAY).slice(0, 3).forEach(t => items.push({ p: 66, icon: 'clock', t: t.title, s: `${cn(t.cid) || 'General'} · ${t.due < TODAY ? 'overdue ' + fmtDate(t.due) : 'due today'}`, href: '#/admin/tasks', a: 'Open' }));
    return items.sort((a, b) => b.p - a.p).slice(0, 7);
  }
  function briefingHTML() {
    const items = briefing(), hr = new Date().getHours();
    return `<div class="glass card brief"><div class="card-h"><h3>☀️ Today's briefing</h3><small class="muted">${items.length ? `${items.length} thing${items.length > 1 ? 's' : ''} need attention` : 'All clear'}</small></div>${items.map(i => `<div class="brief-i"><span class="ti">${ico(i.icon, 16)}</span><div><b>${esc(i.t)}</b><small class="muted">${esc(i.s)}</small></div>${i.renew ? `<button class="btn sm primary" data-renew="${i.renew}">${i.a}</button>` : `<a class="btn sm" href="${i.href}">${i.a}</a>`}</div>`).join('') || `<p class="muted">Nothing urgent — a great day to pitch a new lead. 🎉</p>`}</div>`;
  }

  w.Studio = { feedbackFor, feedbackCard, referralCard, bindPortal, benchmarkCard, studioHTML, bindAdmin, forecastHTML, briefingHTML, forecast };
})(window);
