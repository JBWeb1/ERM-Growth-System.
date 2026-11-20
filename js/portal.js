/* ERM-Growth System — client portal views (read-only analytics + approvals/messages/requests) */
(function (w) {
  const { $, $$, esc, fmtN, fmtFull, ico, PLAT, PKEYS, platIcon, clientLogo, modal, toast, addDays, todayISO, fmtDate, fmtDateY, uid, ago } = U;
  const TODAY = todayISO();
  const st = { preset: '30d', from: addDays(TODAY, -29), to: TODAY, platform: 'all', split: false, sort: 'views', cplat: 'all' };
  let timer = null, countdown = 60;

  const NAV = [['overview', 'Overview', 'grid'], ['content', 'Content', 'play'], ['goals', 'Goals', 'target'], ['approvals', 'Approvals', 'checksq'], ['messages', 'Messages', 'comment']];

  const range = () => { if (st.preset === 'custom') return { from: st.from, to: st.to }; return Metrics.presetRange(st.preset); };
  const growthChip = (g, k) => `<span class="gchip ${g >= 0 ? 'up' : 'dn'}" ${k ? `data-gkey="${k}"` : ''}>${ico(g >= 0 ? 'up' : 'down', 12)}${Math.abs(g).toFixed(1)}%</span>`;
  const cnt = (v, fmt, key) => `<span class="count" data-key="${key || ''}" data-count="${v}" data-fmt="${fmt}">0</span>`;
  function rangeLabel(q) { return q.len === 1 ? 'today' : `${fmtDate(q.from)} – ${fmtDate(q.to)}`; }

  function liveBadge() { return `<span class="live" id="live"><i></i>Live<small id="live-t">· updates in 60s</small></span>`; }

  function toolbar(c, ctx) {
    const conn = Metrics.connected(c.id);
    return `<div class="toolbar">
      <div class="seg" id="tb-range">${[['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'], ['custom', 'Custom']].map(([k, l]) => `<button class="${st.preset === k ? 'on' : ''}" data-r="${k}">${l}</button>`).join('')}</div>
      <div class="row2 custom ${st.preset === 'custom' ? '' : 'hide'}" id="tb-cust"><input type="date" id="tb-from" value="${st.from}" max="${TODAY}" min="${addDays(TODAY, -240)}"><span>→</span><input type="date" id="tb-to" value="${st.to}" max="${TODAY}"></div>
      <div class="seg plats" id="tb-plat"><button class="${st.platform === 'all' ? 'on' : ''}" data-p="all">All</button>${conn.map(p => `<button class="${st.platform === p ? 'on' : ''}" data-p="${p}" title="${PLAT[p].name}">${platIcon(p, 22)}</button>`).join('')}</div>
    </div>`;
  }

  /* ---------- Overview ---------- */
  function overviewHTML(c, ctx) {
    const r = range(), conn = Metrics.connected(c.id);
    const plats = st.platform === 'all' ? conn : [st.platform];
    const q = Metrics.query(c.id, { ...r, platforms: plats }), qa = Metrics.query(c.id, { ...r, platforms: conn });
    const T = q.totals;
    const isToday = q.len === 1 && q.to === TODAY;
    const prevLabel = isToday ? 'vs yesterday' : `vs previous ${q.len} days`;
    const metric = (k, label, icon, v, fmt, g) => `<div class="glass tile"><div class="tile-h"><span class="ti">${ico(icon, 16)}</span>${label}</div><div class="tile-v">${cnt(v, fmt, 'v:' + k)}</div>${growthChip(g, 'g:' + k)}</div>`;
    const gr = k => q.growth(k);
    let o = `<div class="page-h"><div><h1>Performance <span class="grad">overview</span></h1><p class="muted">${isToday ? 'Today so far' : rangeLabel(q)} · ${plats.length === conn.length ? 'all platforms' : PLAT[plats[0]].name}</p></div>${liveBadge()}</div>${toolbar(c, ctx)}`;

    // hero
    o += `<div class="glass hero"><div class="hero-l"><div class="eyebrow">${ico('eye', 14)} Total views</div><div class="hero-n">${cnt(T.views, 'full', 'v:hero')}</div><div class="hero-g">${growthChip(gr('views'), 'g:hero')}<span class="muted">${prevLabel}</span></div>
      <div class="hero-sub"><div><b>${cnt(T.reach, 'k', 'v:hreach')}</b><span>Reach</span></div><div><b>${cnt(T.engagement, 'pct', 'v:hen')}</b><span>Engagement</span></div><div><b>+${cnt(T.followers, 'full', 'v:hfol')}</b><span>New followers</span></div></div></div>
      <div class="hero-r" id="ch-hero">${heroChart(c, q, plats)}</div></div>`;

    // platform cards
    o += `<div class="grid plat-grid">${conn.map(p => { const t = qa.byPlatform[p]; const g = qa.pgrowth(p, 'views'); const spark = qa.daily.map((_, i) => 0); const sp = Metrics.query(c.id, { from: addDays(TODAY, -13), to: TODAY, platforms: [p] }).daily.map(d => d.views);
      return `<button class="glass pcard ${st.platform === p ? 'sel' : ''}" data-pc="${p}" style="--pc:${PLAT[p].color}"><div class="pc-h">${platIcon(p, 36)}<div><b>${PLAT[p].name}</b><small>${esc(c.accounts[p] || '')}</small></div></div><div class="pc-v">${cnt(t.views, 'full', 'p:' + p)}</div><div class="pc-f">${growthChip(g, 'gp:' + p)}<span class="muted">${t.engagement.toFixed(1)}% eng.</span></div><div class="pc-s">${U.sparkline(sp, PLAT[p].color, 110, 34)}</div></button>`; }).join('')}
      ${PKEYS.filter(p => !conn.includes(p)).map(p => `<div class="glass pcard off">${platIcon(p, 36)}<div><b>${PLAT[p].name}</b><small>Not connected</small></div><span class="muted">Connect to see views</span></div>`).join('')}</div>`;

    // metrics
    o += `<h2 class="sec">Key metrics</h2><div class="grid tiles">
      ${metric('views', 'Views', 'eye', T.views, 'k', gr('views'))}${metric('likes', 'Likes', 'heart', T.likes, 'k', gr('likes'))}${metric('comments', 'Comments', 'comment', T.comments, 'k', gr('comments'))}
      ${metric('shares', 'Shares', 'share', T.shares, 'k', gr('shares'))}${metric('saves', 'Saves', 'bookmark', T.saves, 'k', gr('saves'))}${metric('followers', 'Followers gained', 'userplus', T.followers, 'full', gr('followers'))}
      ${metric('watch', 'Watch time', 'clock', T.watch, 'hrs', gr('watch'))}${metric('engagement', 'Engagement rate', 'zap', T.engagement, 'pct', T.engagement - q.prev.totals.engagement)}${metric('reach', 'Reach', 'globe', T.reach, 'k', gr('reach'))}</div>`;

    // charts
    const vs = Reports.viewsSeries(c.id, q, plats);
    o += `<h2 class="sec">Trends</h2><div class="grid charts">
      <div class="glass card span2"><div class="card-h"><h3>Views over time</h3><div class="seg sm" id="split"><button class="${!st.split ? 'on' : ''}" data-s="0">Total</button><button class="${st.split ? 'on' : ''}" data-s="1">By platform</button></div></div><div class="chart-wrap" id="ch-views">${viewsChart(c, q, plats)}</div></div>
      <div class="glass card"><div class="card-h"><h3>Platform breakdown</h3></div><div class="donut-wrap">${U.donut({ parts: conn.map(p => ({ name: PLAT[p].name, value: qa.byPlatform[p].views, color: PLAT[p].color })), center: `<b>${fmtN(qa.totals.views)}</b><small>views</small>` })}</div><div class="legend">${conn.map(p => `<div><i style="background:${PLAT[p].color}"></i>${PLAT[p].name}<b>${(qa.byPlatform[p].views / (qa.totals.views || 1) * 100).toFixed(0)}%</b></div>`).join('')}</div></div>
      <div class="glass card"><div class="card-h"><h3>Growth vs previous period</h3></div><div class="growth-list">${[['views', 'Views'], ['likes', 'Likes'], ['comments', 'Comments'], ['shares', 'Shares'], ['saves', 'Saves'], ['followers', 'Followers'], ['reach', 'Reach']].map(([k, l]) => { const g = gr(k); return `<div class="gl"><span>${l}</span><div class="gl-bar"><i class="${g >= 0 ? 'up' : 'dn'}" style="width:${Math.min(100, Math.abs(g) * 2.2)}%"></i></div><b class="${g >= 0 ? 'up' : 'dn'}">${g >= 0 ? '+' : '−'}${Math.abs(g).toFixed(1)}%</b></div>`; }).join('')}</div></div>
      <div class="glass card span2"><div class="card-h"><h3>Best posting times</h3><small class="muted">Average views per post · darker = better</small></div>${U.heatmap(Metrics.heat(c.id), ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'])}</div></div>`;

    // top posts
    const top = Metrics.posts(c.id, { ...r, platforms: plats }).sort((a, b) => b.views - a.views).slice(0, 3);
    o += `<h2 class="sec">🏆 Top performing <a class="more" href="#/portal/content">View all ${ico('chev', 14)}</a></h2><div class="grid posts top">${top.length ? top.map((p, i) => postCard(p, i + 1)).join('') : empty('No posts in this period', 'Try a wider date range.')}</div>`;

    // goals preview
    o += `<h2 class="sec">🎯 Monthly goals <a class="more" href="#/portal/goals">All goals ${ico('chev', 14)}</a></h2><div class="grid goals-mini">${Reports.goals(c.id).slice(0, 4).map(goalCard).join('')}</div>`;
    return o;
  }

  function heroChart(c, q, plats) {
    const vs = Reports.viewsSeries(c.id, q, plats);
    return U.lineChart({ series: [{ name: 'Views', color: '#8b7bff', data: vs.series[0].data }], labels: vs.labels, height: 250 });
  }
  function viewsChart(c, q, plats) {
    const vs = Reports.viewsSeries(c.id, q, plats);
    if (st.split && plats.length > 1) {
      return U.lineChart({ series: plats.map(p => ({ name: PLAT[p].name, color: PLAT[p].color, data: q.daily.map((_, i) => 0) })).map((s, i) => ({ ...s, data: Metrics.query(c.id, { from: q.from, to: q.to, platforms: [plats[i]] }).daily.map(d => d.views) })), labels: vs.labels, height: 300, area: false });
    }
    const ser = [{ name: 'This period', color: '#7c8cff', data: vs.series[0].data }];
    if (vs.prevData) ser.push({ name: 'Previous period', color: '#9aa0c8', dashed: true, data: vs.prevData });
    return U.lineChart({ series: ser, labels: vs.labels, height: 300 });
  }

  const medal = i => ['🥇', '🥈', '🥉'][i - 1] || '';
  function postCard(p, rank) {
    const eng = (p.likes + p.comments + p.shares + p.saves) / p.views * 100;
    return `<article class="glass post"><div class="thumb" style="background:linear-gradient(135deg,hsl(${p.hue},75%,58%),hsl(${(p.hue + 55) % 360},70%,38%))"><span class="emoji">${p.emoji}</span>${rank ? `<span class="rank">${medal(rank)} #${rank}</span>` : ''}<span class="tplat">${platIcon(p.platform, 28)}</span><span class="play">${ico('play', 16)}</span></div>
      <div class="post-b"><b>${esc(p.title)}</b><small class="muted">${PLAT[p.platform].name} · ${fmtDate(p.date)}</small><div class="post-s"><span>${ico('eye', 13)}${fmtN(p.views)}</span><span>${ico('heart', 13)}${fmtN(p.likes)}</span><span>${ico('comment', 13)}${fmtN(p.comments)}</span><span class="eng">${eng.toFixed(1)}%</span></div></div></article>`;
  }
  const empty = (t, s) => `<div class="empty glass"><div class="e-ico">${ico('image', 28)}</div><b>${t}</b><p class="muted">${s}</p></div>`;

  function goalCard(g) {
    const fmt = g.goal.metric === 'engagement' ? (n => n.toFixed(1) + '%') : fmtN; const d = new Date(); const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const pace = g.goal.metric === 'engagement' ? g.current / g.goal.target * 100 : (g.current / (d.getDate() / dim)) / g.goal.target * 100;
    const on = pace >= 98;
    return `<div class="glass goal"><div class="goal-h"><span>${esc(g.goal.label)}</span><em class="${on ? 'up' : 'warn'}">${on ? 'On track' : 'Needs a push'}</em></div><div class="goal-v"><b>${fmt(g.current)}</b><span>of ${fmt(g.goal.target)}</span></div><div class="bar"><i style="width:${g.pct}%"></i><span class="pace" style="left:${Math.min(100, d.getDate() / dim * 100)}%"></span></div><div class="goal-f"><span>${g.pct.toFixed(0)}% complete</span><span class="muted">Projected ${Math.round(pace)}%</span></div></div>`;
  }

  /* ---------- Content ---------- */
  function contentHTML(c) {
    const conn = Metrics.connected(c.id), r = range();
    let posts = Metrics.posts(c.id, { from: addDays(TODAY, -89), to: TODAY, platforms: st.cplat === 'all' ? conn : [st.cplat] });
    const inR = posts.filter(p => p.date >= r.from && p.date <= r.to);
    const top = [...inR].sort((a, b) => b.views - a.views).slice(0, 3);
    posts = [...posts].sort((a, b) => st.sort === 'date' ? b.date.localeCompare(a.date) : st.sort === 'eng' ? ((b.likes + b.comments + b.shares + b.saves) / b.views) - ((a.likes + a.comments + a.shares + a.saves) / a.views) : b.views - a.views);
    return `<div class="page-h"><div><h1>Content <span class="grad">library</span></h1><p class="muted">Every post, with performance. Last 90 days.</p></div></div>
      <h2 class="sec">🏆 Top performing <small class="muted">in ${st.preset === 'custom' ? 'selected range' : st.preset === 'today' ? 'today' : 'last ' + st.preset}</small></h2><div class="grid posts top">${top.length ? top.map((p, i) => postCard(p, i + 1)).join('') : empty('No posts published in this range', 'Pick a longer range on the Overview tab.')}</div>
      <h2 class="sec">All posts</h2><div class="toolbar"><div class="seg plats" id="cl-plat"><button class="${st.cplat === 'all' ? 'on' : ''}" data-p="all">All</button>${conn.map(p => `<button class="${st.cplat === p ? 'on' : ''}" data-p="${p}">${platIcon(p, 22)}</button>`).join('')}</div>
      <div class="seg" id="cl-sort">${[['views', 'Most views'], ['eng', 'Best engagement'], ['date', 'Newest']].map(([k, l]) => `<button class="${st.sort === k ? 'on' : ''}" data-s="${k}">${l}</button>`).join('')}</div></div>
      <div class="grid posts">${posts.length ? posts.map(p => postCard(p)).join('') : empty('No posts yet', 'Your first posts will appear here as soon as they go live.')}</div>`;
  }

  /* ---------- Goals ---------- */
  function goalsHTML(c, ctx) {
    const gs = Reports.goals(c.id);
    return `<div class="page-h"><div><h1>Monthly <span class="grad">goals</span></h1><p class="muted">Progress this month · resets on the 1st</p></div>${ctx.admin ? `<button class="btn" id="edit-goals">${ico('edit', 16)} Edit targets</button>` : ''}</div><div class="grid goals">${gs.map(goalCard).join('')}</div>
    <div class="glass note">${ico('zap', 18)}<div><b>How we track this</b><p class="muted">The marker on each bar shows where you should be today for the month. If your progress is ahead of it, you're on pace to beat the target.</p></div></div>`;
  }

  /* ---------- Approvals ---------- */
  function approvalsHTML(c) {
    const items = Store.byClient('content', c.id).filter(k => k.approval).sort((a, b) => a.date.localeCompare(b.date));
    const pend = items.filter(k => k.approval === 'pending' || k.approval === 'changes'), done = items.filter(k => k.approval === 'approved');
    const card = k => `<div class="glass appr" data-k="${k.id}"><div class="appr-h">${platIcon(k.platform, 36)}<div><b>${esc(k.title)}</b><small class="muted">${PLAT[k.platform].name} · scheduled ${fmtDate(k.date)}</small></div><span class="badge ${k.approval}">${k.approval === 'pending' ? 'Awaiting you' : k.approval === 'changes' ? 'Changes requested' : 'Approved'}</span></div>
      ${k.notes ? `<p class="muted">${esc(k.notes)}</p>` : ''}${(k.comments || []).map(m => `<div class="cm ${m.by}"><b>${m.by === 'client' ? 'You' : 'ERM'}</b>${esc(m.text)}<small>${ago(m.ts)}</small></div>`).join('')}
      ${k.approval !== 'approved' ? `<div class="appr-a"><textarea placeholder="Add a comment or request changes…" rows="2"></textarea><div><button class="btn ghost" data-act="changes">Request changes</button><button class="btn primary" data-act="approve">${ico('check', 16)} Approve</button></div></div>` : ''}</div>`;
    return `<div class="page-h"><div><h1>Content <span class="grad">approvals</span></h1><p class="muted">Review upcoming content before it goes live.</p></div></div>
      <h2 class="sec">Needs your review (${pend.length})</h2><div class="stack">${pend.map(card).join('') || empty('All caught up 🎉', 'Nothing is waiting for your approval right now.')}</div>
      ${done.length ? `<h2 class="sec">Approved</h2><div class="stack">${done.map(card).join('')}</div>` : ''}`;
  }

  /* ---------- Messages + requests ---------- */
  function messagesHTML(c) {
    const msgs = Store.byClient('messages', c.id).sort((a, b) => a.date - b.date), reqs = Store.byClient('requests', c.id);
    return `<div class="page-h"><div><h1>Messages &amp; <span class="grad">requests</span></h1><p class="muted">Talk to your ERM team and request new content.</p></div></div>
    <div class="grid two"><div class="glass card chat"><div class="card-h"><h3>Conversation</h3></div><div class="msgs" id="msgs">${msgs.map(m => `<div class="msg ${m.from}"><p>${esc(m.text)}</p><small>${m.from === 'agency' ? 'ERM Marketing' : 'You'} · ${ago(m.date)}</small></div>`).join('') || '<p class="muted">No messages yet.</p>'}</div>
      <form id="msg-f" class="msg-f"><input id="msg-i" placeholder="Write a message…" autocomplete="off" required><button class="btn primary" aria-label="Send">${ico('send', 16)}</button></form></div>
    <div class="glass card"><div class="card-h"><h3>Request content</h3></div><form id="req-f" class="form"><label>Type<select name="type"><option>Video idea</option><option>Promotion / offer</option><option>Event coverage</option><option>Change to existing content</option><option>Other</option></select></label><label>Title<input name="title" required placeholder="e.g. Feature our new menu"></label><label>Platform<select name="platform">${Metrics.connected(c.id).map(p => `<option value="${p}">${PLAT[p].name}</option>`).join('')}</select></label><label>Needed by<input type="date" name="due" min="${TODAY}"></label><label>Details<textarea name="details" rows="3" placeholder="Anything we should know…"></textarea></label><button class="btn primary">${ico('send', 16)} Send request</button></form>
    ${reqs.length ? `<div class="reqs"><h4>Your requests</h4>${reqs.map(r => `<div class="req"><div><b>${esc(r.title)}</b><small class="muted">${esc(r.type)} · ${ago(r.ts)}</small></div><span class="badge ${r.status === 'New' ? 'pending' : 'approved'}">${esc(r.status)}</span></div>`).join('')}</div>` : ''}</div></div>`;
  }

  /* ---------- controller ---------- */
  function render(main, c, sub, ctx = {}) {
    clearInterval(timer); main.dataset.sub = sub;
    const draw = () => {
      main.innerHTML = `<div class="view">${{ overview: overviewHTML, content: contentHTML, goals: goalsHTML, approvals: approvalsHTML, messages: messagesHTML }[sub](c, ctx)}</div>`;
      U.runCounters(main); bind();
      const m = $('#msgs', main); if (m) m.scrollTop = m.scrollHeight;
    };
    const bind = () => {
      const rng = $('#tb-range', main);
      if (rng) {
        rng.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; st.preset = b.dataset.r; if (st.preset === 'custom') { st.from = addDays(TODAY, -13); st.to = TODAY; } draw(); };
        const cu = () => { const f = $('#tb-from', main).value, t = $('#tb-to', main).value; if (f && t && f <= t) { st.from = f; st.to = t; draw(); } };
        $('#tb-from', main).onchange = cu; $('#tb-to', main).onchange = cu;
        $('#tb-plat', main).onclick = e => { const b = e.target.closest('[data-p]'); if (b) { st.platform = b.dataset.p; draw(); } };
        $$('[data-pc]', main).forEach(b => b.onclick = () => { st.platform = st.platform === b.dataset.pc ? 'all' : b.dataset.pc; draw(); });
        const sp = $('#split', main); if (sp) sp.onclick = e => { const b = e.target.closest('[data-s]'); if (b) { st.split = b.dataset.s === '1'; draw(); } };
      }
      const cp = $('#cl-plat', main); if (cp) { cp.onclick = e => { const b = e.target.closest('[data-p]'); if (b) { st.cplat = b.dataset.p; draw(); } }; $('#cl-sort', main).onclick = e => { const b = e.target.closest('[data-s]'); if (b) { st.sort = b.dataset.s; draw(); } }; }
      $$('.appr', main).forEach(card => $$('[data-act]', card).forEach(b => b.onclick = () => {
        const k = Store.db.content.find(x => x.id === card.dataset.k), txt = $('textarea', card).value.trim();
        if (txt) (k.comments = k.comments || []).push({ by: 'client', text: txt, ts: Date.now() });
        if (b.dataset.act === 'approve') { k.approval = 'approved'; k.status = 'approved'; Store.log(c.id, `Client approved “${k.title}”`, 'check'); Store.notify(`${c.name} approved “${k.title}”`, 'check'); toast('Approved — thank you!'); }
        else { if (!txt) { toast('Please add a comment describing the changes', 'warn'); return; } k.approval = 'changes'; Store.log(c.id, `Client requested changes on “${k.title}”`, 'edit'); Store.notify(`${c.name} requested changes: “${k.title}”`, 'edit'); toast('Feedback sent to your ERM team'); }
        Store.save(); draw();
      }));
      const mf = $('#msg-f', main); if (mf) mf.onsubmit = e => { e.preventDefault(); const v = $('#msg-i', main).value.trim(); if (!v) return; Store.add('messages', { cid: c.id, from: ctx.admin ? 'agency' : 'client', text: v, date: Date.now() }); if (!ctx.admin) Store.notify(`New message from ${c.name}`, 'comment'); draw(); };
      const rf = $('#req-f', main); if (rf) rf.onsubmit = e => { e.preventDefault(); const f = Object.fromEntries(new FormData(rf)); Store.add('requests', { cid: c.id, ...f, status: 'New', ts: Date.now() }); Store.add('tasks', { cid: c.id, title: `Client request: ${f.title}`, assignee: 'u2', due: f.due || addDays(TODAY, 7), status: 'todo', priority: 'med' }); Store.notify(`${c.name} requested: ${f.title}`, 'send'); Store.log(c.id, `Content request: ${f.title}`, 'send'); toast('Request sent! We\'ll be in touch.'); draw(); };
      const eg = $('#edit-goals', main); if (eg) eg.onclick = () => editGoals(c, draw);
    };
    draw();

    if (sub === 'overview') {
      countdown = 60;
      timer = setInterval(() => {
        countdown--; const t = $('#live-t'); if (t) t.textContent = `· updates in ${countdown}s`;
        if (countdown <= 0) { countdown = 60; Metrics.tick(); liveUpdate(main, c); }
      }, 1000);
    }
    return () => clearInterval(timer);
  }

  /* refresh numbers in place (no full redraw → counters roll smoothly) */
  function liveUpdate(main, c) {
    const r = range(), conn = Metrics.connected(c.id), plats = st.platform === 'all' ? conn : [st.platform];
    const q = Metrics.query(c.id, { ...r, platforms: plats }), qa = Metrics.query(c.id, { ...r, platforms: conn }), T = q.totals;
    const set = (key, v, fmt) => $$(`[data-key="${key}"]`, main).forEach(el => U.animateCount(el, v, { fmt, dur: 900 }));
    const f = { k: fmtN, full: fmtFull, pct: n => n.toFixed(1) + '%', hrs: U.fmtHours };
    ['views', 'likes', 'comments', 'shares', 'saves', 'reach'].forEach(k => set('v:' + k, T[k], f.k)); set('v:followers', T.followers, f.full); set('v:watch', T.watch, f.hrs); set('v:engagement', T.engagement, f.pct);
    set('v:hero', T.views, f.full); set('v:hreach', T.reach, f.k); set('v:hen', T.engagement, f.pct); set('v:hfol', T.followers, f.full);
    conn.forEach(p => set('p:' + p, qa.byPlatform[p].views, f.full));
    const ch = $('#ch-hero', main); if (ch) { ch.classList.add('noanim'); ch.innerHTML = heroChart(c, q, plats); }
    const cv = $('#ch-views', main); if (cv) { cv.classList.add('noanim'); cv.innerHTML = viewsChart(c, q, plats); }
    const lv = $('#live'); if (lv) { lv.classList.remove('pulse'); void lv.offsetWidth; lv.classList.add('pulse'); }
  }

  function editGoals(c, redraw) {
    const gs = Store.byClient('goals', c.id);
    modal({ title: `Edit monthly targets — ${esc(c.name)}`, body: `<div class="form">${gs.map(g => `<label>${esc(g.label)}<input type="number" step="any" data-g="${g.id}" value="${g.target}"></label>`).join('')}</div>`, foot: '<button class="btn primary" id="g-save">Save targets</button>', onMount(root, close) { $('#g-save', root).onclick = () => { $$('[data-g]', root).forEach(i => { const g = gs.find(x => x.id === i.dataset.g); g.target = +i.value || g.target; }); Store.save(); toast('Targets updated'); close(); redraw(); }; } });
  }

  w.Portal = { render, NAV, st };
})(window);
