/* ERM-Growth System — admin CRM */
(function (w) {
  const { $, $$, esc, fmtN, fmtFull, money, ico, PLAT, PKEYS, platIcon, clientLogo, modal, toast, copyText, addDays, todayISO, fmtDate, fmtDateY, uid, ago, diffDays } = U;
  const TODAY = todayISO();
  const refresh = () => document.dispatchEvent(new Event('erm:refresh'));
  const DB = () => Store.db;

  const NAV = [
    ['dashboard', 'Dashboard', 'grid', ['admin', 'team']], ['clients', 'Clients', 'users', ['admin', 'team']], ['leads', 'Leads & pipeline', 'target', ['admin', 'team']],
    ['tasks', 'Tasks & calendar', 'checksq', ['admin', 'team']], ['invoices', 'Invoices', 'dollar', ['admin']], ['proposals', 'Proposals', 'file', ['admin']],
    ['messages', 'Templates & comms', 'mail', ['admin', 'team']], ['reports', 'Reports', 'bars', ['admin', 'team']], ['settings', 'Settings', 'settings', ['admin']]
  ];
  const ROLE_PERMS = [['View all clients & portals', 1, 1, 0], ['Manage clients & leads', 1, 1, 0], ['Tasks & content calendar', 1, 1, 0], ['Generate & send reports', 1, 1, 0], ['Invoices & payments', 1, 0, 0], ['Proposals & contracts', 1, 0, 0], ['Settings, branding & team', 1, 0, 0], ['Own client portal only', 0, 0, 1]];

  const badge = (s, label) => `<span class="badge ${String(s).toLowerCase().replace(/\s+/g, '_')}">${esc(label || s)}</span>`;
  const head = (t, sub, actions = '') => `<div class="page-h"><div><h1>${t}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div><div class="actions">${actions}</div></div>`;
  const userName = id => (DB().team.find(u => u.id === id) || { name: 'Unassigned' }).name;
  const cName = id => (Store.client(id) || { name: '—' }).name;
  const usd = (n, cur) => Store.toUSD(n, cur);
  const empty = (t, s) => `<div class="empty glass"><div class="e-ico">${ico('image', 26)}</div><b>${t}</b><p class="muted">${s}</p></div>`;
  const tile = (label, val, sub, icon, key, fmt) => `<div class="glass tile"><div class="tile-h"><span class="ti">${ico(icon, 16)}</span>${label}</div><div class="tile-v">${key ? `<span class="count" data-count="${val}" data-fmt="${fmt || 'full'}" ${fmt === 'money' ? 'data-cur="USD"' : ''}>0</span>` : val}</div><div class="muted sm">${sub}</div></div>`;

  /* ---------- generic form modal ---------- */
  function fieldHTML(f) {
    const v = f.value ?? '', req = f.required ? 'required' : '';
    if (f.type === 'select') return `<label>${f.label}<select name="${f.name}" ${req}>${f.options.map(([val, l]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    if (f.type === 'textarea') return `<label>${f.label}<textarea name="${f.name}" rows="${f.rows || 3}" ${req}>${esc(v)}</textarea></label>`;
    return `<label>${f.label}<input name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" ${f.step ? `step="${f.step}"` : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} ${req}></label>`;
  }
  function formModal({ title, fields, submit = 'Save', onSubmit, extra = '' }) {
    return modal({ title, body: `<form class="form" id="fm">${fields.map(fieldHTML).join('')}${extra}</form>`, foot: `<button class="btn primary" form="fm">${submit}</button>`, onMount(root, close) { $('#fm', root).onsubmit = e => { e.preventDefault(); if (onSubmit(Object.fromEntries(new FormData(e.target))) !== false) close(); }; } });
  }
  const clientOpts = (blank) => (blank ? [['', '— none —']] : []).concat(DB().clients.map(c => [c.id, c.name]));

  /* ======================= DASHBOARD ======================= */
  function dashboard() {
    const D = DB(), act = D.clients.filter(c => c.status === 'Active');
    const leads = D.leads.filter(l => !['Won', 'Lost'].includes(l.stage)), pipe = leads.reduce((a, l) => a + usd(l.value, l.currency), 0);
    const from = addDays(TODAY, -29), tot = D.clients.map(c => ({ c, q: Metrics.query(c.id, { from, to: TODAY }) }));
    const views = tot.reduce((a, x) => a + x.q.totals.views, 0), pv = tot.reduce((a, x) => a + x.q.prev.totals.views, 0);
    const due = D.tasks.filter(t => t.status !== 'done' && t.due <= addDays(TODAY, 7)), overdue = due.filter(t => t.due < TODAY);
    // revenue last 6 months (paid, USD)
    const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push({ key: U.iso(d).slice(0, 7), label: U.MON[d.getMonth()], value: 0 }); }
    D.invoices.filter(i => i.status === 'paid').forEach(i => { const m = months.find(m => m.key === i.issued.slice(0, 7)); if (m) m.value += usd(i.amount, i.currency); });
    const topC = [...tot].sort((a, b) => b.q.totals.views - a.q.totals.views).slice(0, 5), mx = topC[0] ? topC[0].q.totals.views : 1;
    const stages = ['New', 'Contacted', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
    const mrr = Store.mrrUSD();
    return `${head('Good ' + (new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening') + ', <span class="grad">ERM</span> 👋', 'Here\'s how the agency is performing today.', `<button class="btn primary" data-go="#/admin/clients">${ico('plus', 16)} New client</button>`)}
    <div class="grid tiles5">${tile('Active clients', act.length, `${D.clients.length} total · ${D.clients.filter(c => c.status === 'Paused').length} paused`, 'users', 1)}${tile('MRR', Math.round(mrr), `≈ ${money(mrr * D.settings.zarRate, 'ZAR')} · USD + ZAR retainers`, 'dollar', 1, 'money')}${tile('Active leads', leads.length, `Pipeline ${money(pipe)} (USD eq.)`, 'target', 1)}${tile('Views · all clients', views, `<span class="gchip ${views >= pv ? 'up' : 'dn'}">${ico(views >= pv ? 'up' : 'down', 12)}${Math.abs((views - pv) / (pv || 1) * 100).toFixed(1)}%</span> last 30 days`, 'eye', 1, 'k')}${tile('Tasks due (7d)', due.length, `${overdue.length} overdue`, 'checksq', 1)}</div>
    <div class="grid charts"><div class="glass card span2"><div class="card-h"><h3>Revenue — paid invoices</h3><small class="muted">USD equivalent @ R${D.settings.zarRate}/$</small></div><div class="chart-wrap">${U.barChart({ items: months, height: 230, fmt: v => money(v) })}</div></div>
      <div class="glass card"><div class="card-h"><h3>Pipeline</h3></div><div class="funnel">${stages.map(s => { const n = D.leads.filter(l => l.stage === s).length; return `<div class="fn" data-go="#/admin/leads"><span>${s}</span><div class="bar sm"><i style="width:${n / (D.leads.length || 1) * 100}%"></i></div><b>${n}</b></div>`; }).join('')}</div></div>
      <div class="glass card"><div class="card-h"><h3>Views by client · 30d</h3></div><div class="rank-list">${topC.map(x => `<a href="#/admin/client/${x.c.id}" class="rk">${clientLogo(x.c, 30)}<div><b>${esc(x.c.name)}</b><div class="bar sm"><i style="width:${x.q.totals.views / mx * 100}%;background:linear-gradient(90deg,${x.c.color},${x.c.color2})"></i></div></div><span>${fmtN(x.q.totals.views)}</span></a>`).join('')}</div></div>
      <div class="glass card"><div class="card-h"><h3>Tasks due</h3><a class="more" href="#/admin/tasks">All ${ico('chev', 14)}</a></div>${due.length ? due.sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6).map(t => `<div class="li"><div><b>${esc(t.title)}</b><small class="muted">${cName(t.cid)} · ${userName(t.assignee)}</small></div><span class="${t.due < TODAY ? 'dn' : 'muted'} sm">${t.due < TODAY ? 'Overdue ' : ''}${fmtDate(t.due)}</span></div>`).join('') : '<p class="muted">Nothing due. 🎉</p>'}</div>
      <div class="glass card"><div class="card-h"><h3>Recent activity</h3></div><div class="tl">${D.timeline.slice(0, 6).map(e => `<div class="tl-i"><span class="tl-d">${ico(e.icon || 'zap', 14)}</span><div><b>${esc(e.text)}</b><small class="muted">${cName(e.cid)} · ${ago(e.ts)}</small></div></div>`).join('')}</div></div></div>`;
  }

  /* ======================= CLIENTS ======================= */
  let cFilter = 'All';
  function clients() {
    const D = DB(), list = D.clients.filter(c => cFilter === 'All' || c.status === cFilter);
    return `${head('Clients', `${D.clients.length} clients`, `<button class="btn primary" id="add-client">${ico('plus', 16)} New client</button>`)}
    <div class="seg" id="cf">${['All', 'Lead', 'Active', 'Paused', 'Churned'].map(s => `<button class="${cFilter === s ? 'on' : ''}" data-f="${s}">${s}</button>`).join('')}</div>
    <div class="grid cl-grid">${list.map(c => { const q = Metrics.query(c.id, { from: addDays(TODAY, -29), to: TODAY }), g = q.growth('views');
      return `<div class="glass ccard" style="--b1:${c.color};--b2:${c.color2}"><a href="#/admin/client/${c.id}" class="cc-top">${clientLogo(c, 48)}<div><b>${esc(c.name)}</b><small class="muted">${esc(c.industry)} · ${c.country === 'ZA' ? '🇿🇦' : '🇺🇸'} ${c.currency}</small></div>${badge(c.status)}</a>
      <div class="cc-stats"><div><b>${fmtN(q.totals.views)}</b><span>views · 30d</span></div><div><b class="${g >= 0 ? 'up' : 'dn'}">${g >= 0 ? '+' : ''}${g.toFixed(0)}%</b><span>growth</span></div><div><b>${money(c.retainer, c.currency)}</b><span>${esc(c.pkg)} /mo</span></div></div>
      <div class="cc-act"><a class="btn sm" href="#/admin/client/${c.id}">Open</a><button class="btn sm" data-view="${c.id}">${ico('eye', 14)} Portal</button><button class="btn sm primary" data-rep="${c.id}">${ico('file', 14)} Report</button></div></div>`; }).join('') || empty('No clients here', 'Change the filter or add a client.')}</div>`;
  }
  function clientForm(c) {
    const isNew = !c;
    c = c || { name: '', industry: '', country: 'US', currency: 'USD', contact: { name: '', email: '', phone: '' }, pkg: 'Starter', retainer: 0, status: 'Active', start: TODAY, end: addDays(TODAY, 365) };
    formModal({
      title: isNew ? 'New client' : 'Edit client', submit: isNew ? 'Create client' : 'Save', fields: [
        { name: 'name', label: 'Business name', value: c.name, required: 1 }, { name: 'industry', label: 'Industry', value: c.industry },
        { name: 'cname', label: 'Contact name', value: c.contact.name, required: 1 }, { name: 'email', label: 'Contact email', type: 'email', value: c.contact.email, required: 1 }, { name: 'phone', label: 'Phone / WhatsApp', value: c.contact.phone },
        { name: 'country', label: 'Country', type: 'select', value: c.country, options: [['US', 'United States'], ['ZA', 'South Africa']] }, { name: 'currency', label: 'Billing currency', type: 'select', value: c.currency, options: [['USD', 'USD ($)'], ['ZAR', 'ZAR (R)']] },
        { name: 'pkg', label: 'Package', type: 'select', value: c.pkg, options: [['Starter', 'Starter'], ['Growth', 'Growth'], ['Scale', 'Scale'], ['Custom', 'Custom']] }, { name: 'retainer', label: 'Monthly retainer', type: 'number', value: c.retainer },
        { name: 'status', label: 'Status', type: 'select', value: c.status, options: ['Lead', 'Active', 'Paused', 'Churned'].map(s => [s, s]) }, { name: 'start', label: 'Contract start', type: 'date', value: c.start }, { name: 'end', label: 'Contract end', type: 'date', value: c.end },
        ...(isNew ? [{ name: 'color', label: 'Brand colour', type: 'color', value: 'var(--c1)' }] : [{ name: 'color', label: 'Brand colour', type: 'color', value: c.color }, { name: 'logoUrl', label: 'Logo URL (optional)', value: c.logoUrl || '' }])
      ], onSubmit(d) {
        const patch = { name: d.name, industry: d.industry, country: d.country, currency: d.currency, pkg: d.pkg, retainer: +d.retainer || 0, status: d.status, start: d.start, end: d.end, color: d.color, contact: { name: d.cname, email: d.email, phone: d.phone } };
        if (isNew) { const n = Store.addClient({ ...patch, id: uid('c'), color2: '#1fa2b8', login: { email: d.email, password: 'demo123' } }); Store.log(n.id, 'Client created', 'userplus'); toast('Client created — login: ' + d.email + ' / demo123'); location.hash = '#/admin/client/' + n.id; }
        else { Object.assign(c, patch, { logoUrl: d.logoUrl || '' }); c.login = { ...c.login, email: d.email }; Store.save(); Store.log(c.id, 'Profile updated', 'edit'); toast('Saved'); refresh(); }
      }
    });
  }

  const CTABS = [['overview', 'Overview'], ['performance', 'Performance'], ['accounts', 'Social accounts'], ['content', 'Content'], ['billing', 'Billing'], ['comms', 'Communication'], ['timeline', 'Timeline'], ['notes', 'Notes']];
  function clientDetail(id, tab = 'overview') {
    const c = Store.client(id); if (!c) return empty('Client not found', '<a href="#/admin/clients">Back to clients</a>');
    const D = DB();
    let body = '';
    const q = Metrics.query(id, { from: addDays(TODAY, -29), to: TODAY }), T = q.totals;
    if (tab === 'overview') {
      const daysLeft = diffDays(TODAY, c.end);
      body = `<div class="grid charts"><div class="glass card"><div class="card-h"><h3>Profile</h3><button class="btn sm" id="edit-c">${ico('edit', 14)} Edit</button></div><dl class="dl"><dt>Contact</dt><dd>${esc(c.contact.name)}</dd><dt>Email</dt><dd><a href="mailto:${esc(c.contact.email)}">${esc(c.contact.email)}</a></dd><dt>Phone</dt><dd><a href="https://wa.me/${c.contact.phone.replace(/\D/g, '')}" target="_blank" rel="noopener">${esc(c.contact.phone)}</a></dd><dt>Package</dt><dd>${esc(c.pkg)} · ${money(c.retainer, c.currency)}/mo</dd><dt>Contract</dt><dd>${fmtDateY(c.start)} → ${fmtDateY(c.end)} <small class="${daysLeft < 60 ? 'warn' : 'muted'}">(${daysLeft > 0 ? daysLeft + ' days left' : 'expired'})</small></dd><dt>Portal login</dt><dd><code>${esc(c.login?.email || c.contact.email)}</code> · <code>demo123</code></dd></dl></div>
      <div class="glass card span2"><div class="card-h"><h3>Last 30 days</h3><button class="btn sm primary" data-rep="${id}">${ico('file', 14)} Generate report</button></div><div class="mini-kpis"><div><b>${fmtN(T.views)}</b><span>Views</span></div><div><b>${T.engagement.toFixed(1)}%</b><span>Engagement</span></div><div><b>+${fmtFull(T.followers)}</b><span>Followers</span></div><div><b>${fmtN(T.reach)}</b><span>Reach</span></div></div><div class="chart-wrap">${U.lineChart({ series: [{ name: 'Views', color: 'var(--c1)', data: q.daily.map(d => d.views) }], labels: q.daily.map(d => fmtDate(d.d)), height: 210 })}</div></div>
      <div class="glass card"><div class="card-h"><h3>Upcoming content</h3></div>${D.content.filter(k => k.cid === id && k.status !== 'posted').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4).map(k => `<div class="li"><div><b>${esc(k.title)}</b><small class="muted">${PLAT[k.platform].name} · ${fmtDate(k.date)}</small></div>${badge(k.status)}</div>`).join('') || '<p class="muted">Nothing scheduled.</p>'}</div>
      <div class="glass card span2"><div class="card-h"><h3>Latest activity</h3></div><div class="tl">${tl(id, 4)}</div></div></div>`;
    }
    if (tab === 'performance') body = `<div class="glass note">${ico('eye', 18)}<div><b>This is exactly what ${esc(c.name)} sees.</b><p class="muted">Present it live in meetings.</p></div><button class="btn primary" data-view="${id}">Open full client portal</button></div><div class="grid plat-grid">${Metrics.connected(id).map(p => `<div class="glass pcard" style="--pc:${PLAT[p].color}"><div class="pc-h">${platIcon(p, 34)}<div><b>${PLAT[p].name}</b><small>${esc(c.accounts[p])}</small></div></div><div class="pc-v">${fmtN(q.byPlatform[p].views)}</div><div class="pc-f"><span class="gchip ${q.pgrowth(p, 'views') >= 0 ? 'up' : 'dn'}">${ico(q.pgrowth(p, 'views') >= 0 ? 'up' : 'down', 12)}${Math.abs(q.pgrowth(p, 'views')).toFixed(1)}%</span><span class="muted">${q.byPlatform[p].engagement.toFixed(1)}% eng.</span></div></div>`).join('')}</div><div class="glass card"><div class="chart-wrap">${U.lineChart({ series: [{ name: 'This period', color: 'var(--c1)', data: q.daily.map(d => d.views) }, { name: 'Previous', color: 'rgba(128,140,170,.9)', dashed: true, data: q.prev.daily.map(d => d.views) }], labels: q.daily.map(d => fmtDate(d.d)), height: 280 })}</div></div>`;
    if (tab === 'accounts') body = accountsTab(c);
    if (tab === 'content') body = `<div class="actions"><button class="btn primary" id="add-content">${ico('plus', 16)} Plan content</button></div><div class="glass tbl-wrap"><table class="tbl"><tr><th>Title</th><th>Platform</th><th>Date</th><th>Status</th><th>Client approval</th></tr>${D.content.filter(k => k.cid === id).sort((a, b) => b.date.localeCompare(a.date)).map(k => `<tr><td><b>${esc(k.title)}</b></td><td>${platIcon(k.platform, 22)}</td><td>${fmtDate(k.date)}</td><td>${badge(k.status)}</td><td>${k.approval ? badge(k.approval, { pending: 'Pending', changes: 'Changes asked', approved: 'Approved' }[k.approval]) : '<span class="muted">—</span>'}</td></tr>`).join('')}</table></div>`;
    if (tab === 'billing') body = `<div class="actions"><button class="btn primary" id="add-inv" data-cid="${id}">${ico('plus', 16)} New invoice</button></div>${invoiceTable(D.invoices.filter(i => i.cid === id))}`;
    if (tab === 'comms') body = `<div class="actions"><button class="btn primary" id="log-comm">${ico('plus', 16)} Log communication</button><button class="btn" id="send-tpl">${ico('send', 16)} Send from template</button></div><div class="glass card">${D.comms.filter(m => m.cid === id).sort((a, b) => b.date.localeCompare(a.date)).map(commRow).join('') || '<p class="muted">No communication logged yet.</p>'}</div>`;
    if (tab === 'timeline') body = `<div class="glass card"><div class="tl">${tl(id, 50)}</div></div>`;
    if (tab === 'notes') body = `<div class="glass card"><label class="lbl">Private notes (never shown to client)</label><textarea id="notes" rows="10" class="full">${esc(c.notes || '')}</textarea><button class="btn primary" id="save-notes">Save notes</button></div>`;
    return `<a href="#/admin/clients" class="back">${ico('chev', 14)} Clients</a><div class="cd-head glass" style="--b1:${c.color};--b2:${c.color2}">${clientLogo(c, 64)}<div class="cd-t"><h1>${esc(c.name)}</h1><p class="muted">${esc(c.industry)} · ${esc(c.contact.name)}</p></div><select id="c-status" class="sel">${['Lead', 'Active', 'Paused', 'Churned'].map(s => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}</select><button class="btn" data-view="${id}">${ico('eye', 16)} View portal</button><button class="btn primary" data-rep="${id}">${ico('file', 16)} Generate report</button></div>
    <div class="tabs">${CTABS.map(([k, l]) => `<a href="#/admin/client/${id}/${k}" class="${tab === k ? 'on' : ''}">${l}</a>`).join('')}</div><div class="view">${body}</div>`;
  }
  const tl = (cid, n) => DB().timeline.filter(e => e.cid === cid).slice(0, n).map(e => `<div class="tl-i"><span class="tl-d">${ico(e.icon || 'zap', 14)}</span><div><b>${esc(e.text)}</b><small class="muted">${ago(e.ts)}</small></div></div>`).join('') || '<p class="muted">No activity yet.</p>';
  const commRow = m => `<div class="li"><div><b>${ico({ email: 'mail', whatsapp: 'comment', call: 'phone', meeting: 'users' }[m.channel] || 'mail', 14)} ${esc(m.subject)}</b><small class="muted">${m.dir === 'in' ? 'Received' : 'Sent'} · ${m.channel} · ${userName(m.by)}</small></div><span class="muted sm">${fmtDate(m.date)}</span></div>`;

  /* ---------- API availability notes (shown in accounts tab + settings) ---------- */
  const API = {
    tiktok: { api: 'TikTok Display API / Login Kit (+ Business API for ads)', ok: 'Per-video views, likes, comments, shares; account followers, total likes, video count.', no: 'Saves, watch time, reach, audience & best-time data are NOT in the public Display API. Requires TikTok app review.', scopes: 'user.info.basic, user.info.stats, video.list' },
    instagram: { api: 'Instagram Graph API (Business/Creator account linked to a Facebook Page)', ok: 'Reach, views, likes, comments, shares, saves, follows, profile visits, Reels watch time, online-followers (best times), demographics.', no: 'Many account insights only look back ~30 days — snapshot daily to keep history. Personal accounts are not supported. Needs Meta App Review.', scopes: 'instagram_basic, instagram_manage_insights, pages_show_list' },
    facebook: { api: 'Facebook Pages API (Graph API)', ok: 'Page & post reach/views, reactions, comments, shares, video views & watch time, followers/fans.', no: 'No “saves” metric. Meta is consolidating impressions-style metrics into “views”, so verify the live metric list before building. Needs Meta App Review.', scopes: 'pages_read_engagement, read_insights, pages_show_list' },
    youtube: { api: 'YouTube Data API v3 + YouTube Analytics API (OAuth)', ok: 'Views, watch time, avg view duration, likes, comments, shares, subscribers gained, traffic sources, demographics; Shorts can be isolated with the creatorContentType dimension.', no: 'No “saves”; no true “reach” for Shorts (views is the closest). “Best time” isn\'t provided — derive it from your own post timestamps vs. views. Shorts view counting changed in 2025, so confirm vs. Studio.', scopes: 'youtube.readonly, yt-analytics.readonly' }
  };
  function accountsTab(c) {
    return `<div class="stack">${PKEYS.map(p => { const on = !!c.accounts[p], a = API[p]; return `<div class="glass acct"><div class="acct-h">${platIcon(p, 40)}<div><b>${PLAT[p].name}</b><small class="muted">${on ? esc(c.accounts[p]) : 'Not connected'}</small></div>${on ? `<span class="badge active">Sample data</span><button class="btn sm" data-disc="${p}">Disconnect</button>` : ''}<button class="btn sm ${on ? '' : 'primary'}" data-oauth="${p}">${ico('link', 14)} ${on ? 'Reconnect' : 'Connect with OAuth'}</button></div><details><summary>What the API allows</summary><p><b>${esc(a.api)}</b></p><p class="ok">✔ ${esc(a.ok)}</p><p class="no">✖ ${esc(a.no)}</p><p class="muted sm">Scopes: ${esc(a.scopes)}</p></details></div>`; }).join('')}</div>`;
  }
  function oauthModal(c, p, onDone) {
    const a = API[p];
    modal({
      title: `Connect ${PLAT[p].name} — ${esc(c.name)}`, body: `<div class="oauth">${platIcon(p, 56)}<p><b>Phase 1 demo:</b> this simulates the OAuth hand-off. In Phase 2 this button redirects the client to ${PLAT[p].name}'s consent screen, then your backend stores the encrypted refresh token and starts daily snapshots.</p><p class="muted sm">Requested scopes: ${esc(a.scopes)}</p><div class="form"><label>Account handle (demo)<input id="oa-h" value="${esc(c.accounts[p] || '@' + c.name.toLowerCase().replace(/[^a-z0-9]/g, ''))}"></label></div></div>`,
      foot: `<button class="btn primary" id="oa-go">${ico('shield', 16)} Authorize (demo)</button>`, onMount(root, close) { $('#oa-go', root).onclick = () => { c.accounts[p] = $('#oa-h', root).value.trim() || '@' + p; Store.rebuildMetrics(c); Store.save(); Store.log(c.id, `${PLAT[p].name} connected`, 'link'); toast(PLAT[p].name + ' connected (sample data)'); close(); onDone(); }; }
    });
  }

  /* ======================= LEADS ======================= */
  const STAGES = ['New', 'Contacted', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
  const SOURCES = ['Instagram DM', 'TikTok', 'Website', 'Referral', 'Cold outreach', 'WhatsApp', 'Event'];
  function leads() {
    const D = DB();
    return `${head('Leads & sales pipeline', `Open pipeline: ${money(D.leads.filter(l => !['Won', 'Lost'].includes(l.stage)).reduce((a, l) => a + usd(l.value, l.currency), 0))} (USD eq.)`, `<button class="btn primary" id="add-lead">${ico('plus', 16)} New lead</button>`)}
    <div class="kanban">${STAGES.map(s => { const items = D.leads.filter(l => l.stage === s), v = items.reduce((a, l) => a + usd(l.value, l.currency), 0);
      return `<div class="kcol ${s.replace(/\s/g, '_').toLowerCase()}" data-stage="${s}"><div class="kh"><b>${s}</b><span>${items.length}</span><small>${money(v)}</small></div><div class="kbody">${items.map(l => `<div class="glass kcard" draggable="true" data-id="${l.id}"><b>${esc(l.name)}</b><small class="muted">${esc(l.contact)} · ${esc(l.source)}</small><div class="kf"><span>${money(l.value, l.currency)}</span><span class="${l.follow < TODAY && !['Won', 'Lost'].includes(s) ? 'dn' : 'muted'}">${ico('clock', 12)} ${fmtDate(l.follow)}</span></div></div>`).join('')}</div></div>`; }).join('')}</div><p class="hint">Drag cards between columns — or tap a card to move it, edit it, or convert it to a client.</p>`;
  }
  function leadForm(l) {
    const isNew = !l; l = l || { name: '', contact: '', email: '', phone: '', stage: 'New', source: 'Instagram DM', value: 0, currency: 'USD', follow: addDays(TODAY, 2), notes: '' };
    formModal({
      title: isNew ? 'New lead' : esc(l.name), submit: isNew ? 'Add lead' : 'Save', fields: [
        { name: 'name', label: 'Business', value: l.name, required: 1 }, { name: 'contact', label: 'Contact person', value: l.contact }, { name: 'email', label: 'Email', type: 'email', value: l.email }, { name: 'phone', label: 'Phone / WhatsApp', value: l.phone },
        { name: 'stage', label: 'Stage', type: 'select', value: l.stage, options: STAGES.map(s => [s, s]) }, { name: 'source', label: 'Lead source', type: 'select', value: l.source, options: SOURCES.map(s => [s, s]) },
        { name: 'value', label: 'Monthly value', type: 'number', value: l.value }, { name: 'currency', label: 'Currency', type: 'select', value: l.currency, options: [['USD', 'USD'], ['ZAR', 'ZAR']] }, { name: 'follow', label: 'Follow-up date', type: 'date', value: l.follow }, { name: 'notes', label: 'Notes', type: 'textarea', value: l.notes }
      ], extra: isNew ? '' : `<div class="actions between"><button type="button" class="btn primary" id="convert">${ico('userplus', 16)} Convert to client</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${l.phone.replace(/\D/g, '')}">${ico('comment', 16)} WhatsApp</a><button type="button" class="btn danger" id="del-lead">${ico('trash', 16)}</button></div>`,
      onSubmit(d) { d.value = +d.value || 0; if (isNew) { Store.add('leads', d); Store.notify('New lead: ' + d.name, 'target'); } else { Object.assign(l, d); Store.save(); } toast('Lead saved'); refresh(); }
    });
    if (!isNew) setTimeout(() => {
      const cv = $('#convert'); if (cv) cv.onclick = () => { convertLead(l); $$('.modal-wrap').forEach(m => m.close && m.close()); };
      const dl = $('#del-lead'); if (dl) dl.onclick = () => { Store.remove('leads', l.id); toast('Lead deleted'); $$('.modal-wrap').forEach(m => m.close && m.close()); refresh(); };
    }, 60);
  }
  function convertLead(l) {
    const pal = [['#22d3ee', '#6366f1'], ['#f59e0b', '#ef4444'], ['#34d399', '#0ea5e9'], ['#38bdf8', '#2563eb']][Math.floor(Math.random() * 4)];
    const n = Store.addClient({ id: uid('c'), name: l.name, color: pal[0], color2: pal[1], country: l.currency === 'ZAR' ? 'ZA' : 'US', currency: l.currency, industry: 'New client', contact: { name: l.contact, email: l.email, phone: l.phone }, pkg: l.value >= (l.currency === 'ZAR' ? 20000 : 2000) ? 'Scale' : l.value >= (l.currency === 'ZAR' ? 14000 : 1400) ? 'Growth' : 'Starter', retainer: l.value, status: 'Active', start: TODAY, end: addDays(TODAY, 365), login: { email: l.email, password: 'demo123' } });
    l.stage = 'Won'; Store.save(); Store.log(n.id, 'Converted from lead 🎉', 'userplus'); Store.notify(`${l.name} converted to a client`, 'userplus'); toast(`${l.name} is now a client`); location.hash = '#/admin/client/' + n.id;
  }

  /* ======================= TASKS & CALENDAR ======================= */
  let tview = 'tasks', calMonth = TODAY.slice(0, 7), tAssignee = 'all';
  function tasks() {
    const D = DB();
    const tabs = `<div class="seg"><button class="${tview === 'tasks' ? 'on' : ''}" data-tv="tasks">Tasks</button><button class="${tview === 'cal' ? 'on' : ''}" data-tv="cal">Content calendar</button></div>`;
    if (tview === 'tasks') {
      const list = D.tasks.filter(t => tAssignee === 'all' || t.assignee === tAssignee);
      const col = (s, label) => `<div class="tcol"><h3>${label} <span>${list.filter(t => t.status === s).length}</span></h3>${list.filter(t => t.status === s).sort((a, b) => a.due.localeCompare(b.due)).map(t => `<div class="glass task ${t.status}"><label class="chk"><input type="checkbox" data-done="${t.id}" ${t.status === 'done' ? 'checked' : ''}><i></i></label><div><b>${esc(t.title)}</b><small class="muted">${cName(t.cid)} · ${userName(t.assignee)}</small></div><div class="tmeta"><span class="pri ${t.priority}">${t.priority}</span><span class="${t.due < TODAY && t.status !== 'done' ? 'dn' : 'muted'} sm">${fmtDate(t.due)}</span>${t.status !== 'done' ? `<button class="icon-btn" data-adv="${t.id}" title="Move forward">${ico('chev', 14)}</button>` : ''}</div></div>`).join('') || '<p class="muted sm">Nothing here</p>'}</div>`;
      return `${head('Tasks & content calendar', '', `${tabs}<button class="btn primary" id="add-task">${ico('plus', 16)} New task</button>`)}<div class="seg sm" id="t-as"><button class="${tAssignee === 'all' ? 'on' : ''}" data-a="all">Everyone</button>${D.team.filter(u => u.role !== 'client').map(u => `<button class="${tAssignee === u.id ? 'on' : ''}" data-a="${u.id}">${esc(u.name.split(' ')[0])}</button>`).join('')}</div><div class="tboard">${col('todo', 'To do')}${col('doing', 'In progress')}${col('done', 'Done')}</div>`;
    }
    // calendar
    const [y, m] = calMonth.split('-').map(Number), first = new Date(y, m - 1, 1), dim = new Date(y, m, 0).getDate(), pad = first.getDay();
    const items = D.content.filter(k => k.date.startsWith(calMonth)), cells = [];
    for (let i = 0; i < pad; i++) cells.push('<div class="cd off"></div>');
    for (let d = 1; d <= dim; d++) { const ds = `${calMonth}-${String(d).padStart(2, '0')}`; cells.push(`<div class="cd ${ds === TODAY ? 'today' : ''}" data-day="${ds}"><span>${d}</span>${items.filter(k => k.date === ds).map(k => `<div class="ci ${k.status}" data-k="${k.id}" title="${esc(k.title)}">${platIcon(k.platform, 14)}<em>${esc(k.title)}</em></div>`).join('')}</div>`); }
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    return `${head('Tasks & content calendar', '', `${tabs}<button class="btn primary" id="add-content">${ico('plus', 16)} Plan content</button>`)}
    <div class="cal-h"><button class="icon-btn" data-cm="-1">${ico('chev', 18, 'flip')}</button><h3>${U.MON[m - 1]} ${y}</h3><button class="icon-btn" data-cm="1">${ico('chev', 18)}</button><div class="legend row">${['planned', 'in_progress', 'approved', 'posted'].map(s => `<span>${badge(s, s.replace('_', ' '))}</span>`).join('')}</div></div>
    <div class="cal glass">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<b class="dow">${d}</b>`).join('')}${cells.join('')}</div>
    <div class="agenda">${sorted.map(k => `<div class="glass li" data-k="${k.id}"><div><b>${esc(k.title)}</b><small class="muted">${cName(k.cid)} · ${PLAT[k.platform].name} · ${fmtDate(k.date)}</small></div>${badge(k.status, k.status.replace('_', ' '))}</div>`).join('') || empty('Nothing planned this month', 'Use “Plan content” to add posts.')}</div>`;
  }
  function taskForm() {
    const D = DB();
    formModal({ title: 'New task', submit: 'Add task', fields: [{ name: 'title', label: 'Task', required: 1 }, { name: 'cid', label: 'Client', type: 'select', options: clientOpts(1) }, { name: 'assignee', label: 'Assign to', type: 'select', options: D.team.filter(u => u.role !== 'client').map(u => [u.id, u.name]) }, { name: 'due', label: 'Due date', type: 'date', value: addDays(TODAY, 3) }, { name: 'priority', label: 'Priority', type: 'select', value: 'med', options: [['low', 'Low'], ['med', 'Medium'], ['high', 'High']] }], onSubmit(d) { Store.add('tasks', { ...d, status: 'todo' }); toast('Task added'); refresh(); } });
  }
  function contentForm(k, cid) {
    const isNew = !k; k = k || { cid: cid || DB().clients[0].id, title: '', platform: 'tiktok', date: addDays(TODAY, 3), status: 'planned', notes: '' };
    formModal({ title: isNew ? 'Plan content' : 'Content item', submit: 'Save', fields: [{ name: 'title', label: 'Title / idea', value: k.title, required: 1 }, { name: 'cid', label: 'Client', type: 'select', value: k.cid, options: clientOpts() }, { name: 'platform', label: 'Platform', type: 'select', value: k.platform, options: PKEYS.map(p => [p, PLAT[p].name]) }, { name: 'date', label: 'Publish date', type: 'date', value: k.date }, { name: 'status', label: 'Status', type: 'select', value: k.status, options: [['planned', 'Planned'], ['in_progress', 'In progress'], ['approved', 'Approved'], ['posted', 'Posted']] }, { name: 'notes', label: 'Notes', type: 'textarea', value: k.notes }],
      extra: `<label class="check"><input type="checkbox" name="needs" ${k.approval ? 'checked' : ''}><span>Send to client for approval</span></label>`,
      onSubmit(d) { const needs = d.needs; delete d.needs; if (isNew) { Store.add('content', { ...d, comments: [], approval: needs ? 'pending' : '' }); } else { Object.assign(k, d); if (needs && !k.approval) k.approval = 'pending'; Store.save(); } if (needs) Store.log(d.cid, `Content sent for approval: ${d.title}`, 'send'); toast('Saved'); refresh(); } });
  }

  /* ======================= INVOICES ======================= */
  function invoiceTable(list) {
    return `<div class="glass tbl-wrap"><table class="tbl"><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Issued</th><th>Due</th><th>Status</th><th></th></tr>${list.sort((a, b) => b.issued.localeCompare(a.issued)).map(i => `<tr><td><b>${i.no}</b>${i.recurring ? ` <small class="muted" title="Recurring ${i.recurring}">${ico('refresh', 11)}</small>` : ''}<small class="muted block">${esc(i.desc)}</small></td><td>${esc(cName(i.cid))}</td><td><b>${money(i.amount, i.currency)}</b></td><td>${fmtDate(i.issued)}</td><td>${fmtDate(i.due)}</td><td>${badge(i.status)}</td><td class="ra"><button class="btn sm" data-inv="${i.id}">View</button>${i.status !== 'paid' ? `<button class="btn sm primary" data-paid="${i.id}">Mark paid</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No invoices yet.</td></tr>'}</table></div>`;
  }
  function invoices() {
    const D = DB(), sum = (st, cur) => D.invoices.filter(i => st.includes(i.status) && i.currency === cur).reduce((a, i) => a + i.amount, 0);
    const mkey = TODAY.slice(0, 7), paidM = cur => D.invoices.filter(i => i.status === 'paid' && i.currency === cur && i.issued.startsWith(mkey)).reduce((a, i) => a + i.amount, 0);
    const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push({ key: U.iso(d).slice(0, 7), label: U.MON[d.getMonth()], usd: 0, zar: 0 }); }
    D.invoices.filter(i => i.status === 'paid').forEach(i => { const m = months.find(m => m.key === i.issued.slice(0, 7)); if (m) m[i.currency.toLowerCase()] += i.amount; });
    return `${head('Invoices & payments', 'Multi-currency: USD & ZAR', `<button class="btn" id="gen-rec">${ico('refresh', 16)} Generate this month's retainers</button><button class="btn primary" id="add-inv">${ico('plus', 16)} New invoice</button>`)}
    <div class="grid tiles4">${tile('Outstanding (USD)', money(sum(['sent'], 'USD'), 'USD'), `${D.invoices.filter(i => i.status === 'sent' && i.currency === 'USD').length} invoices`, 'dollar')}${tile('Outstanding (ZAR)', money(sum(['sent'], 'ZAR'), 'ZAR'), `${D.invoices.filter(i => i.status === 'sent' && i.currency === 'ZAR').length} invoices`, 'dollar')}${tile('Overdue', money(sum(['overdue'], 'USD'), 'USD') + ' + ' + money(sum(['overdue'], 'ZAR'), 'ZAR'), `${D.invoices.filter(i => i.status === 'overdue').length} invoices need chasing`, 'bell')}${tile('Collected this month', money(paidM('USD'), 'USD') + ' + ' + money(paidM('ZAR'), 'ZAR'), 'paid invoices', 'check')}</div>
    <div class="grid charts"><div class="glass card span2"><div class="card-h"><h3>Revenue by month</h3><small class="muted">Paid invoices, USD equivalent</small></div><div class="chart-wrap">${U.barChart({ items: months.map(m => ({ label: m.label, value: m.usd + m.zar / D.settings.zarRate })), height: 230, fmt: v => money(v) })}</div></div>
    <div class="glass card"><div class="card-h"><h3>By currency · 6 mo</h3></div><div class="legend"><div><i style="background:#4a86f2"></i>USD billed<b>${money(months.reduce((a, m) => a + m.usd, 0), 'USD')}</b></div><div><i style="background:#f59e0b"></i>ZAR billed<b>${money(months.reduce((a, m) => a + m.zar, 0), 'ZAR')}</b></div><div><i style="background:#34d399"></i>Exchange rate<b>R${D.settings.zarRate}</b></div></div></div></div>${invoiceTable(D.invoices)}`;
  }
  function invoiceForm(cid) {
    const D = DB();
    formModal({ title: 'New invoice', submit: 'Create invoice', fields: [{ name: 'cid', label: 'Client', type: 'select', value: cid || D.clients[0].id, options: clientOpts() }, { name: 'desc', label: 'Description', value: 'Monthly retainer', required: 1 }, { name: 'amount', label: 'Amount', type: 'number', required: 1 }, { name: 'due', label: 'Due date', type: 'date', value: addDays(TODAY, 14) }, { name: 'status', label: 'Status', type: 'select', value: 'sent', options: [['draft', 'Draft'], ['sent', 'Sent']] }, { name: 'recurring', label: 'Recurring', type: 'select', options: [['', 'One-off'], ['monthly', 'Monthly retainer']] }],
      onSubmit(d) { const c = Store.client(d.cid); Store.add('invoices', { ...d, amount: +d.amount, currency: c.currency, issued: TODAY, no: 'ERM-' + String(D.invoices.length + 1).padStart(4, '0') }); Store.log(d.cid, `Invoice created (${money(+d.amount, c.currency)})`, 'dollar'); toast('Invoice created'); refresh(); } });
  }
  function printHTML(el, name) {
    let pr = $('#print-root'); if (!pr) { pr = document.createElement('div'); pr.id = 'print-root'; document.body.appendChild(pr); }
    pr.innerHTML = ''; pr.appendChild(el.cloneNode(true)); const old = document.title; document.title = name; document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); document.title = old; pr.innerHTML = ''; removeEventListener('afterprint', done); }; addEventListener('afterprint', done); setTimeout(() => print(), 80);
  }
  function invoiceView(i) {
    const c = Store.client(i.cid), s = DB().settings;
    modal({ title: i.no, wide: true, body: `<div class="doc" id="inv-doc"><div class="doc-h"><div class="r-brand">${U.ermLogo(40)}<div><b>${esc(s.agency)}</b><small>${esc(s.tagline)}</small></div></div><div class="doc-r"><h2>INVOICE</h2><b>${i.no}</b><small>${badge(i.status)}</small></div></div><div class="doc-m"><div><small>Billed to</small><b>${esc(c.name)}</b>${esc(c.contact.name)}<br>${esc(c.contact.email)}</div><div><small>Issued</small><b>${fmtDateY(i.issued)}</b><small>Due</small><b>${fmtDateY(i.due)}</b></div></div><table class="tbl"><tr><th>Description</th><th class="ra">Amount</th></tr><tr><td>${esc(i.desc)}${i.recurring ? ' (recurring ' + i.recurring + ')' : ''}</td><td class="ra">${money(i.amount, i.currency)}</td></tr><tr><td class="ra"><b>Total due (${i.currency})</b></td><td class="ra"><b>${money(i.amount, i.currency)}</b></td></tr></table><p class="muted sm">Pay by EFT / card — payment links arrive with Stripe/PayFast in Phase 2. ${esc(s.email)}</p></div>`, foot: `<button class="btn" id="inv-pdf">${ico('download', 16)} PDF</button><button class="btn" id="inv-mail">${ico('mail', 16)} Email client</button>`, onMount(root) { $('#inv-pdf', root).onclick = () => printHTML($('#inv-doc', root), i.no); $('#inv-mail', root).onclick = () => { location.href = `mailto:${c.contact.email}?subject=${encodeURIComponent('Invoice ' + i.no)}&body=${encodeURIComponent(`Hi ${c.contact.name.split(' ')[0]},\n\nPlease find invoice ${i.no} for ${money(i.amount, i.currency)}, due ${fmtDateY(i.due)}.\n\nThanks,\n${s.agency}`)}`; Store.add('comms', { cid: c.id, channel: 'email', dir: 'out', subject: 'Invoice ' + i.no + ' sent', date: TODAY, by: 'u1' }); if (i.status === 'draft') { i.status = 'sent'; Store.save(); } }; } });
  }

  /* ======================= PROPOSALS ======================= */
  const PKGS = { 'Starter Package': { zar: 12500, usd: 700, items: ['12 short-form videos / month', '2 platforms managed', 'Monthly performance report', 'Live client dashboard'] }, 'Growth Package': { zar: 22000, usd: 1500, items: ['20 short-form videos / month', '3 platforms managed', 'Community management', 'Weekly strategy check-in', 'Live client dashboard'] }, 'Scale Package': { zar: 35000, usd: 2400, items: ['30+ videos / month', 'All 4 platforms', 'Automation (DM / lead flows)', 'Paid-boost management', 'Dedicated strategist'] }, Custom: { zar: 0, usd: 0, items: ['Scope agreed with client'] } };
  function proposals() {
    const D = DB();
    return `${head('Proposals & contracts', 'Templates, send and track', `<button class="btn primary" id="add-prop">${ico('plus', 16)} New proposal</button>`)}
    <div class="glass tbl-wrap"><table class="tbl"><tr><th>Proposal</th><th>Template</th><th>Value</th><th>Sent</th><th>Opens</th><th>Status</th><th></th></tr>${D.proposals.map(p => `<tr><td><b>${esc(p.title)}</b></td><td>${esc(p.template)}</td><td>${money(p.value, p.currency)}</td><td>${p.sent ? fmtDate(p.sent) : '—'}</td><td>${p.opens ? ico('eye', 13) + ' ' + p.opens : '—'}</td><td>${badge(p.status)}</td><td class="ra"><button class="btn sm" data-pv="${p.id}">Open</button></td></tr>`).join('')}</table></div>
    <h2 class="sec">Templates</h2><div class="grid plat-grid">${Object.entries(PKGS).map(([n, p]) => `<div class="glass pcard"><b>${n}</b><div class="pc-v sm">${p.usd ? money(p.usd) + ' / ' + money(p.zar, 'ZAR') : 'Custom'}</div><ul class="ul">${p.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>`;
  }
  function proposalForm() {
    const D = DB();
    formModal({ title: 'New proposal', submit: 'Create', fields: [{ name: 'lead', label: 'For lead', type: 'select', options: D.leads.filter(l => l.stage !== 'Lost').map(l => [l.id, l.name]) }, { name: 'template', label: 'Template', type: 'select', value: 'Growth Package', options: Object.keys(PKGS).map(k => [k, k]) }, { name: 'value', label: 'Monthly value (override)', type: 'number' }],
      onSubmit(d) { const l = D.leads.find(x => x.id === d.lead); const t = PKGS[d.template]; const val = +d.value || (l.currency === 'ZAR' ? t.zar : t.usd) || l.value; Store.add('proposals', { title: `${d.template} — ${l.name}`, lead: l.id, template: d.template, value: val, currency: l.currency, status: 'draft', sent: '', opens: 0 }); toast('Proposal drafted'); refresh(); } });
  }
  function proposalView(p) {
    const l = DB().leads.find(x => x.id === p.lead), t = PKGS[p.template] || PKGS.Custom, s = DB().settings;
    modal({ title: esc(p.title), wide: true, body: `<div class="doc" id="prop-doc"><div class="doc-h"><div class="r-brand">${U.ermLogo(40)}<div><b>${esc(s.agency)}</b><small>${esc(s.tagline)}</small></div></div><div class="doc-r"><h2>PROPOSAL</h2><small>Prepared for ${esc(l ? l.name : '')}</small></div></div><h4>What we'll do</h4><ul class="ul">${t.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul><h4>Investment</h4><p class="big">${money(p.value, p.currency)} <small>/ month</small></p><h4>Terms</h4><p class="muted">6-month minimum term, 30-day notice thereafter. Invoiced monthly in advance in ${p.currency}. Content approval via your live ERM dashboard.</p><div class="sig"><span>Client signature</span><span>ERM Marketing</span></div></div>`,
      foot: `<span class="muted">Status: ${badge(p.status)}</span><button class="btn" id="pp-pdf">${ico('download', 16)} PDF</button><button class="btn" id="pp-send">${ico('send', 16)} ${p.status === 'draft' ? 'Mark as sent' : 'Resend'}</button><button class="btn" id="pp-open">${ico('eye', 16)} Simulate client open</button><button class="btn primary" id="pp-ok">${ico('check', 16)} Mark accepted</button>`,
      onMount(root, close) { const set = (st, msg) => { p.status = st; if (st === 'sent' && !p.sent) p.sent = TODAY; Store.save(); toast(msg); close(); refresh(); };
        $('#pp-pdf', root).onclick = () => printHTML($('#prop-doc', root), p.title);
        $('#pp-send', root).onclick = () => { p.opens = p.opens || 0; set('sent', 'Marked as sent'); if (l) { l.stage = l.stage === 'New' || l.stage === 'Contacted' ? 'Proposal Sent' : l.stage; Store.save(); } };
        $('#pp-open', root).onclick = () => { p.opens++; if (p.status === 'sent') p.status = 'viewed'; Store.notify(`${l ? l.name : 'Client'} opened the proposal`, 'eye'); set(p.status, 'Open tracked (demo)'); };
        $('#pp-ok', root).onclick = () => { set('accepted', 'Accepted 🎉'); if (l && l.stage !== 'Won') { l.stage = 'Negotiation'; Store.save(); } }; }
    });
  }

  /* ======================= TEMPLATES & COMMS ======================= */
  function messagesPage() {
    const D = DB();
    return `${head('Templates & communication log', 'Email + WhatsApp templates, and a log of every touchpoint', `<button class="btn primary" id="add-tpl">${ico('plus', 16)} New template</button>`)}
    <div class="grid two"><div class="stack">${D.templates.map(t => `<div class="glass tpl"><div class="tpl-h"><span class="badge ${t.type === 'whatsapp' ? 'active' : 'sent'}">${t.type}</span><b>${esc(t.name)}</b><button class="btn sm" data-use="${t.id}">Use</button><button class="icon-btn" data-edit-tpl="${t.id}">${ico('edit', 14)}</button></div><p class="muted pre">${esc(t.body.slice(0, 150))}${t.body.length > 150 ? '…' : ''}</p></div>`).join('')}</div>
    <div class="glass card"><div class="card-h"><h3>Communication log</h3><button class="btn sm" id="log-comm">${ico('plus', 14)} Log</button></div>${D.comms.sort((a, b) => b.date.localeCompare(a.date)).map(m => `<div class="li"><div><b>${esc(m.subject)}</b><small class="muted">${esc(cName(m.cid))} · ${m.dir === 'in' ? 'Received' : 'Sent'} · ${m.channel}</small></div><span class="muted sm">${fmtDate(m.date)}</span></div>`).join('')}</div></div>`;
  }
  function tplForm(t) {
    const isNew = !t; t = t || { type: 'email', name: '', subject: '', body: '' };
    formModal({ title: isNew ? 'New template' : 'Edit template', fields: [{ name: 'type', label: 'Type', type: 'select', value: t.type, options: [['email', 'Email'], ['whatsapp', 'WhatsApp']] }, { name: 'name', label: 'Name', value: t.name, required: 1 }, { name: 'subject', label: 'Subject (email)', value: t.subject }, { name: 'body', label: 'Body — use {{name}}, {{views}}, {{growth}}, {{month}}, {{invoice}}', type: 'textarea', rows: 7, value: t.body, required: 1 }], onSubmit(d) { if (isNew) Store.add('templates', d); else { Object.assign(t, d); Store.save(); } toast('Template saved'); refresh(); } });
  }
  function useTemplate(t, cid) {
    const D = DB();
    modal({ title: 'Send: ' + esc(t.name), wide: true, body: `<div class="form"><label>Client<select id="ut-c">${clientOpts().map(([v, l]) => `<option value="${v}" ${v === cid ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label><label>${t.type === 'email' ? 'Subject' : ''}<input id="ut-s" ${t.type === 'email' ? '' : 'style="display:none"'}></label><label>Message<textarea id="ut-b" rows="9"></textarea></label></div>`,
      foot: `<button class="btn" id="ut-copy">${ico('copy', 16)} Copy</button><button class="btn primary" id="ut-send">${ico(t.type === 'email' ? 'mail' : 'comment', 16)} ${t.type === 'email' ? 'Open in email' : 'Open WhatsApp'}</button>`,
      onMount(root, close) {
        const fill = () => { const c = Store.client($('#ut-c', root).value), q = Metrics.query(c.id, { from: addDays(TODAY, -29), to: TODAY }); const g = q.growth('views'); const open = D.invoices.find(i => i.cid === c.id && i.status !== 'paid');
          const sub = s => s.replace(/{{name}}/g, c.contact.name.split(' ').slice(-1)[0] === c.contact.name ? c.contact.name : c.contact.name.replace(/^Dr\.\s*/, '').split(' ')[0]).replace(/{{views}}/g, fmtN(q.totals.views)).replace(/{{growth}}/g, (g >= 0 ? '+' : '') + g.toFixed(0) + '%').replace(/{{month}}/g, U.MON[new Date().getMonth()]).replace(/{{invoice}}/g, open ? open.no : 'ERM-XXXX');
          $('#ut-s', root).value = sub(t.subject); $('#ut-b', root).value = sub(t.body); };
        fill(); $('#ut-c', root).onchange = fill; $('#ut-copy', root).onclick = () => copyText($('#ut-b', root).value);
        $('#ut-send', root).onclick = () => { const c = Store.client($('#ut-c', root).value), b = $('#ut-b', root).value; Store.add('comms', { cid: c.id, channel: t.type, dir: 'out', subject: t.name, date: TODAY, by: 'u1' }); Store.log(c.id, `${t.type === 'email' ? 'Email' : 'WhatsApp'} sent: ${t.name}`, t.type === 'email' ? 'mail' : 'comment'); if (t.type === 'email') location.href = `mailto:${c.contact.email}?subject=${encodeURIComponent($('#ut-s', root).value)}&body=${encodeURIComponent(b)}`; else window.open(`https://wa.me/${c.contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(b)}`, '_blank'); close(); toast('Logged in communication history'); refresh(); };
      }
    });
  }
  function commForm(cid) {
    formModal({ title: 'Log communication', fields: [{ name: 'cid', label: 'Client', type: 'select', value: cid, options: clientOpts() }, { name: 'channel', label: 'Channel', type: 'select', options: [['email', 'Email'], ['whatsapp', 'WhatsApp'], ['call', 'Call'], ['meeting', 'Meeting']] }, { name: 'dir', label: 'Direction', type: 'select', options: [['out', 'Sent / outbound'], ['in', 'Received / inbound']] }, { name: 'subject', label: 'Summary', required: 1 }], onSubmit(d) { Store.add('comms', { ...d, date: TODAY, by: 'u1' }); toast('Logged'); refresh(); } });
  }

  /* ======================= REPORTS ======================= */
  function reportsPage() {
    const D = DB();
    return `${head('Reports', 'Branded PDF · image · WhatsApp · email — on demand or on a schedule')}
    <div class="grid cl-grid">${D.clients.map(c => `<div class="glass ccard" style="--b1:${c.color};--b2:${c.color2}"><div class="cc-top">${clientLogo(c, 44)}<div><b>${esc(c.name)}</b><small class="muted">${D.schedules.filter(s => s.cid === c.id && s.active).length ? 'Scheduled ✓' : 'No schedule'}</small></div></div><div class="cc-act"><button class="btn sm primary" data-rep="${c.id}">${ico('file', 14)} Generate</button><button class="btn sm" data-sched="${c.id}">${ico('clock', 14)} Schedule</button></div></div>`).join('')}</div>
    <h2 class="sec">Scheduled reports</h2><div class="glass tbl-wrap"><table class="tbl"><tr><th>Client</th><th>Frequency</th><th>Range</th><th>Recipients</th><th>Next run</th><th>Active</th><th></th></tr>${D.schedules.map(s => `<tr><td>${esc(cName(s.cid))}</td><td>${s.freq === 'weekly' ? 'Weekly · ' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.day] : 'Monthly · day ' + s.day}</td><td>${s.range === '7d' ? 'Last 7 days' : 'Last 30 days'}</td><td>${esc(s.recipients)}</td><td>${fmtDate(Reports.nextRun(s))} 08:00</td><td><label class="switch"><input type="checkbox" data-sact="${s.id}" ${s.active ? 'checked' : ''}><i></i></label></td><td class="ra"><button class="icon-btn" data-sdel="${s.id}">${ico('trash', 14)}</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">No schedules yet.</td></tr>'}</table></div><p class="hint">Phase 1 stores schedules. Phase 2: a Vercel Cron → Supabase Edge Function renders the PDF and emails it via Resend (see docs/UPGRADE-PLAN.md).</p>`;
  }

  /* ======================= SETTINGS ======================= */
  let sTab = 'branding';
  function settings() {
    const D = DB(), s = D.settings;
    const tabs = `<div class="tabs">${[['branding', 'Branding'], ['team', 'Team & roles'], ['integrations', 'Integrations'], ['data', 'Data']].map(([k, l]) => `<a data-st="${k}" class="${sTab === k ? 'on' : ''}">${l}</a>`).join('')}</div>`;
    let b = '';
    if (sTab === 'branding') b = `<div class="glass card"><form id="brand-f" class="form"><label>Agency name<input name="agency" value="${esc(s.agency)}"></label><label>Tagline<input name="tagline" value="${esc(s.tagline)}"></label><label>Contact email<input name="email" value="${esc(s.email)}"></label><label>Default colour theme (everyone can still switch with the ★ button)</label><div class="pal-grid">${App.THEMES.map(([id, n, dsc, bg, ac]) => `<button type="button" class="swatch ${(s.theme || 'navy') === id ? 'on' : ''}" data-theme-default="${id}"><i style="background:linear-gradient(135deg,${bg} 50%,${ac} 50%)"></i><span>${n}<small>${dsc}</small></span></button>`).join('')}</div><label>USD → ZAR rate<input type="number" step="0.01" name="zarRate" value="${s.zarRate}"></label><label class="check"><input type="checkbox" name="whiteLabel" ${s.whiteLabel ? 'checked' : ''}><span>White-label client portals (hide “Powered by ERM Marketing”)</span></label><button class="btn primary">Save branding</button></form></div>`;
    if (sTab === 'team') b = `<div class="glass tbl-wrap"><table class="tbl"><tr><th>Member</th><th>Email</th><th>Role</th></tr>${D.team.map(u => `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${badge(u.role)}</td></tr>`).join('')}${D.clients.map(c => `<tr><td>${esc(c.contact.name)} <small class="muted">${esc(c.name)}</small></td><td>${esc(c.login?.email || c.contact.email)}</td><td>${badge('client')}</td></tr>`).join('')}</table></div><div class="actions"><button class="btn primary" id="add-user">${ico('plus', 16)} Invite team member</button></div><h2 class="sec">Permissions</h2><div class="glass tbl-wrap"><table class="tbl perm"><tr><th>Capability</th><th>Admin</th><th>Team</th><th>Client</th></tr>${ROLE_PERMS.map(r => `<tr><td>${r[0]}</td>${r.slice(1).map(v => `<td>${v ? '<span class="up">' + ico('check', 16) + '</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</table></div><p class="hint">Phase 2 enforces this in the database with Supabase Row-Level Security — a client's login can only ever read rows where <code>client_id</code> matches their own.</p>`;
    if (sTab === 'integrations') b = `<div class="grid cl-grid">${[['tiktok', 'TikTok', 'tiktok', API.tiktok], ['meta', 'Meta (Instagram + Facebook)', 'instagram', API.instagram], ['youtube', 'YouTube', 'youtube', API.youtube]].map(([k, n, p, a]) => `<div class="glass acct"><div class="acct-h">${platIcon(p, 40)}<div><b>${n}</b><small class="muted">${D.integrations[k] ? 'App credentials saved' : 'Not configured'}</small></div></div><p class="muted sm">${esc(a.api)}</p><details><summary>Metrics available</summary><p class="ok">✔ ${esc(a.ok)}</p><p class="no">✖ ${esc(a.no)}</p></details><button class="btn sm ${D.integrations[k] ? '' : 'primary'}" data-int="${k}">${D.integrations[k] ? 'Configured (demo)' : 'Configure app'}</button></div>`).join('')}
    ${[['windsor', 'Windsor.ai (aggregator)', 'zap', 'One connector for TikTok, Instagram, Facebook & YouTube. Skips per-platform app review — fastest route to live data.'], ['stripe', 'Stripe / PayFast', 'dollar', 'Payment links on invoices & automatic retainer collection (USD via Stripe, ZAR via PayFast).'], ['whatsapp', 'WhatsApp Business API', 'comment', 'Send templated messages & report links automatically (needs Meta business verification).']].map(([k, n, i, d]) => `<div class="glass acct"><div class="acct-h"><span class="pico" style="width:40px;height:40px;background:var(--grad)">${ico(i, 20)}</span><div><b>${n}</b><small class="muted">${D.integrations[k] ? 'Connected (demo)' : 'Not connected'}</small></div></div><p class="muted sm">${d}</p><button class="btn sm ${D.integrations[k] ? '' : 'primary'}" data-int="${k}">${D.integrations[k] ? 'Disconnect' : 'Connect'}</button></div>`).join('')}</div>`;
    if (sTab === 'data') b = `<div class="glass card"><h3>Demo data</h3><p class="muted">Everything in Phase 1 is stored in this browser (localStorage). Reset to restore the original demo clients, leads and invoices.</p><div class="actions"><button class="btn" id="export-json">${ico('download', 16)} Export JSON</button><button class="btn danger" id="reset-db">${ico('refresh', 16)} Reset demo data</button></div></div>`;
    return `${head('Settings', 'Branding, team, integrations')}${tabs}<div class="view">${b}</div>`;
  }

  /* ======================= RENDER + EVENTS ======================= */
  function render(main, parts, user) {
    const page = parts[0] || 'dashboard'; const nav = NAV.find(n => n[0] === page || (page === 'client' && n[0] === 'clients'));
    if (nav && !nav[3].includes(user.role)) { main.innerHTML = `<div class="view">${empty('No access', 'Your role (' + user.role + ') can\'t open this section.')}</div>`; return; }
    let html;
    if (page === 'client') html = clientDetail(parts[1], parts[2] || 'overview');
    else html = { dashboard, clients, leads, tasks, invoices, proposals, messages: messagesPage, reports: reportsPage, settings }[page]?.() || empty('Not found', '');
    main.innerHTML = `<div class="view">${html}</div>`; U.runCounters(main); bind(main, parts);
  }

  function bind(main, parts) {
    const on = (sel, fn) => $$(sel, main).forEach(fn);
    on('[data-go]', el => el.onclick = () => location.hash = el.dataset.go);
    on('[data-rep]', el => el.onclick = () => Reports.openBuilder(el.dataset.rep));
    on('[data-sched]', el => el.onclick = () => Reports.openSchedule(el.dataset.sched));
    on('[data-view]', el => el.onclick = () => { App.viewAs(el.dataset.view); });
    const B = (id, fn) => { const e = $(id, main); if (e) e.onclick = fn; };
    B('#add-client', () => clientForm()); B('#edit-c', () => clientForm(Store.client(parts[1])));
    const cf = $('#cf', main); if (cf) cf.onclick = e => { const b = e.target.closest('[data-f]'); if (b) { cFilter = b.dataset.f; refresh(); } };
    const cs = $('#c-status', main); if (cs) cs.onchange = () => { const c = Store.client(parts[1]); c.status = cs.value; Store.save(); Store.log(c.id, 'Status changed to ' + cs.value, 'edit'); toast('Status: ' + cs.value); };
    B('#add-lead', () => leadForm());
    // kanban
    on('.kcard', el => { el.onclick = () => leadForm(DB().leads.find(l => l.id === el.dataset.id)); el.ondragstart = e => { e.dataTransfer.setData('text/plain', el.dataset.id); el.classList.add('drag'); }; el.ondragend = () => el.classList.remove('drag'); });
    on('.kcol', col => { col.ondragover = e => { e.preventDefault(); col.classList.add('over'); }; col.ondragleave = () => col.classList.remove('over'); col.ondrop = e => { e.preventDefault(); col.classList.remove('over'); const l = DB().leads.find(x => x.id === e.dataTransfer.getData('text/plain')); if (l && l.stage !== col.dataset.stage) { l.stage = col.dataset.stage; Store.save(); toast(`${l.name} → ${l.stage}`); if (l.stage === 'Won') Store.notify(`🎉 ${l.name} marked Won — convert to client!`, 'star'); refresh(); } }; });
    // tasks
    on('[data-tv]', el => el.onclick = () => { tview = el.dataset.tv; refresh(); }); on('#t-as [data-a]', el => el.onclick = () => { tAssignee = el.dataset.a; refresh(); });
    B('#add-task', taskForm); on('[data-done]', el => el.onchange = () => { const t = DB().tasks.find(x => x.id === el.dataset.done); t.status = el.checked ? 'done' : 'todo'; Store.save(); refresh(); });
    on('[data-adv]', el => el.onclick = () => { const t = DB().tasks.find(x => x.id === el.dataset.adv); t.status = t.status === 'todo' ? 'doing' : 'done'; Store.save(); refresh(); });
    B('#add-content', () => contentForm(null, parts[1])); on('.ci,.agenda [data-k]', el => el.onclick = e => { e.stopPropagation(); contentForm(DB().content.find(k => k.id === el.dataset.k)); });
    on('.cd[data-day]', el => el.ondblclick = () => contentForm(null)); on('[data-cm]', el => el.onclick = () => { const [y, m] = calMonth.split('-').map(Number); const d = new Date(y, m - 1 + +el.dataset.cm, 1); calMonth = U.iso(d).slice(0, 7); refresh(); });
    // invoices
    B('#add-inv', e => invoiceForm(parts[0] === 'client' ? parts[1] : null)); on('[data-inv]', el => el.onclick = () => invoiceView(DB().invoices.find(i => i.id === el.dataset.inv)));
    on('[data-paid]', el => el.onclick = () => { const i = DB().invoices.find(x => x.id === el.dataset.paid); i.status = 'paid'; Store.save(); Store.log(i.cid, `Invoice ${i.no} paid`, 'check'); toast(i.no + ' marked paid'); refresh(); });
    B('#gen-rec', () => { let n = 0; DB().clients.filter(c => c.status === 'Active').forEach(c => { if (!DB().invoices.some(i => i.cid === c.id && i.issued.startsWith(TODAY.slice(0, 7)) && i.recurring)) { Store.add('invoices', { cid: c.id, no: 'ERM-' + String(DB().invoices.length + 1).padStart(4, '0'), amount: c.retainer, currency: c.currency, issued: TODAY, due: addDays(TODAY, 14), status: 'sent', recurring: 'monthly', desc: c.pkg + ' retainer' }); n++; } }); toast(n ? `${n} retainer invoice(s) generated` : 'All retainers already invoiced this month'); refresh(); });
    // proposals
    B('#add-prop', proposalForm); on('[data-pv]', el => el.onclick = () => proposalView(DB().proposals.find(p => p.id === el.dataset.pv)));
    // templates / comms
    B('#add-tpl', () => tplForm()); on('[data-edit-tpl]', el => el.onclick = () => tplForm(DB().templates.find(t => t.id === el.dataset.editTpl))); on('[data-use]', el => el.onclick = () => useTemplate(DB().templates.find(t => t.id === el.dataset.use), DB().clients[0].id));
    B('#log-comm', () => commForm(parts[0] === 'client' ? parts[1] : DB().clients[0].id)); B('#send-tpl', () => { const c = parts[1]; modal({ title: 'Pick a template', body: `<div class="stack">${DB().templates.map(t => `<button class="btn block" data-t="${t.id}">${esc(t.name)} <small class="muted">${t.type}</small></button>`).join('')}</div>`, onMount(root, close) { $$('[data-t]', root).forEach(b => b.onclick = () => { close(); useTemplate(DB().templates.find(t => t.id === b.dataset.t), c); }); } }); });
    // client detail
    on('[data-oauth]', el => el.onclick = () => oauthModal(Store.client(parts[1]), el.dataset.oauth, refresh));
    on('[data-disc]', el => el.onclick = () => { const c = Store.client(parts[1]); c.accounts[el.dataset.disc] = ''; Store.rebuildMetrics(c); Store.save(); toast('Disconnected'); refresh(); });
    B('#save-notes', () => { Store.client(parts[1]).notes = $('#notes', main).value; Store.save(); toast('Notes saved'); });
    // reports
    on('[data-sact]', el => el.onchange = () => { DB().schedules.find(s => s.id === el.dataset.sact).active = el.checked; Store.save(); toast(el.checked ? 'Schedule on' : 'Schedule paused'); });
    on('[data-sdel]', el => el.onclick = () => { Store.remove('schedules', el.dataset.sdel); refresh(); });
    // settings
    on('[data-st]', el => el.onclick = () => { sTab = el.dataset.st; refresh(); });
    const bf = $('#brand-f', main); if (bf) bf.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(bf)); Object.assign(DB().settings, { agency: d.agency, tagline: d.tagline, email: d.email, zarRate: +d.zarRate || 18.5, whiteLabel: !!d.whiteLabel }); Store.save(); App.applyBrand(); toast('Branding updated'); refresh(); };
    on('[data-theme-default]', el => el.onclick = () => { DB().settings.theme = el.dataset.themeDefault; try { localStorage.removeItem('erm.theme'); } catch (e) { } Store.save(); App.applyBrand(); toast('Default theme: ' + el.textContent.trim().split('\n')[0]); refresh(); });
    B('#add-user', () => formModal({ title: 'Invite team member', fields: [{ name: 'name', label: 'Name', required: 1 }, { name: 'email', label: 'Email', type: 'email', required: 1 }, { name: 'role', label: 'Role', type: 'select', options: [['team', 'Team member'], ['admin', 'Admin']] }], submit: 'Send invite', onSubmit(d) { Store.add('team', d); toast('Invite recorded (email sending arrives in Phase 2)'); refresh(); } }));
    on('[data-int]', el => el.onclick = () => { const k = el.dataset.int; DB().integrations[k] = !DB().integrations[k]; Store.save(); toast(DB().integrations[k] ? 'Marked connected (demo)' : 'Disconnected'); refresh(); });
    B('#reset-db', () => { if (confirm('Reset all demo data?')) { Store.reset(); toast('Demo data restored'); refresh(); } });
    B('#export-json', () => U.download('erm-growth-export.json', new Blob([JSON.stringify(DB(), null, 2)], { type: 'application/json' })));
  }

  w.Admin = { render, NAV, convertLead, leadForm };
})(window);
