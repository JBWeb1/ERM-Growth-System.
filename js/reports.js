/* ERM-Growth System — reports: insights, branded report document, PDF/image/WhatsApp/email export, scheduling */
(function (w) {
  const { $, $$, esc, fmtN, fmtFull, fmtPct, fmtDate, fmtDateY, ico, PLAT, platIcon, ermLogo, clientLogo, modal, toast, copyText, addDays, todayISO, diffDays } = U;
  const TODAY = todayISO();

  const sign = n => (n >= 0 ? '▲ ' : '▼ ') + Math.abs(n).toFixed(1) + '%';

  /* hourly (today) or daily series, with previous-period overlay */
  function viewsSeries(cid, q, plats) {
    if (q.len === 1 && q.to === TODAY) {
      const h = Metrics.hourly(cid, plats);
      return { labels: h.map((_, i) => i + ':00'), series: [{ name: 'Views', color: '#6d7cff', data: h }], hourly: true };
    }
    const labels = q.daily.map(d => fmtDate(d.d));
    const series = [{ name: 'Views', color: '#6d7cff', data: q.daily.map(d => d.views) }];
    return { labels, series, prevData: q.prev.daily.map(d => d.views) };
  }

  /* month-to-date goal progress */
  function goals(cid) {
    const mtd = Metrics.mtd(cid); const mStart = TODAY.slice(0, 8) + '01';
    const posts = Metrics.posts(cid, { from: mStart, to: TODAY }).length + Store.byClient('content', cid).filter(k => k.status === 'posted' && k.date >= mStart).length;
    return Store.byClient('goals', cid).map(g => {
      const cur = g.metric === 'views' ? mtd.views : g.metric === 'followers' ? mtd.followers : g.metric === 'engagement' ? mtd.engagement : posts;
      return { goal: g, current: cur, pct: Math.min(100, cur / g.target * 100) };
    });
  }

  /* auto-written wins + next steps */
  function insights(cid, q, opts) {
    const c = Store.client(cid), T = q.totals, plats = q.plats;
    const rank = plats.map(p => ({ p, v: q.byPlatform[p].views, e: q.byPlatform[p].engagement, g: q.pgrowth(p, 'views') }));
    const topV = [...rank].sort((a, b) => b.v - a.v)[0], topE = [...rank].sort((a, b) => b.e - a.e)[0], topG = [...rank].sort((a, b) => b.g - a.g)[0], low = [...rank].sort((a, b) => a.v - b.v)[0];
    const posts = Metrics.posts(cid, { from: q.from, to: q.to, platforms: opts.platforms }).sort((a, b) => b.views - a.views);
    const g = q.growth('views'), ge = T.engagement - q.prev.totals.engagement;
    const wins = [], next = [];
    wins.push(`Total views reached ${fmtN(T.views)} (${g >= 0 ? 'up' : 'down'} ${Math.abs(g).toFixed(1)}% vs the previous ${q.len}-day period).`);
    if (topV) wins.push(`${PLAT[topV.p].name} led reach with ${fmtN(topV.v)} views (${(topV.v / T.views * 100).toFixed(0)}% of total).`);
    if (posts[0]) wins.push(`Top post: “${posts[0].title}” on ${PLAT[posts[0].platform].name} — ${fmtN(posts[0].views)} views.`);
    wins.push(`${fmtFull(T.followers)} new followers gained and an engagement rate of ${T.engagement.toFixed(1)}% (${ge >= 0 ? '+' : ''}${ge.toFixed(1)} pts).`);
    if (topG && topG.g > 5 && topG.p !== topV?.p) wins.push(`${PLAT[topG.p].name} is the fastest-growing channel (+${topG.g.toFixed(0)}%).`);
    if (topE) next.push(`Double down on ${PLAT[topE.p].name}, which has the highest engagement (${topE.e.toFixed(1)}%) — add 1–2 extra posts per week.`);
    if (posts[0]) next.push(`Create a follow-up series based on “${posts[0].title}” while the topic is performing.`);
    const heat = Metrics.heat(cid); let best = [0, 0, 0]; heat.forEach((row, d) => row.forEach((v, s) => { if (v > best[0]) best = [v, d, s]; }));
    next.push(`Schedule key posts on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][best[1]]} around ${best[2] * 3}:00–${best[2] * 3 + 3}:00, your strongest window.`);
    if (low && rank.length > 1) next.push(`Test new hooks and formats on ${PLAT[low.p].name} to lift its share of total views.`);
    next.push('Review goals together on our next call and agree next month\'s targets.');
    return { wins, next, topPost: posts[0], posts };
  }

  function periodLabel(q) { return q.len === 1 ? fmtDateY(q.to) : `${fmtDateY(q.from)} – ${fmtDateY(q.to)}`; }

  function summaryText(cid, opts, root) {
    const c = Store.client(cid), q = Metrics.query(cid, opts), ins = insights(cid, q, opts), T = q.totals;
    let wins = ins.wins, next = ins.next;
    if (root) { const w_ = $$('.r-wins li', root).map(x => x.innerText.trim()).filter(Boolean), n_ = $$('.r-next li', root).map(x => x.innerText.trim()).filter(Boolean); if (w_.length) wins = w_; if (n_.length) next = n_; }
    return `📊 *${c.name} — Performance report*\n${periodLabel(q)}\n\n👁 Views: *${fmtN(T.views)}* (${sign(q.growth('views'))})\n❤️ Likes: ${fmtN(T.likes)}  💬 Comments: ${fmtN(T.comments)}\n🔁 Shares: ${fmtN(T.shares)}  🔖 Saves: ${fmtN(T.saves)}\n👥 New followers: ${fmtFull(T.followers)}\n📈 Engagement: ${T.engagement.toFixed(1)}%  🎯 Reach: ${fmtN(T.reach)}\n\n*Wins*\n${wins.map(x => '• ' + x).join('\n')}\n\n*Next steps*\n${next.map(x => '• ' + x).join('\n')}\n\n— ${Store.db.settings.agency} | ${Store.db.settings.tagline}`;
  }

  /* ---------- the branded report document (light, print-friendly) ---------- */
  function html(cid, opts, edit = true) {
    const c = Store.client(cid), q = Metrics.query(cid, opts), S = opts.sections, T = q.totals, ins = insights(cid, q, opts), cfg = Store.db.settings;
    const vs = viewsSeries(cid, q, opts.platforms);
    const ser = [{ name: 'This period', color: '#5b5bf0', data: vs.series[0].data }];
    if (vs.prevData) ser.push({ name: 'Previous', color: '#a3a7c4', dashed: true, data: vs.prevData });
    const stat = (label, v, k, icon) => `<div class="r-stat"><span>${ico(icon, 14)} ${label}</span><b>${v}</b>${k !== null ? `<em class="${k >= 0 ? 'up' : 'dn'}">${sign(k)}</em>` : ''}</div>`;
    const donutParts = q.plats.map(p => ({ name: PLAT[p].name, value: q.byPlatform[p].views, color: PLAT[p].color === '#25f4ee' ? '#00b8b0' : PLAT[p].color }));
    let o = `<div class="report" id="report-doc" style="--b1:${c.color};--b2:${c.color2}">
    <div class="r-head"><div class="r-brand">${ermLogo(40)}<div><b>${esc(cfg.agency)}</b><small>${esc(cfg.tagline)}</small></div></div><div class="r-client">${clientLogo(c, 44)}<div><b>${esc(c.name)}</b><small>Performance report</small></div></div></div>
    <div class="r-band"><h2>${esc(periodLabel(q))}</h2><span>${q.plats.map(p => PLAT[p].name).join(' · ')}</span></div><div class="r-body">`;
    if (S.stats) o += `<h4>Key results</h4><div class="r-stats">${stat('Views', fmtN(T.views), q.growth('views'), 'eye')}${stat('Reach', fmtN(T.reach), q.growth('reach'), 'globe')}${stat('Engagement', T.engagement.toFixed(1) + '%', T.engagement - q.prev.totals.engagement, 'zap')}${stat('Likes', fmtN(T.likes), q.growth('likes'), 'heart')}${stat('Comments', fmtN(T.comments), q.growth('comments'), 'comment')}${stat('Shares', fmtN(T.shares), q.growth('shares'), 'share')}${stat('Saves', fmtN(T.saves), q.growth('saves'), 'bookmark')}${stat('New followers', fmtFull(T.followers), q.growth('followers'), 'userplus')}${stat('Watch time', U.fmtHours(T.watch), q.growth('watch'), 'clock')}</div>`;
    if (S.charts) o += `<h4>Views over time</h4><div class="r-chart">${U.lineChart({ series: ser, labels: vs.labels, height: 250, light: true })}</div>`;
    if (S.platforms) o += `<h4>Platform breakdown</h4><div class="r-plat"><div class="r-donut">${U.donut({ parts: donutParts, size: 170, thick: 24, light: true, center: `<b>${fmtN(T.views)}</b><small>views</small>` })}</div><table><tr><th>Platform</th><th>Views</th><th>Share</th><th>Eng.</th><th>Growth</th></tr>${q.plats.map(p => `<tr><td><i style="background:${donutParts.find(x => x.name === PLAT[p].name).color}"></i>${PLAT[p].name}</td><td>${fmtN(q.byPlatform[p].views)}</td><td>${(q.byPlatform[p].views / (T.views || 1) * 100).toFixed(0)}%</td><td>${q.byPlatform[p].engagement.toFixed(1)}%</td><td class="${q.pgrowth(p, 'views') >= 0 ? 'up' : 'dn'}">${sign(q.pgrowth(p, 'views'))}</td></tr>`).join('')}</table></div>`;
    if (S.top) o += `<h4>Top performing posts</h4><div class="r-posts">${ins.posts.slice(0, 4).map(p => `<div class="r-post"><div class="r-thumb" style="background:linear-gradient(135deg,hsl(${p.hue},70%,60%),hsl(${(p.hue + 50) % 360},70%,45%))">${p.emoji}</div><b>${esc(p.title)}</b><small>${PLAT[p.platform].name} · ${fmtDate(p.date)}</small><span>${fmtN(p.views)} views · ${((p.likes + p.comments + p.shares + p.saves) / p.views * 100).toFixed(1)}% eng.</span></div>`).join('') || '<p class="muted">No posts in this period.</p>'}</div>`;
    if (S.goals) o += `<h4>Monthly goals (month to date)</h4><div class="r-goals">${goals(cid).map(g => `<div><div class="r-gl"><span>${esc(g.goal.label)}</span><b>${g.goal.metric === 'engagement' ? g.current.toFixed(1) + '% / ' + g.goal.target + '%' : fmtN(g.current) + ' / ' + fmtN(g.goal.target)}</b></div><div class="r-bar"><i style="width:${g.pct}%"></i></div></div>`).join('')}</div>`;
    if (S.summary) o += `<h4>Summary</h4><div class="r-sum"><h5>🏆 Wins</h5><ul class="r-wins" ${edit ? 'contenteditable="true" spellcheck="true"' : ''}>${ins.wins.map(x => `<li>${esc(x)}</li>`).join('')}</ul><h5>🚀 Next steps</h5><ul class="r-next" ${edit ? 'contenteditable="true" spellcheck="true"' : ''}>${ins.next.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    o += `</div><div class="r-foot"><b>${esc(cfg.agency)}</b> · ${esc(cfg.tagline)} · ${esc(cfg.email)}<small>Generated ${fmtDateY(TODAY)} · Sample data (Phase 1 demo)</small></div></div>`;
    return o;
  }

  /* inline-styled, email-client-safe version */
  function emailHTML(cid, opts, root) {
    const c = Store.client(cid), q = Metrics.query(cid, opts), T = q.totals;
    const txt = summaryText(cid, opts, root).split('\n\n');
    const lis = arr => arr.map(x => `<li style="margin:0 0 6px">${esc(x)}</li>`).join('');
    const ins = insights(cid, q, opts); let wins = ins.wins, next = ins.next;
    if (root) { const a = $$('.r-wins li', root).map(x => x.innerText.trim()).filter(Boolean), b = $$('.r-next li', root).map(x => x.innerText.trim()).filter(Boolean); if (a.length) wins = a; if (b.length) next = b; }
    const cell = (l, v, g) => `<td style="padding:12px;background:#f4f5fb;border-radius:10px;text-align:center"><div style="font-size:12px;color:#6b7090">${l}</div><div style="font-size:22px;font-weight:700;color:#1b1d3a">${v}</div><div style="font-size:12px;color:${g >= 0 ? '#12a150' : '#d93c3c'}">${sign(g)}</div></td><td width="8"></td>`;
    return `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:600px;margin:auto;color:#1b1d3a"><div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:24px;border-radius:14px 14px 0 0;color:#fff"><div style="font-size:13px;opacity:.85">${esc(Store.db.settings.agency)} · ${esc(Store.db.settings.tagline)}</div><div style="font-size:22px;font-weight:700;margin-top:6px">${esc(c.name)} — Performance report</div><div style="opacity:.9">${esc(periodLabel(q))}</div></div><div style="border:1px solid #e5e7f0;border-top:0;padding:20px;border-radius:0 0 14px 14px"><table width="100%" cellspacing="0" cellpadding="0"><tr>${cell('Views', fmtN(T.views), q.growth('views'))}${cell('Reach', fmtN(T.reach), q.growth('reach'))}${cell('Followers', '+' + fmtFull(T.followers), q.growth('followers'))}</tr></table><h3 style="margin:22px 0 8px">Wins</h3><ul style="padding-left:18px;margin:0">${lis(wins)}</ul><h3 style="margin:22px 0 8px">Next steps</h3><ul style="padding-left:18px;margin:0">${lis(next)}</ul><p style="margin-top:24px"><a href="#" style="background:#6d5df6;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Open live dashboard</a></p><p style="font-size:12px;color:#8b90b0;margin-top:22px">Sent by ${esc(Store.db.settings.agency)}</p></div></div>`;
  }

  /* ---------- exports ---------- */
  function printReport(root, name) {
    let pr = $('#print-root'); if (!pr) { pr = document.createElement('div'); pr.id = 'print-root'; document.body.appendChild(pr); }
    const doc = $('#report-doc', root).cloneNode(true); $$('[contenteditable]', doc).forEach(e => e.removeAttribute('contenteditable'));
    pr.innerHTML = ''; pr.appendChild(doc);
    const old = document.title; document.title = name; document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); document.title = old; pr.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done); setTimeout(() => window.print(), 80);
  }
  function loadScript(src) { return new Promise((res, rej) => { if (w.html2canvas) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load image library (offline?)')); document.head.appendChild(s); }); }
  async function toImageBlob(root) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const el = $('#report-doc', root); const clone = el.cloneNode(true); $$('[contenteditable]', clone).forEach(e => e.removeAttribute('contenteditable'));
    const stage = document.createElement('div'); stage.style.cssText = 'position:fixed;left:-9999px;top:0;width:820px'; stage.appendChild(clone); document.body.appendChild(stage);
    try { const cv = await html2canvas(clone, { scale: 2, backgroundColor: '#ffffff', useCORS: true }); return await new Promise(r => cv.toBlob(r, 'image/png')); } finally { stage.remove(); }
  }

  /* ---------- builder modal ---------- */
  function openBuilder(cid) {
    const c = Store.client(cid); const conn = Metrics.connected(cid);
    const st = { preset: '30d', from: addDays(TODAY, -29), to: TODAY, platforms: [...conn], sections: { stats: true, charts: true, platforms: true, top: true, goals: true, summary: true } };
    const presets = [['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['90d', 'Last 90 days'], ['mtd', 'This month'], ['lm', 'Last month'], ['custom', 'Custom']];
    const secs = [['stats', 'Key stats'], ['charts', 'Views chart'], ['platforms', 'Platform breakdown'], ['top', 'Top posts'], ['goals', 'Goals'], ['summary', 'Wins & next steps']];
    const body = `<div class="rb">
      <aside class="rb-side">
        <label class="lbl">Date range</label><div class="chips" id="rb-pre">${presets.map(([k, l]) => `<button class="chip ${k === st.preset ? 'on' : ''}" data-p="${k}">${l}</button>`).join('')}</div>
        <div class="row2" id="rb-cust" style="display:none"><input type="date" id="rb-from" max="${TODAY}"><input type="date" id="rb-to" max="${TODAY}"></div>
        <label class="lbl">Platforms</label><div class="checks" id="rb-plat">${conn.map(p => `<label class="check"><input type="checkbox" value="${p}" checked>${platIcon(p, 22)}<span>${PLAT[p].name}</span></label>`).join('')}</div>
        <label class="lbl">Sections</label><div class="checks" id="rb-sec">${secs.map(([k, l]) => `<label class="check"><input type="checkbox" value="${k}" checked><span>${l}</span></label>`).join('')}</div>
        <label class="lbl">Share</label>
        <div class="rb-actions">
          <button class="btn primary" id="rb-pdf">${ico('download', 16)} Download PDF</button>
          <button class="btn" id="rb-img">${ico('image', 16)} Download image</button>
          <button class="btn wa" id="rb-wa">${ico('comment', 16)} WhatsApp</button>
          <button class="btn" id="rb-mail">${ico('mail', 16)} Email</button>
          <button class="btn" id="rb-mailhtml">${ico('copy', 16)} Copy email HTML</button>
          <button class="btn" id="rb-copy">${ico('copy', 16)} Copy summary</button>
        </div>
        <label class="lbl">Automate</label>
        <button class="btn ghost" id="rb-sched">${ico('clock', 16)} Schedule weekly / monthly</button>
        <p class="hint">Tip: the wins &amp; next steps are editable — click into the preview and tweak the wording before exporting.</p>
      </aside>
      <section class="rb-prev"><div id="rb-doc"></div></section></div>`;
    modal({
      title: `Generate report — ${esc(c.name)}`, body, wide: true, cls: 'rbm', onMount(root) {
        const doc = $('#rb-doc', root);
        const opts = () => { let from = st.from, to = st.to; if (st.preset === '7d') from = addDays(TODAY, -6), to = TODAY; if (st.preset === '30d') from = addDays(TODAY, -29), to = TODAY; if (st.preset === '90d') from = addDays(TODAY, -89), to = TODAY; if (st.preset === 'mtd') from = TODAY.slice(0, 8) + '01', to = TODAY; if (st.preset === 'lm') { const d = U.parse(TODAY); from = U.iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)); to = U.iso(new Date(d.getFullYear(), d.getMonth(), 0)); } return { from, to, platforms: st.platforms.length ? st.platforms : conn, sections: st.sections }; };
        const render = () => { doc.innerHTML = html(cid, opts()); };
        render();
        $('#rb-pre', root).onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; st.preset = b.dataset.p; $$('#rb-pre .chip', root).forEach(x => x.classList.toggle('on', x === b)); $('#rb-cust', root).style.display = st.preset === 'custom' ? '' : 'none'; if (st.preset === 'custom') { $('#rb-from', root).value = st.from; $('#rb-to', root).value = st.to; } render(); };
        const cust = () => { const f = $('#rb-from', root).value, t = $('#rb-to', root).value; if (f && t && f <= t) { st.from = f; st.to = t; render(); } };
        $('#rb-from', root).onchange = cust; $('#rb-to', root).onchange = cust;
        $('#rb-plat', root).onchange = () => { st.platforms = $$('#rb-plat input:checked', root).map(i => i.value); render(); };
        $('#rb-sec', root).onchange = () => { $$('#rb-sec input', root).forEach(i => st.sections[i.value] = i.checked); render(); };
        const fname = () => `ERM-Report-${c.name.replace(/[^a-z0-9]+/gi, '-')}-${TODAY}`;
        $('#rb-pdf', root).onclick = () => { printReport(root, fname()); toast('Choose “Save as PDF” in the print dialog'); };
        $('#rb-img', root).onclick = async e => { const b = e.currentTarget; b.disabled = true; try { U.download(fname() + '.png', await toImageBlob(root)); toast('Image downloaded'); } catch (err) { toast(err.message, 'warn'); } b.disabled = false; };
        $('#rb-wa', root).onclick = async () => {
          const text = summaryText(cid, opts(), root);
          try { const blob = await toImageBlob(root); const f = new File([blob], fname() + '.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text }); return; } } catch (err) { /* fall through to text link */ }
          window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); toast('Opened WhatsApp with the summary text');
        };
        $('#rb-mail', root).onclick = () => { const o = opts(), q = Metrics.query(cid, o); location.href = `mailto:${encodeURIComponent(c.contact.email)}?subject=${encodeURIComponent(c.name + ' — performance report, ' + periodLabel(q))}&body=${encodeURIComponent(summaryText(cid, o, root).replace(/\*/g, ''))}`; };
        $('#rb-mailhtml', root).onclick = () => copyText(emailHTML(cid, opts(), root));
        $('#rb-copy', root).onclick = () => copyText(summaryText(cid, opts(), root));
        $('#rb-sched', root).onclick = () => openSchedule(cid);
      }
    });
  }

  /* ---------- scheduling ---------- */
  function nextRun(s) {
    const d = new Date(); d.setHours(8, 0, 0, 0);
    if (s.freq === 'weekly') { const diff = (s.day - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + diff); }
    else { d.setDate(Math.min(s.day, 28)); if (d <= new Date()) d.setMonth(d.getMonth() + 1); }
    return U.iso(d);
  }
  function openSchedule(cid) {
    const c = Store.client(cid);
    modal({
      title: 'Schedule automatic reports', body: `<div class="form"><label>Frequency<select id="sc-f"><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label id="sc-dl">Day<select id="sc-d"></select></label><label>Range covered<select id="sc-r"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select></label><label>Send to<input id="sc-to" value="${esc(c.contact.email)}"></label><p class="hint">Phase 1 stores the schedule only. In Phase 2 a Vercel/Supabase cron job renders the report and emails it automatically (see docs/UPGRADE-PLAN.md).</p></div>`,
      foot: `<button class="btn primary" id="sc-save">Save schedule</button>`, onMount(root, close) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const fill = () => { const f = $('#sc-f', root).value; $('#sc-d', root).innerHTML = f === 'weekly' ? days.map((d, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${d}</option>`).join('') : Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}">${i + 1}${['st', 'nd', 'rd'][i] || 'th'} of the month</option>`).join(''); };
        fill(); $('#sc-f', root).onchange = fill;
        $('#sc-save', root).onclick = () => { Store.add('schedules', { cid, freq: $('#sc-f', root).value, day: +$('#sc-d', root).value, range: $('#sc-r', root).value, recipients: $('#sc-to', root).value, active: true }); Store.log(cid, 'Automatic ' + $('#sc-f', root).value + ' report scheduled', 'clock'); toast('Report scheduled'); close(); document.dispatchEvent(new CustomEvent('erm:refresh')); };
      }
    });
  }

  w.Reports = { openBuilder, openSchedule, nextRun, goals, insights, viewsSeries, html, summaryText, sign };
})(window);
