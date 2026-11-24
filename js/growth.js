/* ERM-Growth System — retention & growth features:
 * client health score · renewal reminders · automatic alerts · onboarding checklist · presentation mode · lead-capture form */
(function (w) {
  const { $, $$, esc, clamp, fmtN, fmtFull, money, ico, PLAT, platIcon, ermLogo, clientLogo, modal, toast, copyText, addDays, todayISO, fmtDate, fmtDateY, diffDays, uid, ago } = U;
  const TODAY = todayISO();
  const DB = () => Store.db;
  const refresh = () => document.dispatchEvent(new Event('erm:refresh'));

  /* ======================= HEALTH SCORE ======================= */
  function health(cid) {
    const c = Store.client(cid), D = DB(), q = Metrics.query(cid, { from: addDays(TODAY, -29), to: TODAY });
    const g = q.growth('views'), eng = q.totals.engagement, act = Insights.activity(cid);
    const daysSince = act.last ? (Date.now() - act.last) / 864e5 : 99;
    const overdue = D.invoices.filter(i => i.cid === cid && i.status === 'overdue').length;
    const left = diffDays(TODAY, c.end);
    const pending = D.content.filter(k => k.cid === cid && k.approval === 'pending').length;
    const F = [
      { k: 'growth', name: 'View growth (30d)', w: 30, s: clamp(50 + g * 2.5, 0, 100), detail: `${g >= 0 ? '+' : ''}${g.toFixed(1)}% vs previous period`, tip: 'Views are flat or falling — refresh the content plan and try new hooks.' },
      { k: 'eng', name: 'Engagement', w: 15, s: clamp(eng / 10 * 100, 0, 100), detail: `${eng.toFixed(1)}% engagement rate`, tip: 'Engagement is low — add stronger calls-to-action and reply to comments.' },
      { k: 'portal', name: 'Portal activity', w: 20, s: daysSince <= 3 ? 100 : daysSince <= 7 ? 80 : daysSince <= 14 ? 55 : daysSince <= 21 ? 30 : 10, detail: act.last ? `Last visit ${ago(act.last)}` : 'Never visited', tip: 'They have not looked at their dashboard lately — send the weekly-wins message.' },
      { k: 'bill', name: 'Billing', w: 15, s: overdue === 0 ? 100 : overdue === 1 ? 40 : 10, detail: overdue ? `${overdue} overdue invoice${overdue > 1 ? 's' : ''}` : 'All invoices on time', tip: 'Chase the overdue invoice (use the Invoice reminder template).' },
      { k: 'contract', name: 'Contract runway', w: 10, s: left > 90 ? 100 : left > 60 ? 80 : left > 30 ? 55 : left > 0 ? 30 : 10, detail: left > 0 ? `${left} days left` : `Expired ${-left} days ago`, tip: 'Contract is ending — start the renewal conversation now.' },
      (() => { const f = Studio.feedbackFor(cid)[0]; return { k: 'sat', name: 'Client satisfaction', w: 10, s: !f ? 70 : f.score >= 9 ? 100 : f.score >= 7 ? 75 : 25, detail: f ? `Rated us ${f.score}/10 · ${ago(f.ts)}` : 'No rating yet', tip: f && f.score <= 6 ? `They rated us ${f.score}/10${f.comment ? ` (“${f.comment}”)` : ''} — call them this week.` : 'Ask for a satisfaction rating.' }; })(),
      { k: 'appr', name: 'Approvals responsiveness', w: 10, s: [100, 75, 55, 30][Math.min(3, pending)], detail: pending ? `${pending} item${pending > 1 ? 's' : ''} awaiting approval` : 'Nothing waiting', tip: 'Content is waiting on them — nudge with the approval reminder.' }
    ];
    const score = Math.round(F.reduce((a, f) => a + f.s * f.w, 0) / F.reduce((a, f) => a + f.w, 0));
    const label = score >= 75 ? 'Healthy' : score >= 50 ? 'Watch' : 'At risk';
    return { score, label, cls: score >= 75 ? 'ok' : score >= 50 ? 'mid' : 'bad', factors: F, tips: F.filter(f => f.s < 60).sort((a, b) => a.s - b.s).map(f => f.tip), left };
  }
  const healthPill = cid => { const h = health(cid); return `<span class="hp ${h.cls}" title="Client health score"><i></i>${h.score} · ${h.label}</span>`; };

  function healthTab(c) {
    const h = health(c.id);
    return `<div class="grid two"><div class="glass card hscore"><div class="score ${h.cls}" style="--v:${h.score}"><div><b>${h.score}</b><small>${h.label}</small></div></div><div><h3>Client health score</h3><p class="muted sm">Combines growth, engagement, portal activity, billing, contract runway and approvals.</p>
      <div class="actions"><button class="btn sm" data-wa-checkin="${c.id}">${ico('comment', 14)} Send check-in</button><button class="btn sm primary" data-rep="${c.id}">${ico('file', 14)} Generate report</button><button class="btn sm" data-renew="${c.id}">${ico('refresh', 14)} Renewal offer</button></div></div></div>
      <div class="glass card"><div class="card-h"><h3>Recommended actions</h3></div>${h.tips.length ? h.tips.map(t => `<div class="li"><div><b>${ico('zap', 14)} ${esc(t)}</b></div></div>`).join('') : '<p class="muted">Everything looks great — consider asking for a testimonial or referral. 🎉</p>'}</div></div>
    <div class="glass card tbl-wrap" style="margin-top:16px"><div class="card-h"><h3>Score breakdown</h3></div><table class="tbl"><tr><th>Factor</th><th>Detail</th><th>Weight</th><th style="width:34%">Score</th></tr>${h.factors.map(f => `<tr><td><b>${f.name}</b></td><td class="muted">${esc(f.detail)}</td><td>${f.w}%</td><td><div class="bar sm ${f.s >= 75 ? '' : f.s >= 50 ? 'amber' : 'red'}"><i style="width:${f.s}%"></i></div></td></tr>`).join('')}</table></div>`;
  }

  /* ======================= RENEWALS ======================= */
  function renewals() { return DB().clients.filter(c => c.status !== 'Churned' && diffDays(TODAY, c.end) <= 60).map(c => ({ c, left: diffDays(TODAY, c.end) })).sort((a, b) => a.left - b.left); }
  function ensureRenewalTemplate() {
    let t = DB().templates.find(x => x.name === 'Renewal offer'); if (t) return t;
    t = { id: uid('tp'), type: 'email', name: 'Renewal offer', subject: 'Let\'s keep the momentum going 🚀', body: 'Hi {{name}},\n\nYour ERM Marketing agreement is coming up for renewal. In the last 30 days your content earned {{views}} views ({{growth}} vs the previous period).\n\nI\'d love to lock in the next 6 months and build on this — I can send over an updated proposal with a few ideas to push results further.\n\nWould a quick call this week work?\n\nBuild | Automate | Grow,\nERM Marketing' };
    DB().templates.push(t); Store.save(); return t;
  }
  function renewal(cid) {
    const t = ensureRenewalTemplate(), c = Store.client(cid);
    if (!DB().tasks.some(x => x.cid === cid && x.title.startsWith('Renewal call') && x.status !== 'done')) Store.add('tasks', { title: `Renewal call — ${c.name}`, cid, assignee: 'u1', due: addDays(TODAY, 3), status: 'todo', priority: 'high' });
    Admin.useTemplate(t, cid);
  }

  /* ======================= AUTOMATIC ALERTS ======================= */
  const RULES = [['viral', 'Viral post detected', 'A post performs 3×+ above the client\'s typical post'], ['milestone', 'View milestone reached', '100K, 250K, 500K, 1M… total views'], ['goal', 'Monthly goal achieved', 'A goal reaches 100%'], ['overdue', 'Invoice overdue', 'An invoice passes its due date'], ['health', 'Client health drops below 50', 'Early warning of churn risk'], ['renewal', 'Contract ends within 60 days', 'Start the renewal conversation']];
  const rules = () => Object.assign({ viral: true, milestone: true, goal: true, overdue: true, health: true, renewal: true, tellClient: true }, DB().settings.alerts || {});
  function runAlerts() {
    const D = DB(), R = rules(); D.alertsSeen = D.alertsSeen || {}; D.alertLog = D.alertLog || []; let n = 0;
    const fire = (key, cid, rule, icon, text, clientMsg) => {
      if (D.alertsSeen[key]) return; D.alertsSeen[key] = 1; n++;
      Store.notify(`${Store.client(cid).name}: ${text}`, icon);
      D.alertLog.unshift({ id: uid('al'), ts: Date.now(), cid, rule, text, clientMsg: clientMsg || '' });
      if (R.tellClient && clientMsg) D.messages.push({ id: uid('n'), cid, from: 'agency', text: clientMsg, date: Date.now() });
    };
    D.clients.filter(c => c.status === 'Active').forEach(c => {
      const recent = addDays(TODAY, -14);
      Insights.milestones(c.id).filter(m => m.date >= recent).forEach(m => {
        if (m.kind === 'viral' && R.viral) fire(`viral:${c.id}:${m.text}`, c.id, 'viral', 'zap', m.text, `🔥 ${m.text}. We're already planning a follow-up!`);
        if (m.kind === 'milestone' && R.milestone) fire(`ms:${c.id}:${m.text}`, c.id, 'milestone', 'star', m.text, `🎉 ${m.text}. Congratulations — keep an eye on your live dashboard!`);
      });
      if (R.goal) Reports.goals(c.id).filter(g => g.pct >= 100 && g.goal.metric !== 'engagement').forEach(g => fire(`goal:${c.id}:${g.goal.id}:${TODAY.slice(0, 7)}`, c.id, 'goal', 'target', `Goal achieved — ${g.goal.label}`, `🎯 You've hit this month's goal: ${g.goal.label}! Great work.`));
      if (R.health) { const h = health(c.id); if (h.score < 50) fire(`health:${c.id}:${TODAY.slice(0, 7)}`, c.id, 'health', 'bell', `Health score is ${h.score} (${h.label}) — check in with them`); }
      if (R.renewal) { const left = diffDays(TODAY, c.end); if (left <= 60) fire(`renew:${c.id}:${c.end}`, c.id, 'renewal', 'refresh', left > 0 ? `Contract ends in ${left} days — start renewal` : `Contract expired ${-left} days ago — renew now`); }
    });
    if (R.overdue) D.invoices.filter(i => i.status === 'overdue').forEach(i => fire(`over:${i.id}`, i.cid, 'overdue', 'dollar', `Invoice ${i.no} is overdue (${money(i.amount, i.currency)})`));
    if (n) Store.save(); return n;
  }
  function automationsHTML() {
    const R = rules(), log = DB().alertLog || [];
    return `<div class="grid two"><div class="glass card"><div class="card-h"><h3>Alert rules</h3></div>${RULES.map(([k, n, d]) => `<div class="li"><div><b>${n}</b><small class="muted">${d}</small></div><label class="switch"><input type="checkbox" data-rule="${k}" ${R[k] ? 'checked' : ''}><i></i></label></div>`).join('')}
      <div class="li"><div><b>Also message the client automatically</b><small class="muted">Posts good-news alerts (viral, milestone, goal) into the client's portal Messages</small></div><label class="switch"><input type="checkbox" data-rule="tellClient" ${R.tellClient ? 'checked' : ''}><i></i></label></div>
      <p class="hint">Phase 1 checks rules whenever you open the admin. Phase 2 runs them on a schedule and sends real WhatsApp / email.</p></div>
    <div class="glass card"><div class="card-h"><h3>Alert log</h3></div>${log.slice(0, 12).map(a => { const c = Store.client(a.cid); return `<div class="li"><div><b>${esc(c ? c.name : '')}</b><small class="muted">${esc(a.text)} · ${ago(a.ts)}</small></div>${c && c.contact.phone ? `<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${c.contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(a.clientMsg || a.text)}">${ico('comment', 13)} WhatsApp</a>` : ''}</div>`; }).join('') || '<p class="muted">No alerts fired yet.</p>'}</div></div>`;
  }

  /* ======================= DASHBOARD CARDS ======================= */
  function dashboardCards() {
    const cl = DB().clients.filter(c => c.status !== 'Churned').map(c => ({ c, h: health(c.id) })).sort((a, b) => a.h.score - b.h.score), rn = renewals();
    return `<div class="grid charts" style="margin-top:16px"><div class="glass card span2"><div class="card-h"><h3>Client health</h3><small class="muted">lowest first · click for details</small></div><div class="rank-list">${cl.map(({ c, h }) => `<a href="#/admin/client/${c.id}/health" class="rk hrk">${clientLogo(c, 30)}<div><b>${esc(c.name)}</b><div class="bar sm ${h.cls === 'ok' ? '' : h.cls === 'mid' ? 'amber' : 'red'}"><i style="width:${h.score}%"></i></div></div><span class="hp ${h.cls}"><i></i>${h.score}</span></a>`).join('')}</div></div>
    <div class="glass card"><div class="card-h"><h3>Renewals due · 60 days</h3></div>${rn.map(({ c, left }) => `<div class="li"><div><b>${esc(c.name)}</b><small class="${left <= 0 ? 'dn' : 'muted'}">${left > 0 ? `Ends in ${left} days` : `Expired ${-left} days ago`} · ${fmtDate(c.end)}</small></div><button class="btn sm primary" data-renew="${c.id}">Renew</button></div>`).join('') || '<p class="muted">No contracts ending soon. 🎉</p>'}</div></div>`;
  }

  /* ======================= ONBOARDING ======================= */
  const ONB = [['Kick-off call & agree goals', 1], ['Collect logo, brand colours & assets', 3], ['Get social account access (OAuth connect)', 4], ['Content plan & first-month calendar', 7], ['Produce first content batch', 10], ['Set monthly goals & share portal login', 5], ['First report review call', 30]];
  function startOnboarding(cid) { const c = Store.client(cid); if (DB().tasks.some(t => t.cid === cid && t.tag === 'onboarding')) return; ONB.forEach(([title, d]) => DB().tasks.push({ id: uid('t'), title, cid, assignee: 'u1', due: addDays(TODAY, d), status: 'todo', priority: d <= 4 ? 'high' : 'med', tag: 'onboarding' })); Store.log(cid, 'Onboarding checklist created', 'checksq'); Store.save(); }
  function onboardingTab(c) {
    const t = DB().tasks.filter(x => x.cid === c.id && x.tag === 'onboarding').sort((a, b) => a.due.localeCompare(b.due)), done = t.filter(x => x.status === 'done').length;
    if (!t.length) return `<div class="empty glass"><div class="e-ico">${ico('checksq', 26)}</div><b>No onboarding checklist yet</b><p class="muted">Create the standard 7-step onboarding for ${esc(c.name)}.</p><button class="btn primary" data-onb-start="${c.id}">Create checklist</button></div>`;
    return `<div class="glass card"><div class="card-h"><h3>Onboarding · ${done}/${t.length} complete</h3><span class="muted">${Math.round(done / t.length * 100)}%</span></div><div class="bar" style="margin-bottom:18px"><i style="width:${done / t.length * 100}%"></i></div>${t.map(x => `<div class="li"><div style="display:flex;gap:12px;align-items:center"><label class="chk"><input type="checkbox" data-done="${x.id}" ${x.status === 'done' ? 'checked' : ''}><i></i></label><div><b style="${x.status === 'done' ? 'text-decoration:line-through;opacity:.5' : ''}">${esc(x.title)}</b><small class="${x.due < TODAY && x.status !== 'done' ? 'dn' : 'muted'}">Due ${fmtDate(x.due)}</small></div></div></div>`).join('')}</div>`;
  }

  /* ======================= PRESENTATION MODE ======================= */
  function present(cid) {
    const c = Store.client(cid), conn = Metrics.connected(cid), q = Metrics.query(cid, { from: addDays(TODAY, -29), to: TODAY, platforms: conn }), T = q.totals, ins = Reports.insights(cid, q, { platforms: conn }), goals = Reports.goals(cid);
    const vs = Reports.viewsSeries(cid, q, conn), top = ins.posts.slice(0, 3), g = q.growth('views');
    const big = (label, v, fmt) => `<div class="pbig"><b class="count" data-count="${v}" data-fmt="${fmt}">0</b><span>${label}</span></div>`;
    const slides = [
      `<div class="sl-c">${clientLogo(c, 110)}<h1>${esc(c.name)}</h1><p class="sl-sub">Performance review · ${fmtDate(q.from)} – ${fmtDateY(q.to)}</p><div class="sl-brand">${ermLogo(34)} <span>ERM Marketing · Build | Automate | Grow</span></div></div>`,
      `<div class="sl-c"><div class="eyebrow">${ico('eye', 16)} Total views · last 30 days</div><div class="sl-huge"><span class="count" data-count="${T.views}" data-fmt="full">0</span></div><span class="gchip lg ${g >= 0 ? 'up' : 'dn'}">${ico(g >= 0 ? 'up' : 'down', 16)}${Math.abs(g).toFixed(1)}% vs previous period</span></div>`,
      `<div class="sl-c"><h2>Where your audience watches</h2><div class="sl-plats">${conn.map(p => `<div class="glass pcard" style="--pc:${PLAT[p].color}">${platIcon(p, 52)}<b>${PLAT[p].name}</b><div class="pc-v"><span class="count" data-count="${q.byPlatform[p].views}" data-fmt="k">0</span></div><span class="gchip ${q.pgrowth(p, 'views') >= 0 ? 'up' : 'dn'}">${ico(q.pgrowth(p, 'views') >= 0 ? 'up' : 'down', 12)}${Math.abs(q.pgrowth(p, 'views')).toFixed(1)}%</span></div>`).join('')}</div></div>`,
      `<div class="sl-c wide"><h2>Growth over time</h2><div class="glass card">${U.lineChart({ series: [{ name: 'This period', color: 'var(--c1)', data: vs.series[0].data }, { name: 'Previous period', color: 'rgba(128,140,170,.9)', dashed: true, data: vs.prevData || [] }].filter(s => s.data.length), labels: vs.labels, height: 400 })}</div></div>`,
      `<div class="sl-c"><h2>Engagement &amp; reach</h2><div class="pbig-row">${big('Engagement rate', T.engagement, 'pct')}${big('Reach', T.reach, 'k')}${big('New followers', T.followers, 'full')}${big('Hours watched', T.watch, 'full')}</div></div>`,
      `<div class="sl-c wide"><h2>🏆 Top performing content</h2><div class="sl-posts">${top.map((p, i) => `<div class="glass post"><div class="thumb" style="background:linear-gradient(135deg,hsl(${p.hue},75%,58%),hsl(${(p.hue + 55) % 360},70%,38%))"><span class="emoji">${p.emoji}</span><span class="rank">#${i + 1}</span><span class="tplat">${platIcon(p.platform, 30)}</span></div><div class="post-b"><b>${esc(p.title)}</b><small class="muted">${PLAT[p.platform].name} · ${fmtDate(p.date)}</small><div class="sl-pv">${fmtN(p.views)} views</div></div></div>`).join('')}</div></div>`,
      `<div class="sl-c wide"><h2>🎯 Monthly goals</h2><div class="sl-goals">${goals.map(x => `<div><div class="goal-h"><span>${esc(x.goal.label)}</span><b>${x.pct.toFixed(0)}%</b></div><div class="bar"><i style="width:${x.pct}%"></i></div></div>`).join('')}</div></div>`,
      `<div class="sl-c wide"><div class="sl-two"><div><h2>🏆 Wins</h2><ul>${ins.wins.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div><h2>🚀 Next steps</h2><ul>${ins.next.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div></div>`,
      `<div class="sl-c"><h1>Thank you</h1><p class="sl-sub">Your live dashboard is always available — log in any time.</p><div class="sl-brand">${ermLogo(34)} <span>${esc(DB().settings.agency)} · ${esc(DB().settings.tagline)}</span></div></div>`
    ];
    let i = 0; const el = document.createElement('div'); el.className = 'pres'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Presentation');
    el.style.setProperty('--a1', getComputedStyle(document.documentElement).getPropertyValue('--a1'));
    el.innerHTML = `<div class="pres-in" id="pres-in"></div><button class="pres-x icon-btn" aria-label="Close presentation">${ico('x', 22)}</button><div class="pres-nav"><button class="icon-btn" data-p="-1" aria-label="Previous">${ico('chev', 22, 'flip')}</button><div class="pres-dots">${slides.map((_, k) => `<i data-k="${k}"></i>`).join('')}</div><button class="icon-btn" data-p="1" aria-label="Next">${ico('chev', 22)}</button></div><div class="pres-hint">← → or click · Esc to exit</div>`;
    document.body.appendChild(el); document.body.classList.add('noscroll');
    try { el.requestFullscreen && el.requestFullscreen(); } catch (e) { }
    const show = n => { i = clamp(n, 0, slides.length - 1); const s = $('#pres-in', el); s.classList.remove('in'); s.innerHTML = slides[i]; void s.offsetWidth; s.classList.add('in'); U.runCounters(s); $$('.pres-dots i', el).forEach((d, k) => d.classList.toggle('on', k === i)); };
    const close = () => { document.removeEventListener('keydown', key); document.body.classList.remove('noscroll'); el.remove(); try { document.fullscreenElement && document.exitFullscreen(); } catch (e) { } };
    const key = e => { if (e.key === 'Escape') close(); else if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); show(i + 1); } else if (['ArrowLeft', 'PageUp'].includes(e.key)) show(i - 1); };
    document.addEventListener('keydown', key);
    el.addEventListener('click', e => { if (e.target.closest('.pres-x')) return close(); const b = e.target.closest('[data-p]'); if (b) return show(i + +b.dataset.p); const d = e.target.closest('[data-k]'); if (d) return show(+d.dataset.k); if (e.target.closest('.pres-in')) show(i + (e.clientX > innerWidth / 2 ? 1 : -1)); });
    show(0);
  }

  /* ======================= LEAD CAPTURE FORM ======================= */
  const BUDGET = { 'Under $500 / R9k': 400, '$500–1,500 / R9k–28k': 1000, '$1,500–3,000 / R28k–55k': 2200, '$3,000+ / R55k+': 3500 };
  function leadFormView(root) {
    const D = DB(), embed = /embed/.test(location.hash);
    root.innerHTML = `<div class="lf-wrap ${embed ? 'embed' : ''}"><div class="glass lf"><div class="brandrow">${ermLogo(44)}<div><b>${esc(D.settings.agency)}</b><small>${esc(D.settings.tagline)}</small></div></div>
      <div id="lf-body"><h1>Get a free <span class="grad">content audit</span></h1><p class="muted">Tell us about your business and we'll show you how short-form video and automation can grow it.</p>
      <form id="lf-f" class="form"><div class="row2"><label>Your name<input name="contact" required autocomplete="name"></label><label>Business<input name="name" required autocomplete="organization"></label></div><div class="row2"><label>Email<input name="email" type="email" required autocomplete="email"></label><label>WhatsApp / phone<input name="phone" autocomplete="tel"></label></div>
      <label>Monthly budget<select name="budget">${Object.keys(BUDGET).map(k => `<option>${k}</option>`).join('')}</select></label><label>Currency<select name="currency"><option>USD</option><option>ZAR</option></select></label>
      <label>What do you want to achieve?<textarea name="notes" rows="3" placeholder="More bookings, more followers, lead automation…"></textarea></label><button class="btn primary lg">Request my free audit ${ico('chev', 16)}</button><p class="hint">Demo form: submissions land in this browser's pipeline (Phase 2 saves to your database and emails you).</p></form></div></div></div>`;
    $('#lf-f', root).onsubmit = e => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
      const rm = location.hash.match(/ref=([\w-]+)/), rc = rm && Store.client(rm[1]);
      Store.add('leads', { name: d.name, contact: d.contact, email: d.email, phone: d.phone, stage: 'New', source: rc ? `Referral: ${rc.name}` : 'Website', value: BUDGET[d.budget], currency: d.currency, follow: addDays(TODAY, 1), notes: d.notes || '' });
      Store.notify(rc ? `New referral from ${rc.name}: ${d.name} 🎁` : `New website lead: ${d.name}`, 'target');
      $('#lf-body', root).innerHTML = `<div class="lf-ok"><div class="e-ico">${ico('check', 28)}</div><h1>Thank you, ${esc(d.contact.split(' ')[0])}!</h1><p class="muted">We've received your request and will be in touch within one business day.</p></div>`;
    };
  }
  function leadFormModal() {
    const url = location.href.split('#')[0] + '#/lead-form';
    modal({ title: 'Lead capture form', body: `<p class="muted">Share this link or embed it on your website. Every submission becomes a <b>New</b> lead in your pipeline.</p><div class="form"><label>Link<input readonly value="${esc(url)}" id="lfm-u"></label><label>Embed code<textarea readonly rows="3" id="lfm-e">&lt;iframe src="${esc(url)}?embed=1" width="100%" height="720" style="border:0;border-radius:16px"&gt;&lt;/iframe&gt;</textarea></label></div>`, foot: `<button class="btn" id="lfm-c1">${ico('copy', 16)} Copy link</button><button class="btn" id="lfm-c2">${ico('copy', 16)} Copy embed</button><a class="btn primary" href="${esc(url)}" target="_blank" rel="noopener">${ico('eye', 16)} Preview</a>`, onMount(root) { $('#lfm-c1', root).onclick = () => copyText($('#lfm-u', root).value); $('#lfm-c2', root).onclick = () => copyText($('#lfm-e', root).value); } });
  }

  /* ======================= shared event binding (admin) ======================= */
  function bind(main) {
    $$('[data-renew]', main).forEach(b => b.onclick = () => renewal(b.dataset.renew));
    $$('[data-onb-start]', main).forEach(b => b.onclick = () => { startOnboarding(b.dataset.onbStart); toast('Onboarding checklist created'); refresh(); });
    $$('[data-pres]', main).forEach(b => b.onclick = () => present(b.dataset.pres));
    $$('[data-rule]', main).forEach(b => b.onchange = () => { const s = DB().settings; s.alerts = Object.assign(rules(), { [b.dataset.rule]: b.checked }); Store.save(); toast('Automation updated'); });
    $$('[data-wa-checkin]', main).forEach(b => b.onclick = () => { const t = DB().templates.find(x => x.name === 'Weekly wins'); Admin.useTemplate(t, b.dataset.waCheckin); });
  }

  w.Growth = { health, healthPill, healthTab, renewals, renewal, runAlerts, automationsHTML, dashboardCards, startOnboarding, onboardingTab, present, leadFormView, leadFormModal, bind };
})(window);
