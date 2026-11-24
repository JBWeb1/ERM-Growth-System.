/* ERM-Growth System — scroll motion: reveal-on-scroll · scroll-driven counters & chart drawing · parallax · progress bar ·
 * section scroll-spy dots · back-to-top ring · live results ticker. Respects prefers-reduced-motion. */
(function (w) {
  const { $, $$, ico, esc, fmtN, fmtFull } = U;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const REVEAL = '.view .page-h, .view .toolbar, .view .glass:not(.modal), .view .sec, .view .li, .view .kcol, .view .ccard, .view .tbl-wrap, .view .tile, .view .ticker, .view .hint';
  let io = null, spy = null, spyItems = [], inited = false, ticking = false;

  function ensureChrome() {
    if (!$('#sprog')) { const b = document.createElement('div'); b.id = 'sprog'; document.body.appendChild(b); }
    if (!$('#totop')) { const t = document.createElement('button'); t.id = 'totop'; t.setAttribute('aria-label', 'Back to top'); t.innerHTML = ico('up', 18); t.onclick = () => scrollTo({ top: 0, behavior: 'smooth' }); document.body.appendChild(t); }
  }
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false; const y = scrollY, max = Math.max(1, document.documentElement.scrollHeight - innerHeight), p = Math.min(1, y / max);
      document.documentElement.style.setProperty('--sy', y.toFixed(0));
      const bar = $('#sprog'); if (bar) bar.style.transform = `scaleX(${p})`;
      const tt = $('#totop'); if (tt) { tt.classList.toggle('on', y > 500); tt.style.setProperty('--p', (p * 100).toFixed(0)); }
      const tb = $('.topbar'); if (tb) tb.classList.toggle('scrolled', y > 8);
      if (spyItems.length) { let k = 0; spyItems.forEach((s, i) => { if (s.el.getBoundingClientRect().top < innerHeight * .4) k = i; }); $$('.spy a', spy).forEach((a, i) => a.classList.toggle('on', i === k)); }
    });
  }
  function init() { if (inited) return; inited = true; ensureChrome(); addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll(); }

  function reset() { if (io) { io.disconnect(); io = null; } if (spy) { spy.remove(); spy = null; } spyItems = []; const t = $('#totop'); if (t) t.classList.remove('on'); }

  function scan(root) {
    init(); reset(); if (reduce() || !('IntersectionObserver' in window) || !root) return;
    io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; const el = e.target; io.unobserve(el);
      if (el._mo === 'rv') el.classList.add('rv-in'); else if (el._mo === 'count') U.countEl(el); else if (el._mo === 'draw') el.classList.remove('pd');
    }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    // 1) reveal on scroll (skip elements nested inside another revealed element)
    const els = $$(REVEAL, root).filter(el => !el.parentElement.closest('.rv'));
    const idx = new Map();
    els.forEach(el => {
      const par = el.parentElement, n = idx.get(par) || 0; idx.set(par, n + 1);
      el.classList.add('rv'); el._mo = 'rv'; el.style.transitionDelay = Math.min(n, 8) * 60 + 'ms';
      const grid = par.classList;
      el.dataset.rv = grid.contains('plat-grid') ? (n % 2 ? 'right' : 'left') : (grid.contains('tiles') || grid.contains('tiles4') || grid.contains('tiles5')) ? 'zoom' : 'up';
      io.observe(el);
    });
    // 2) counters count up when they scroll into view
    $$('[data-count]', root).forEach(el => { if (el.getBoundingClientRect().top > innerHeight * .98) { cancelAnimationFrame(el._raf); el.dataset.val = 0; el.textContent = '0'; el._mo = 'count'; io.observe(el); } });
    // 3) charts draw when visible
    $$('svg.chart:not(.noanim), svg.donut', root).forEach(el => { if (el.getBoundingClientRect().top > innerHeight * .9) { el.classList.add('pd'); el._mo = 'draw'; io.observe(el); } });
    // 4) section scroll-spy dots
    const secs = $$('.view .sec', root).filter(h => (h.firstChild && h.firstChild.textContent || '').trim());
    if (secs.length >= 3 && innerWidth > 1100) {
      spyItems = [{ label: 'Top', el: root.querySelector('.view') || root }].concat(secs.map(h => ({ label: h.firstChild.textContent.trim(), el: h })));
      spy = document.createElement('nav'); spy.className = 'spy'; spy.setAttribute('aria-label', 'Sections');
      spy.innerHTML = spyItems.map((s, i) => `<a href="#" data-i="${i}" aria-label="${esc(s.label)}"><span>${esc(s.label)}</span><i></i></a>`).join('');
      spy.onclick = e => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); const s = spyItems[+a.dataset.i]; const y = s.label === 'Top' ? 0 : s.el.getBoundingClientRect().top + scrollY - 90; scrollTo({ top: y, behavior: 'smooth' }); };
      document.body.appendChild(spy);
    }
    onScroll();
  }

  /* infinite "live results" ticker */
  function ticker(c) {
    const q = Metrics.query(c.id, { from: U.addDays(U.todayISO(), -29), to: U.todayISO() }), T = q.totals, top = Metrics.posts(c.id).sort((a, b) => b.views - a.views)[0];
    const items = [`📈 ${fmtN(T.views)} views in the last 30 days`, `👥 +${fmtFull(T.followers)} new followers`, `⚡ ${T.engagement.toFixed(1)}% engagement`, top ? `🏆 Top post: “${top.title}” — ${fmtN(top.views)} views` : '', ...Insights.milestones(c.id).slice(0, 3).map(m => (m.kind === 'viral' ? '🔥 ' : '🎉 ') + m.text)].filter(Boolean);
    const row = items.map(t => `<span>${esc(t)}</span>`).join('');
    return `<div class="ticker" aria-label="Live results"><div class="ticker-t">${row}${row}</div></div>`;
  }

  w.Motion = { scan, reset, ticker, init };
})(window);
