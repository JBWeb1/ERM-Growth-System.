/* ERM-Growth System — app shell: auth, router, search, notifications.
 * DEMO AUTH ONLY: credentials are checked in the browser. Phase 2 replaces this with Supabase Auth + Row-Level Security. */
(function (w) {
  const { $, $$, esc, ico, ermLogo, clientLogo, toast, ago } = U;
  const DEMO_STAFF = { 'admin@ermmarketing.co': { pw: 'admin123', id: 'u1' }, 'team@ermmarketing.co': { pw: 'team123', id: 'u2' } };
  const app = $('#app');
  let cleanup = null, session = null;

  const readSession = () => { try { return JSON.parse(sessionStorage.getItem('erm.session')); } catch (e) { return null; } };
  const writeSession = s => { try { s ? sessionStorage.setItem('erm.session', JSON.stringify(s)) : sessionStorage.removeItem('erm.session'); } catch (e) { } };
  const getViewAs = () => { try { return sessionStorage.getItem('erm.viewAs'); } catch (e) { return null; } };
  const setViewAs = v => { try { v ? sessionStorage.setItem('erm.viewAs', v) : sessionStorage.removeItem('erm.viewAs'); } catch (e) { } };

  function login(email, pw) {
    email = email.trim().toLowerCase();
    const st = DEMO_STAFF[email];
    if (st && st.pw === pw) { const u = Store.db.team.find(t => t.id === st.id); return { role: u.role, id: u.id, name: u.name }; }
    const c = Store.db.clients.find(c => (c.login?.email || '').toLowerCase() === email);
    if (c && c.login.password === pw) return { role: 'client', id: c.id, name: c.contact.name, cid: c.id };
    return null;
  }

  /* ---------- themes ---------- */
  const THEMES = [
    ['navy', 'Corporate Navy', 'Dark · blue & teal', '#0a0f1c', '#2f6fed'], ['light', 'Executive White', 'Light · clean & crisp', '#f3f5fa', '#2457d6'],
    ['ocean', 'Ocean Light', 'Light · teal & sky', '#eef6fa', '#0b7fb0'], ['emerald', 'Emerald Finance', 'Dark · green & aqua', '#07130f', '#12a37a'],
    ['gold', 'Charcoal & Gold', 'Dark · premium gold', '#101012', '#c8a24a'], ['indigo', 'Slate Indigo', 'Dark · calm indigo', '#0c0f20', '#4f5bd5'],
    ['burgundy', 'Royal Burgundy', 'Dark · wine & rose', '#150b11', '#a62f50']
  ];
  const getTheme = () => { let t = null; try { t = localStorage.getItem('erm.theme'); } catch (e) { } return THEMES.some(x => x[0] === t) ? t : (Store.db.settings.theme || 'navy'); };
  const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const onColor = h => { const [r, g, b] = hex2rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#1a1405' : '#ffffff'; };
  function applyBrand(client) {
    const t = getTheme(), root = document.documentElement, st = root.style;
    root.dataset.theme = t === 'navy' ? '' : t;
    ['--a1', '--a2', '--c1', '--on'].forEach(v => st.setProperty(v, ''));
    let brandOn = true; try { brandOn = localStorage.getItem('erm.brand') !== 'off'; } catch (e) { }
    if (client && brandOn) { st.setProperty('--a1', client.color); st.setProperty('--a2', client.color2); st.setProperty('--c1', client.color); st.setProperty('--on', onColor(client.color)); }
    const a1 = getComputedStyle(root).getPropertyValue('--a1').trim(); if (/^#[0-9a-f]{6}$/i.test(a1)) st.setProperty('--a1-rgb', hex2rgb(a1).join(','));
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = getComputedStyle(root).getPropertyValue('--bg').trim();
  }
  const paletteHTML = (client) => { const cur = getTheme(); let brandOn = true; try { brandOn = localStorage.getItem('erm.brand') !== 'off'; } catch (e) { } return `<div class="pal"><button class="icon-btn" id="pal-btn" title="Colour theme" aria-label="Colour theme">${ico('star', 20)}</button><div class="pal-pop glass" id="pal-pop" hidden><b class="sm">Colour theme</b><div class="pal-grid" style="margin-top:8px">${THEMES.map(([id, n, d, bg, ac]) => `<button class="swatch ${id === cur ? 'on' : ''}" data-theme-pick="${id}"><i style="background:linear-gradient(135deg,${bg} 50%,${ac} 50%)"></i><span>${n}<small>${d}</small></span></button>`).join('')}</div>${client ? `<label class="check sm" style="margin-top:12px"><input type="checkbox" id="brand-on" ${brandOn ? 'checked' : ''}><span>Use ${esc(client.name)} brand colours</span></label>` : ''}</div></div>`; };
  function bindPalette(client) {
    const b = $('#pal-btn'), pop = $('#pal-pop'); if (!b) return;
    b.onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; };
    $$('[data-theme-pick]', pop).forEach(x => x.onclick = () => { try { localStorage.setItem('erm.theme', x.dataset.themePick); } catch (e) { } applyBrand(client); $$('.swatch', pop).forEach(s => s.classList.toggle('on', s === x)); });
    const bo = $('#brand-on'); if (bo) bo.onchange = () => { try { localStorage.setItem('erm.brand', bo.checked ? 'on' : 'off'); } catch (e) { } applyBrand(client); };
    document.addEventListener('click', ev => { if (!ev.target.closest('.pal')) pop.hidden = true; });
  }

  /* ---------- login page ---------- */
  function loginView() {
    cleanup && cleanup(); cleanup = null; applyBrand(); setViewAs(null);
    const D = Store.db;
    app.innerHTML = `<div class="login">
      <section class="login-hero"><div class="orb o1"></div><div class="orb o2"></div>
        <div class="brandrow">${ermLogo(46)}<div><b>ERM Marketing</b><small>${esc(D.settings.tagline)}</small></div></div>
        <h1>Your content, <span class="grad">live</span> and growing.</h1>
        <p>One platform to run the agency — and a stunning live dashboard for every client.</p>
        <div class="glass login-demo"><div class="live"><i></i>Live<small>· demo preview</small></div><div class="big count" data-count="2480000" data-fmt="full">0</div><div class="muted">views this month across all clients</div><div class="spark-wrap">${U.sparkline([4, 5, 4.4, 6, 7, 6.6, 8.5, 9, 8.2, 10.5, 12, 14], '#5b9bff', 300, 60)}</div><span class="gchip up">${ico('up', 12)}28.4%</span></div>
      </section>
      <section class="login-card glass"><h2>Welcome back</h2><p class="muted">Sign in to your dashboard</p>
        <form id="lf" class="form"><label>Email<input id="le" type="email" autocomplete="username" required placeholder="you@company.com"></label><label>Password<input id="lp" type="password" autocomplete="current-password" required placeholder="••••••••"></label><div class="err" id="lerr" hidden></div><button class="btn primary lg">Sign in ${ico('chev', 16)}</button></form>
        <div class="demo-box"><b>${ico('zap', 14)} Demo accounts <small>(click to fill)</small></b>
          <div class="chips"><button class="chip" data-e="admin@ermmarketing.co" data-p="admin123">👑 Admin</button><button class="chip" data-e="team@ermmarketing.co" data-p="team123">🧑‍💻 Team member</button></div>
          <div class="chips">${D.clients.map(c => `<button class="chip" data-e="${esc(c.login.email)}" data-p="${esc(c.login.password)}"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</button>`).join('')}</div>
          <small class="muted">Client password: <code>demo123</code> · Demo-only login, checked in your browser.</small></div></section></div>`;
    U.runCounters(app); app.insertAdjacentHTML('beforeend', `<div class="login-pal">${paletteHTML()}</div>`); bindPalette(null);
    $$('[data-e]', app).forEach(b => b.onclick = () => { $('#le').value = b.dataset.e; $('#lp').value = b.dataset.p; });
    $('#lf').onsubmit = e => { e.preventDefault(); const s = login($('#le').value, $('#lp').value); if (!s) { const er = $('#lerr'); er.hidden = false; er.textContent = 'Incorrect email or password.'; return; } session = s; writeSession(s); location.hash = s.role === 'client' ? '#/portal/overview' : '#/admin/dashboard'; };
  }

  /* ---------- shell ---------- */
  function shell({ brandHTML, navHTML, foot, topLeft, topRight, client }) {
    applyBrand(client);
    app.innerHTML = `<div class="shell ${client ? 'portal' : ''}"><aside class="side" id="side"><div class="side-brand">${brandHTML}</div><nav>${navHTML}</nav><div class="side-foot">${foot}</div></aside><div class="scrim" id="scrim"></div>
      <div class="main-col"><header class="topbar"><button class="icon-btn menu" id="menu" aria-label="Menu">${ico('menu', 22)}</button>${topLeft}<span class="sp"></span>${topRight}</header><main id="main"></main></div></div>
      <div class="bg-orbs"><i></i><i></i></div>`;
    const side = $('#side'), tog = o => { side.classList.toggle('open', o); $('#scrim').classList.toggle('on', o); };
    $('#menu').onclick = () => tog(!side.classList.contains('open')); $('#scrim').onclick = () => tog(false); side.onclick = e => { if (e.target.closest('a')) tog(false); };
  }
  const userChip = s => `<div class="user"><span class="avatar">${esc(U.initials(s.name))}</span><div><b>${esc(s.name)}</b><small class="muted">${s.role}</small></div><button class="icon-btn" id="logout" title="Sign out" aria-label="Sign out">${ico('logout', 18)}</button></div>`;

  function mountAdmin(parts) {
    const s = session; const D = Store.db; Growth.runAlerts();
    const unread = D.notifications.filter(n => !n.read).length;
    const nav = Admin.NAV.filter(n => n[3].includes(s.role)).map(([k, l, i]) => `<a href="#/admin/${k}" class="${(parts[0] || 'dashboard') === k || (parts[0] === 'client' && k === 'clients') ? 'on' : ''}">${ico(i, 18)}<span>${l}</span></a>`).join('');
    shell({
      brandHTML: `${ermLogo(38)}<div><b>${esc(D.settings.agency)}</b><small>${esc(D.settings.tagline)}</small></div>`, navHTML: nav, foot: `<small class="muted">ERM-Growth System · v1 demo</small>`,
      topLeft: `<div class="search"><span>${ico('search', 16)}</span><input id="gs" placeholder="Search clients, leads, invoices…  ( / )" autocomplete="off"><div class="results glass" id="gres" hidden></div></div>`,
      topRight: `${paletteHTML()}<div class="pop-wrap"><button class="icon-btn bell" id="bell" aria-label="Notifications">${ico('bell', 20)}${unread ? `<b class="dot-n">${unread}</b>` : ''}</button><div class="pop glass" id="npop" hidden></div></div>${userChip(s)}`
    });
    bindTop(); bindPalette(null);
    const gs = $('#gs'), gr = $('#gres');
    gs.oninput = () => { const q = gs.value.trim().toLowerCase(); if (q.length < 2) { gr.hidden = true; return; } const hits = [];
      D.clients.forEach(c => (c.name + c.contact.name + c.industry).toLowerCase().includes(q) && hits.push(['Client', c.name, c.status, '#/admin/client/' + c.id]));
      D.leads.forEach(l => (l.name + l.contact).toLowerCase().includes(q) && hits.push(['Lead', l.name, l.stage, '#/admin/leads']));
      D.tasks.forEach(t => t.title.toLowerCase().includes(q) && hits.push(['Task', t.title, t.status, '#/admin/tasks']));
      D.invoices.forEach(i => (i.no + i.desc).toLowerCase().includes(q) && hits.push(['Invoice', i.no + ' · ' + i.desc, i.status, '#/admin/invoices']));
      D.proposals.forEach(p => p.title.toLowerCase().includes(q) && hits.push(['Proposal', p.title, p.status, '#/admin/proposals']));
      gr.innerHTML = hits.slice(0, 8).map(h => `<a href="${h[3]}"><small>${h[0]}</small><b>${esc(h[1])}</b><em>${esc(h[2])}</em></a>`).join('') || '<p class="muted pad">No results</p>'; gr.hidden = false; };
    gr.onclick = () => { gr.hidden = true; gs.value = ''; };
    document.addEventListener('keydown', slash);
    const np = $('#npop'); $('#bell').onclick = e => { e.stopPropagation(); np.hidden = !np.hidden; if (!np.hidden) { np.innerHTML = `<div class="pop-h"><b>Notifications</b><button class="btn sm" id="mark">Mark all read</button></div>${D.notifications.slice(0, 8).map(n => `<div class="li ${n.read ? '' : 'unread'}"><span class="tl-d">${ico(n.icon || 'bell', 14)}</span><div><b>${esc(n.text)}</b><small class="muted">${ago(n.ts)}</small></div></div>`).join('')}`; $('#mark').onclick = () => { D.notifications.forEach(n => n.read = true); Store.save(); route(true); }; } };
    document.addEventListener('click', closePops);
    return $('#main');
  }
  const slash = e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { const g = $('#gs'); if (g) { e.preventDefault(); g.focus(); } } };
  const closePops = e => { const np = $('#npop'); if (np && !e.target.closest('.pop-wrap')) np.hidden = true; const gr = $('#gres'); if (gr && !e.target.closest('.search')) gr.hidden = true; };

  function mountPortal(sub, c, admin) {
    const D = Store.db, pend = D.content.filter(k => k.cid === c.id && (k.approval === 'pending' || k.approval === 'changes')).length;
    const nav = Portal.NAV.map(([k, l, i]) => `<a href="#/portal/${k}" class="${sub === k ? 'on' : ''}">${ico(i, 18)}<span>${l}</span>${k === 'approvals' && pend ? `<b class="dot-n">${pend}</b>` : ''}</a>`).join('');
    shell({
      client: c, brandHTML: `${clientLogo(c, 42)}<div><b>${esc(c.name)}</b><small>Client dashboard</small></div>`, navHTML: nav,
      foot: D.settings.whiteLabel ? '' : `<div class="powered">${ermLogo(22)}<small>Powered by <b>ERM Marketing</b><br>${esc(D.settings.tagline)}</small></div>`,
      topLeft: admin ? `<div class="viewas">${ico('eye', 16)} Viewing as <b>${esc(c.name)}</b></div>` : `<div class="hello">Hi ${esc(c.contact.name.replace(/^Dr\.\s*/, '').split(' ')[0])} 👋</div>`,
      topRight: `${paletteHTML(c)}<button class="btn sm hide-m" id="p-pres">${ico('play', 14)} Present</button><button class="btn sm primary hide-m" id="p-rep">${ico('download', 14)} Report</button>${admin ? `<button class="btn sm" id="exit-view">${ico('x', 14)} Exit client view</button>` : userChip(session)}`
    });
    bindTop(); bindPalette(c); const pp = $('#p-pres'); if (pp) pp.onclick = () => Growth.present(c.id); const r = $('#p-rep'); if (r) r.onclick = () => Reports.openBuilder(c.id);
    const ex = $('#exit-view'); if (ex) ex.onclick = () => { setViewAs(null); location.hash = '#/admin/client/' + c.id; };
    return $('#main');
  }
  function bindTop() { const lo = $('#logout'); if (lo) lo.onclick = () => { session = null; writeSession(null); setViewAs(null); location.hash = '#/login'; }; }

  /* ---------- router ---------- */
  function route(keep) {
    const y = keep ? scrollY : 0;
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    cleanup && cleanup(); cleanup = null; document.removeEventListener('keydown', slash); document.removeEventListener('click', closePops);
    session = readSession();
    if (parts[0] && parts[0].startsWith('lead-form')) { applyBrand(); Growth.leadFormView(app); return; }
    if (!parts.length || parts[0] === 'login') { if (session && parts[0] !== 'login') { location.hash = session.role === 'client' ? '#/portal/overview' : '#/admin/dashboard'; return; } return loginView(); }
    if (!session) { location.hash = '#/login'; return; }
    if (parts[0] === 'admin') {
      if (session.role === 'client') { location.hash = '#/portal/overview'; return; }
      const main = mountAdmin(parts.slice(1)); Admin.render(main, parts.slice(1), session);
    } else if (parts[0] === 'portal') {
      const cid = session.role === 'client' ? session.cid : getViewAs();
      const c = cid && Store.client(cid);
      if (!c) { location.hash = session.role === 'client' ? '#/login' : '#/admin/clients'; return; }
      const sub = Portal.NAV.some(n => n[0] === parts[1]) ? parts[1] : 'overview';
      const main = mountPortal(sub, c, session.role !== 'client'); cleanup = Portal.render(main, c, sub, { admin: session.role !== 'client' });
    } else location.hash = '#/login';
    scrollTo(0, y);
  }

  document.addEventListener('erm:refresh', () => route(true));
  addEventListener('hashchange', () => route(false));
  w.App = { THEMES, getTheme, viewAs(cid) { setViewAs(cid); location.hash = '#/portal/overview'; }, applyBrand: () => applyBrand(), route };
  route(false);
})(window);
