/* ERM-Growth System — data layer.
 *
 *  Metrics.*  : read API for performance data. Phase 1 = deterministic sample data.
 *               Phase 2 = swap `SampleProvider` for `ApiProvider` (Supabase snapshots) — same shape.
 *  Store.*    : CRM records (leads, tasks, invoices…). Phase 1 = localStorage. Phase 2 = Supabase tables.
 */
(function (w) {
  const { iso, addDays, parse, todayISO, uid, PKEYS, diffDays } = U;
  const TODAY = todayISO();
  const HIST = 270; // days of history generated

  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- seed: clients ---------- */
  const SEED_CLIENTS = [
    { id: 'c1', name: 'Bright Smile Dental', color: '#22d3ee', color2: '#6366f1', country: 'US', currency: 'USD', industry: 'Dental clinic', contact: { name: 'Dr. Emily Carter', email: 'emily@brightsmile.demo', phone: '+1 415 555 0142' }, pkg: 'Growth', retainer: 1500, status: 'Active', start: '2025-09-01', end: '2026-08-31', scale: 1.0, seed: 11, login: { email: 'emily@brightsmile.demo', password: 'demo123' }, accounts: { tiktok: '@brightsmile.sf', instagram: '@brightsmiledental', facebook: 'Bright Smile Dental', youtube: '@brightsmile' } },
    { id: 'c2', name: 'Cape Town Coffee Co.', color: '#f59e0b', color2: '#ef4444', country: 'ZA', currency: 'ZAR', industry: 'Café & roastery', contact: { name: 'Thandi Mokoena', email: 'thandi@ctcoffee.demo', phone: '+27 82 555 0198' }, pkg: 'Scale', retainer: 22000, status: 'Active', start: '2025-11-15', end: '2026-11-14', scale: 1.7, seed: 23, login: { email: 'thandi@ctcoffee.demo', password: 'demo123' }, accounts: { tiktok: '@ctcoffeeco', instagram: '@capetowncoffeeco', facebook: 'Cape Town Coffee Co.', youtube: '@ctcoffeeco' } },
    { id: 'c3', name: 'Atlas Fitness', color: '#34d399', color2: '#0ea5e9', country: 'US', currency: 'USD', industry: 'Gym & coaching', contact: { name: 'Marcus Reed', email: 'marcus@atlasfit.demo', phone: '+1 312 555 0177' }, pkg: 'Scale', retainer: 2400, status: 'Active', start: '2026-01-10', end: '2027-01-09', scale: 2.4, seed: 37, login: { email: 'marcus@atlasfit.demo', password: 'demo123' }, accounts: { tiktok: '@atlasfitness', instagram: '@atlasfit', facebook: 'Atlas Fitness', youtube: '@atlasfit' } },
    { id: 'c4', name: 'Karoo Lodge & Safari', color: '#f472b6', color2: '#a855f7', country: 'ZA', currency: 'ZAR', industry: 'Hospitality', contact: { name: 'Pieter van Wyk', email: 'pieter@karoolodge.demo', phone: '+27 71 555 0123' }, pkg: 'Starter', retainer: 12500, status: 'Active', start: '2026-03-01', end: '2026-12-31', scale: .55, seed: 41, login: { email: 'pieter@karoolodge.demo', password: 'demo123' }, accounts: { tiktok: '@karoolodge', instagram: '@karoolodgesafari', facebook: '', youtube: '' } },
    { id: 'c5', name: 'Ubuntu Tutoring', color: '#a3e635', color2: '#14b8a6', country: 'ZA', currency: 'ZAR', industry: 'Education', contact: { name: 'Naledi Dlamini', email: 'naledi@ubuntututors.demo', phone: '+27 60 555 0166' }, pkg: 'Starter', retainer: 9500, status: 'Paused', start: '2025-10-01', end: '2026-09-30', scale: .35, seed: 53, login: { email: 'naledi@ubuntututors.demo', password: 'demo123' }, accounts: { tiktok: '@ubuntututors', instagram: '@ubuntu.tutoring', facebook: '', youtube: '' } }
  ];
  const PLAT_W = { tiktok: 1.0, instagram: .55, facebook: .3, youtube: .42 };
  const POST_TITLES = [
    ['Behind the scenes', '🎬'], ['Quick tip', '💡'], ['Before & after', '✨'], ['Customer story', '💬'], ['Trending sound', '🎵'], ['Day in the life', '☀️'], ['Myth busting', '🧠'], ['Team intro', '👋'], ['Offer of the week', '🔥'], ['How it\'s made', '🛠️'], ['3 mistakes to avoid', '⚠️'], ['Q&A answers', '❓'], ['Time-lapse', '⏱️'], ['Review reaction', '⭐']
  ];

  /* ---------- seed: metrics ---------- */
  const SERIES = {}; // SERIES[cid][platform][iso] = {views,...}
  const POSTS = {};  // POSTS[cid] = []
  const HEAT = {};
  function buildMetrics(c) {
    const r = rng(c.seed), S = SERIES[c.id] = {};
    PKEYS.forEach((p, pi) => {
      if (!c.accounts[p]) { S[p] = null; return; }
      S[p] = {}; let spike = 0;
      const base = 1650 * c.scale * PLAT_W[p]; const avgWatch = [14, 9, 11, 17][pi];
      for (let i = HIST - 1; i >= 0; i--) {
        const d = addDays(TODAY, -i), dow = parse(d).getDay();
        const t = (HIST - 1 - i) / HIST;
        const trend = .45 + t * 1.6 + Math.sin(t * 9 + pi) * .05;
        const week = [1.05, .9, .95, 1, 1.05, 1.15, 1.12][dow];
        if (r() < .01) spike = 1 + r() * 1.6; spike *= .62; if (spike < .05) spike = 0;
        const views = Math.round(base * trend * week * (.8 + r() * .4) * (1 + spike));
        const likeR = .05 + r() * .045 + (pi === 1 ? .02 : 0);
        const likes = Math.round(views * likeR);
        S[p][d] = { views, likes, comments: Math.round(likes * (.05 + r() * .04)), shares: Math.round(likes * (.07 + r() * .06)), saves: Math.round(likes * (.08 + r() * .08)), followers: Math.round(views * (.0012 + r() * .0016)), watch: views * avgWatch * (.85 + r() * .3) / 3600, reach: Math.round(views * (.66 + r() * .12)) };
      }
    });
    // posts
    const connected = PKEYS.filter(p => S[p]); const posts = []; let n = 0;
    for (let i = 0; i < 44; i++) {
      const p = connected[Math.floor(r() * connected.length)];
      const daysAgo = Math.floor(r() * 88); const [t, emoji] = POST_TITLES[Math.floor(r() * POST_TITLES.length)];
      const day = S[p][addDays(TODAY, -daysAgo)]; const mult = r() < .1 ? 6 + r() * 6 : .5 + r() * 2.6;
      const views = Math.round(day.views * mult * (.4 + r() * .4) + 800 * c.scale);
      const lr = .05 + r() * .08; const likes = Math.round(views * lr);
      posts.push({ id: c.id + '-p' + (++n), cid: c.id, platform: p, date: addDays(TODAY, -daysAgo), hour: [7, 8, 11, 12, 13, 17, 18, 19, 20, 21][Math.floor(r() * 10)], title: t, emoji, views, likes, comments: Math.round(likes * (.05 + r() * .05)), shares: Math.round(likes * (.06 + r() * .1)), saves: Math.round(likes * (.07 + r() * .12)), hue: Math.floor(r() * 360) });
    }
    POSTS[c.id] = posts.sort((a, b) => b.date.localeCompare(a.date));
    // heatmap: avg views per post by weekday x 3h slot (sample model; Phase 2 derives from real posts)
    const hm = []; for (let d = 0; d < 7; d++) { hm.push([]); for (let s = 0; s < 8; s++) { const peak = Math.exp(-Math.pow((s - 6.1) / 1.2, 2)) * .9 + Math.exp(-Math.pow((s - 4) / 1, 2)) * .55 + .12; const wk = [.9, .85, .9, 1, 1.05, 1.2, 1.25][d]; hm[d].push(Math.round(2400 * c.scale * peak * wk * (.85 + r() * .3))); } }
    HEAT[c.id] = hm;
  }

  /* ---------- Metrics provider (read API) ---------- */
  const todayExtra = {}; // simulated live increments (Phase 1 only)
  const dayFrac = () => { const n = new Date(); return U.clamp((n.getHours() * 60 + n.getMinutes() + 20) / 1440, .05, 1); };
  function dayRow(cid, p, d, partial) {
    const row = SERIES[cid] && SERIES[cid][p] && SERIES[cid][p][d]; if (!row) return null;
    if (d !== TODAY) return row;
    const f = partial ? dayFrac() : 1, ex = (todayExtra[cid + p] || 0);
    const o = {}; for (const k in row) o[k] = row[k] * f; o.views += ex; o.reach += ex * .7; o.likes += ex * .07; return o;
  }
  const MKEYS = ['views', 'likes', 'comments', 'shares', 'saves', 'followers', 'watch', 'reach'];
  const zero = () => ({ views: 0, likes: 0, comments: 0, shares: 0, saves: 0, followers: 0, watch: 0, reach: 0 });
  function finish(t) { t.engagement = t.views ? (t.likes + t.comments + t.shares + t.saves) / t.views * 100 : 0; return t; }

  const SampleProvider = {
    /** daily rows for [from,to] inclusive; returns {daily:[{d,...}], byPlatform:{p:totals}, totals} */
    range(cid, from, to, platforms) {
      const plats = (platforms && platforms.length ? platforms : PKEYS).filter(p => SERIES[cid] && SERIES[cid][p]);
      const n = diffDays(from, to) + 1, daily = [], byPlatform = {}, totals = zero();
      plats.forEach(p => byPlatform[p] = zero());
      for (let i = 0; i < n; i++) {
        const d = addDays(from, i), row = zero(); row.d = d;
        plats.forEach(p => { const r = dayRow(cid, p, d, n === 1); if (!r) return; MKEYS.forEach(k => { row[k] += r[k]; byPlatform[p][k] += r[k]; totals[k] += r[k]; }); });
        daily.push(row);
      }
      plats.forEach(p => finish(byPlatform[p])); finish(totals);
      return { daily, byPlatform, totals, plats };
    },
    hourly(cid, platforms) { // today's views by hour (cumulative curve)
      const day = SampleProvider.range(cid, TODAY, TODAY, platforms).totals.views; const nowH = new Date().getHours();
      const w = []; for (let h = 0; h <= nowH; h++) w.push(.3 + Math.sin((h - 5) / 18 * Math.PI) ** 2 + (h >= 17 && h <= 21 ? .5 : 0)); const sum = w.reduce((a, b) => a + b, 0) || 1;
      return w.map(x => day * x / sum);
    },
    tick() { // simulates new views arriving — Phase 1 only
      Object.keys(SERIES).forEach(cid => PKEYS.forEach(p => { if (SERIES[cid][p]) { const base = SERIES[cid][p][TODAY].views; todayExtra[cid + p] = (todayExtra[cid + p] || 0) + Math.round(base / 900 * (1 + Math.random() * 3)); } }));
    },
    posts: cid => POSTS[cid] || [],
    heat: cid => HEAT[cid]
  };
  const Provider = SampleProvider; // ← Phase 2: replace with a provider reading Supabase `metric_snapshots`

  const Metrics = {
    PKEYS,
    presetRange(p) { if (p === 'today') return { from: TODAY, to: TODAY }; if (p === '7d') return { from: addDays(TODAY, -6), to: TODAY }; return { from: addDays(TODAY, -29), to: TODAY }; },
    query(cid, { from, to, platforms }) {
      const cur = Provider.range(cid, from, to, platforms);
      const len = diffDays(from, to) + 1;
      const pFrom = addDays(from, -len), pTo = addDays(from, -1);
      const prev = Provider.range(cid, pFrom, pTo, platforms);
      cur.prev = prev; cur.from = from; cur.to = to; cur.len = len; cur.pFrom = pFrom; cur.pTo = pTo;
      cur.growth = k => prev.totals[k] ? (cur.totals[k] - prev.totals[k]) / prev.totals[k] * 100 : 0;
      cur.pgrowth = (p, k) => prev.byPlatform[p] && prev.byPlatform[p][k] ? (cur.byPlatform[p][k] - prev.byPlatform[p][k]) / prev.byPlatform[p][k] * 100 : 0;
      return cur;
    },
    hourly: (cid, plats) => Provider.hourly(cid, plats),
    tick: () => Provider.tick(),
    posts(cid, { from, to, platforms } = {}) { return Provider.posts(cid).filter(p => (!from || p.date >= from) && (!to || p.date <= to) && (!platforms || !platforms.length || platforms.includes(p.platform))); },
    heat: cid => Provider.heat(cid),
    connected: cid => PKEYS.filter(p => SERIES[cid] && SERIES[cid][p]),
    mtd(cid) { const f = TODAY.slice(0, 8) + '01'; return Provider.range(cid, f, TODAY).totals; },
    lastMonth(cid) { const d = parse(TODAY); const a = iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), b = iso(new Date(d.getFullYear(), d.getMonth(), 0)); return Provider.range(cid, a, b).totals; },
    TODAY
  };

  /* ---------- Store (CRM records) ---------- */
  const KEY = 'erm.growth.v1';
  const dAgo = n => addDays(TODAY, -n), dIn = n => addDays(TODAY, n);
  function seedStore() {
    const ENDS = { c1: 75, c2: 200, c3: 330, c4: 38, c5: 20 };
    const clients = SEED_CLIENTS.map(c => ({ ...c, notes: '', logoUrl: '', end: dIn(ENDS[c.id] || 365), start: dAgo(365 - (ENDS[c.id] || 365)) }));
    const leads = [
      { id: 'l1', name: 'Sunrise Pilates Studio', contact: 'Jade Miller', email: 'jade@sunrisepilates.demo', phone: '+1 646 555 0101', stage: 'New', source: 'Instagram DM', value: 1800, currency: 'USD', follow: dIn(1), notes: 'Found us via reel. Wants 3 reels/week.' },
      { id: 'l2', name: 'Drakensberg Adventures', contact: 'Sipho Ndlovu', email: 'sipho@drakadv.demo', phone: '+27 83 555 0102', stage: 'New', source: 'Website', value: 15000, currency: 'ZAR', follow: dIn(2), notes: '' },
      { id: 'l3', name: 'Peak Plumbing Co.', contact: 'Dan Ortiz', email: 'dan@peakplumbing.demo', phone: '+1 720 555 0103', stage: 'Contacted', source: 'Cold outreach', value: 1200, currency: 'USD', follow: dIn(0), notes: 'Sent intro DM + email. Replied "send info".' },
      { id: 'l4', name: 'Stellenbosch Wine Tours', contact: 'Anke Botha', email: 'anke@swt.demo', phone: '+27 72 555 0104', stage: 'Contacted', source: 'Referral', value: 24000, currency: 'ZAR', follow: dIn(3), notes: 'Referred by Karoo Lodge.' },
      { id: 'l5', name: 'GreenLeaf Vegan Kitchen', contact: 'Priya Shah', email: 'priya@greenleaf.demo', phone: '+1 512 555 0105', stage: 'Proposal Sent', source: 'TikTok', value: 2100, currency: 'USD', follow: dIn(-1), notes: 'Proposal sent Monday. Follow up overdue.' },
      { id: 'l6', name: 'Joburg Auto Detailing', contact: 'Kabelo Sithole', email: 'kabelo@jad.demo', phone: '+27 74 555 0106', stage: 'Proposal Sent', source: 'Instagram DM', value: 18000, currency: 'ZAR', follow: dIn(2), notes: '' },
      { id: 'l7', name: 'Lakeside Realty Group', contact: 'Chloe Bennett', email: 'chloe@lakesidere.demo', phone: '+1 404 555 0107', stage: 'Negotiation', source: 'Referral', value: 3200, currency: 'USD', follow: dIn(1), notes: 'Negotiating 6-month term, wants video-only package.' },
      { id: 'l8', name: 'Durban Beach Gym', contact: 'Rashid Khan', email: 'rashid@dbg.demo', phone: '+27 82 555 0108', stage: 'Won', source: 'Website', value: 16500, currency: 'ZAR', follow: dIn(0), notes: 'Signed! Onboarding next week.' },
      { id: 'l9', name: 'Oak & Ember BBQ', contact: 'Tom Hartley', email: 'tom@oakember.demo', phone: '+1 214 555 0109', stage: 'Lost', source: 'Cold outreach', value: 1500, currency: 'USD', follow: dIn(30), notes: 'Went with in-house hire.' },
      { id: 'l10', name: 'Cape Skin Clinic', contact: 'Dr. Lindiwe Zulu', email: 'lindiwe@capeskin.demo', phone: '+27 79 555 0110', stage: 'Contacted', source: 'TikTok', value: 21000, currency: 'ZAR', follow: dIn(4), notes: '' }
    ];
    const tasks = [
      { id: 't1', title: 'Film 6 clips at the clinic', cid: 'c1', assignee: 'u2', due: dIn(1), status: 'todo', priority: 'high' },
      { id: 't2', title: 'Edit week-12 reels batch', cid: 'c3', assignee: 'u2', due: dIn(0), status: 'doing', priority: 'high' },
      { id: 't3', title: 'Build ManyChat DM automation for coffee promo', cid: 'c2', assignee: 'u1', due: dIn(3), status: 'todo', priority: 'med' },
      { id: 't4', title: 'Monthly report — Cape Town Coffee', cid: 'c2', assignee: 'u1', due: dIn(5), status: 'todo', priority: 'med' },
      { id: 't5', title: 'Caption + hashtag research for safari series', cid: 'c4', assignee: 'u2', due: dIn(2), status: 'doing', priority: 'low' },
      { id: 't6', title: 'Send proposal to Joburg Auto Detailing', cid: '', assignee: 'u1', due: dIn(-1), status: 'todo', priority: 'high' },
      { id: 't7', title: 'Update TikTok bio link', cid: 'c3', assignee: 'u2', due: dIn(-2), status: 'done', priority: 'low' },
      { id: 't8', title: 'Quarterly strategy call prep — Atlas Fitness', cid: 'c3', assignee: 'u1', due: dIn(6), status: 'todo', priority: 'med' }
    ];
    const content = [
      { id: 'k1', cid: 'c1', title: '“3 myths about teeth whitening”', platform: 'tiktok', date: dIn(1), status: 'in_progress', approval: 'pending', comments: [], notes: 'Hook: "Your dentist won\'t tell you this…"' },
      { id: 'k2', cid: 'c1', title: 'Smile makeover transformation', platform: 'instagram', date: dIn(3), status: 'in_progress', approval: 'pending', comments: [], notes: 'Needs patient consent form on file.' },
      { id: 'k3', cid: 'c1', title: 'Meet Dr. Carter (team intro)', platform: 'youtube', date: dIn(6), status: 'planned', approval: '', comments: [], notes: '' },
      { id: 'k4', cid: 'c1', title: 'Kids\' first visit tips', platform: 'facebook', date: dAgo(2), status: 'posted', approval: 'approved', comments: [], notes: '' },
      { id: 'k5', cid: 'c2', title: 'Pour-over latte art slow-mo', platform: 'tiktok', date: dIn(1), status: 'in_progress', approval: 'pending', comments: [], notes: 'Trending audio: pending licence check.' },
      { id: 'k6', cid: 'c2', title: 'New Rooibos cold-brew launch', platform: 'instagram', date: dIn(4), status: 'approved', approval: 'approved', comments: [], notes: '' },
      { id: 'k7', cid: 'c2', title: 'A day on the roasting floor', platform: 'youtube', date: dIn(8), status: 'planned', approval: '', comments: [], notes: '' },
      { id: 'k8', cid: 'c3', title: '5-minute abs finisher', platform: 'tiktok', date: dIn(0), status: 'approved', approval: 'approved', comments: [], notes: '' },
      { id: 'k9', cid: 'c3', title: 'Member transformation — Jess', platform: 'instagram', date: dIn(2), status: 'in_progress', approval: 'pending', comments: [], notes: '' },
      { id: 'k10', cid: 'c3', title: 'Coach Q&A: protein myths', platform: 'youtube', date: dIn(5), status: 'planned', approval: '', comments: [], notes: '' },
      { id: 'k11', cid: 'c4', title: 'Sunrise game drive reel', platform: 'instagram', date: dIn(2), status: 'in_progress', approval: 'pending', comments: [], notes: '' },
      { id: 'k12', cid: 'c4', title: 'Room tour: Karoo Suite', platform: 'tiktok', date: dIn(7), status: 'planned', approval: '', comments: [], notes: '' },
      { id: 'k13', cid: 'c3', title: 'Leg-day form check', platform: 'tiktok', date: dAgo(1), status: 'posted', approval: 'approved', comments: [], notes: '' }
    ];
    const invoices = [
      { id: 'i1', no: 'ERM-0001', cid: 'c1', amount: 1500, currency: 'USD', issued: dAgo(150), due: dAgo(136), status: 'paid', recurring: 'monthly', desc: 'Growth retainer' },
      { id: 'i2', no: 'ERM-0002', cid: 'c2', amount: 22000, currency: 'ZAR', issued: dAgo(150), due: dAgo(136), status: 'paid', recurring: 'monthly', desc: 'Scale retainer' },
      { id: 'i3', no: 'ERM-0003', cid: 'c3', amount: 2400, currency: 'USD', issued: dAgo(120), due: dAgo(106), status: 'paid', recurring: 'monthly', desc: 'Scale retainer' },
      { id: 'i4', no: 'ERM-0004', cid: 'c1', amount: 1500, currency: 'USD', issued: dAgo(90), due: dAgo(76), status: 'paid', recurring: 'monthly', desc: 'Growth retainer' },
      { id: 'i5', no: 'ERM-0005', cid: 'c2', amount: 22000, currency: 'ZAR', issued: dAgo(90), due: dAgo(76), status: 'paid', recurring: 'monthly', desc: 'Scale retainer' },
      { id: 'i6', no: 'ERM-0006', cid: 'c3', amount: 2400, currency: 'USD', issued: dAgo(60), due: dAgo(46), status: 'paid', recurring: 'monthly', desc: 'Scale retainer' },
      { id: 'i7', no: 'ERM-0007', cid: 'c4', amount: 12500, currency: 'ZAR', issued: dAgo(60), due: dAgo(46), status: 'paid', recurring: 'monthly', desc: 'Starter retainer' },
      { id: 'i8', no: 'ERM-0008', cid: 'c1', amount: 1500, currency: 'USD', issued: dAgo(30), due: dAgo(16), status: 'paid', recurring: 'monthly', desc: 'Growth retainer' },
      { id: 'i9', no: 'ERM-0009', cid: 'c2', amount: 22000, currency: 'ZAR', issued: dAgo(30), due: dAgo(16), status: 'paid', recurring: 'monthly', desc: 'Scale retainer' },
      { id: 'i10', no: 'ERM-0010', cid: 'c3', amount: 2400, currency: 'USD', issued: dAgo(30), due: dAgo(16), status: 'paid', recurring: 'monthly', desc: 'Scale retainer' },
      { id: 'i11', no: 'ERM-0011', cid: 'c4', amount: 12500, currency: 'ZAR', issued: dAgo(30), due: dAgo(9), status: 'overdue', recurring: 'monthly', desc: 'Starter retainer' },
      { id: 'i14', no: 'ERM-0014', cid: 'c5', amount: 9500, currency: 'ZAR', issued: dAgo(75), due: dAgo(60), status: 'overdue', recurring: 'monthly', desc: 'Starter retainer' },
      { id: 'i15', no: 'ERM-0015', cid: 'c5', amount: 9500, currency: 'ZAR', issued: dAgo(45), due: dAgo(30), status: 'overdue', recurring: 'monthly', desc: 'Starter retainer' },
      { id: 'i12', no: 'ERM-0012', cid: 'c1', amount: 1500, currency: 'USD', issued: dAgo(2), due: dIn(12), status: 'sent', recurring: 'monthly', desc: 'Growth retainer' },
      { id: 'i13', no: 'ERM-0013', cid: 'c3', amount: 800, currency: 'USD', issued: dAgo(5), due: dIn(9), status: 'sent', recurring: '', desc: 'Extra: 8 UGC-style ads' }
    ];
    const proposals = [
      { id: 'p1', title: 'Social Growth Package — GreenLeaf Vegan Kitchen', lead: 'l5', template: 'Growth Package', value: 2100, currency: 'USD', status: 'viewed', sent: dAgo(4), opens: 3 },
      { id: 'p2', title: 'Starter Package — Joburg Auto Detailing', lead: 'l6', template: 'Starter Package', value: 18000, currency: 'ZAR', status: 'sent', sent: dAgo(1), opens: 0 },
      { id: 'p3', title: 'Video-only Retainer — Lakeside Realty', lead: 'l7', template: 'Custom', value: 3200, currency: 'USD', status: 'viewed', sent: dAgo(8), opens: 5 },
      { id: 'p4', title: 'Scale Package — Durban Beach Gym', lead: 'l8', template: 'Scale Package', value: 16500, currency: 'ZAR', status: 'accepted', sent: dAgo(12), opens: 4 }
    ];
    const templates = [
      { id: 'tp1', type: 'email', name: 'Welcome & onboarding', subject: 'Welcome to ERM Marketing 🚀', body: 'Hi {{name}},\n\nWelcome aboard! Here is what happens next:\n1) Kick-off call\n2) Access to your accounts\n3) First content batch within 7 days\n\nBuild | Automate | Grow,\nERM Marketing' },
      { id: 'tp2', type: 'email', name: 'Monthly report ready', subject: 'Your {{month}} performance report', body: 'Hi {{name}},\n\nYour performance report is ready. Highlights: {{views}} views ({{growth}} vs last month).\n\nLog in to your live dashboard any time.\n\nERM Marketing' },
      { id: 'tp3', type: 'email', name: 'Invoice reminder', subject: 'Friendly reminder: invoice {{invoice}}', body: 'Hi {{name}},\n\nJust a friendly nudge that invoice {{invoice}} is now due. Let us know if you need anything.\n\nThanks!' },
      { id: 'tp4', type: 'whatsapp', name: 'Content approval nudge', subject: '', body: 'Hi {{name}} 👋 new content is waiting for your approval in your ERM dashboard. A quick tap keeps us on schedule 🙌' },
      { id: 'tp5', type: 'whatsapp', name: 'Weekly wins', subject: '', body: 'Hi {{name}}! 🚀 This week: {{views}} views ({{growth}}). Full report in your portal.' },
      { id: 'tp6', type: 'whatsapp', name: 'Follow-up after proposal', subject: '', body: 'Hi {{name}}, just checking in on the proposal I sent over. Happy to jump on a quick call to walk through it 🙂' }
    ];
    const comms = [
      { id: 'm1', cid: 'c1', channel: 'email', dir: 'out', subject: 'Welcome to ERM Marketing', date: dAgo(120), by: 'u1' },
      { id: 'm2', cid: 'c1', channel: 'whatsapp', dir: 'in', subject: 'Loved the whitening reel! Can we do more like it?', date: dAgo(6), by: 'u1' },
      { id: 'm3', cid: 'c2', channel: 'call', dir: 'out', subject: 'Monthly review call (30 min)', date: dAgo(9), by: 'u1' },
      { id: 'm4', cid: 'c3', channel: 'email', dir: 'out', subject: 'Q2 strategy deck', date: dAgo(14), by: 'u1' },
      { id: 'm5', cid: 'c4', channel: 'whatsapp', dir: 'out', subject: 'Invoice reminder (ERM-0011)', date: dAgo(3), by: 'u1' }
    ];
    const timeline = [
      { id: 'e1', cid: 'c1', ts: Date.now() - 864e5 * 2, text: 'Invoice ERM-0012 sent', icon: 'dollar' },
      { id: 'e2', cid: 'c1', ts: Date.now() - 864e5 * 6, text: 'Client replied on WhatsApp', icon: 'comment' },
      { id: 'e3', cid: 'c1', ts: Date.now() - 864e5 * 21, text: 'Monthly report generated & sent', icon: 'file' },
      { id: 'e4', cid: 'c2', ts: Date.now() - 864e5 * 4, text: 'Content approved: Rooibos cold-brew launch', icon: 'check' },
      { id: 'e5', cid: 'c3', ts: Date.now() - 864e5 * 1, text: 'Reached 100K views in a week 🎉', icon: 'trend' },
      { id: 'e6', cid: 'c4', ts: Date.now() - 864e5 * 3, text: 'Invoice ERM-0011 marked overdue', icon: 'bell' }
    ];
    const messages = [
      { id: 'n1', cid: 'c1', from: 'agency', text: 'Great news — your whitening myths reel crossed 50K views this week! 🎉 We\'re planning a follow-up series.', date: Date.now() - 864e5 * 1.2 },
      { id: 'n2', cid: 'c1', from: 'client', text: 'Amazing, thank you! Can we feature our new hygienist, Sam?', date: Date.now() - 864e5 * 1 },
      { id: 'n3', cid: 'c2', from: 'agency', text: 'Hi Thandi — the cold-brew launch is approved and scheduled. Please send 3 product photos by Thursday.', date: Date.now() - 864e5 * 2 },
      { id: 'n4', cid: 'c3', from: 'agency', text: 'Atlas hit a new record week. Strategy call booked for Friday to plan the summer challenge.', date: Date.now() - 864e5 * 1 },
      { id: 'n5', cid: 'c4', from: 'agency', text: 'Welcome to your live dashboard, Pieter! Any content requests can be sent from the Requests tab.', date: Date.now() - 864e5 * 6 }
    ];
    const goals = [];
    SEED_CLIENTS.forEach(c => {
      const lm = Metrics.lastMonth(c.id); const nice = x => { const m = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.ceil(x / m) * m; };
      goals.push({ id: 'g' + c.id + 'v', cid: c.id, metric: 'views', label: 'Monthly views', target: nice(lm.views * 1.12) });
      goals.push({ id: 'g' + c.id + 'f', cid: c.id, metric: 'followers', label: 'New followers', target: nice(lm.followers * 1.15) });
      goals.push({ id: 'g' + c.id + 'e', cid: c.id, metric: 'engagement', label: 'Engagement rate', target: 9 });
      goals.push({ id: 'g' + c.id + 'p', cid: c.id, metric: 'posts', label: 'Posts published', target: 20 });
    });
    const schedules = [{ id: 's1', cid: 'c2', freq: 'monthly', day: 1, recipients: 'thandi@ctcoffee.demo', range: '30d', active: true }, { id: 's2', cid: 'c3', freq: 'weekly', day: 1, recipients: 'marcus@atlasfit.demo', range: '7d', active: true }];
    const requests = [{ id: 'r1', cid: 'c1', type: 'Video idea', title: 'Feature hygienist Sam', details: 'Short intro reel for new team member.', platform: 'instagram', due: dIn(10), status: 'New', ts: Date.now() - 864e5 }];
    const team = [
      { id: 'u1', name: 'ERM Founder', email: 'admin@ermmarketing.co', role: 'admin' },
      { id: 'u2', name: 'Lerato Nkosi', email: 'team@ermmarketing.co', role: 'team' }
    ];
    const notifications = [
      { id: 'a1', ts: Date.now() - 36e5 * 2, text: 'Bright Smile Dental viewed their dashboard', icon: 'eye', read: false },
      { id: 'a2', ts: Date.now() - 36e5 * 5, text: 'Invoice ERM-0011 is overdue (Karoo Lodge)', icon: 'bell', read: false },
      { id: 'a3', ts: Date.now() - 36e5 * 20, text: 'Lakeside Realty opened the proposal 5 times', icon: 'file', read: false },
      { id: 'a4', ts: Date.now() - 36e5 * 30, text: 'Follow-up due: GreenLeaf Vegan Kitchen', icon: 'clock', read: true }
    ];
    const settings = { agency: 'ERM Marketing', tagline: 'Build | Automate | Grow', accent1: '#2f6fed', accent2: '#1fa2b8', zarRate: 18.5, whiteLabel: false, email: 'hello@ermmarketing.co' };
    const integrations = { tiktok: false, meta: false, youtube: false, windsor: false, stripe: false, whatsapp: false };
    return { v: 2, clients, leads, tasks, content, invoices, proposals, templates, comms, timeline, messages, goals, schedules, requests, team, notifications, settings, integrations };
  }

  let DB;
  function load() { let old = null; try { old = JSON.parse(localStorage.getItem(KEY)); } catch (e) { } DB = old; if (!DB || DB.v !== 2) { DB = seedStore(); if (old && old.settings) DB.settings = Object.assign(DB.settings, old.settings); save(); }
    else if (DB.settings && DB.settings.accent1 === '#3b82f6' && DB.settings.accent2 === '#8b5cf6') { DB.settings.accent1 = '#2f6fed'; DB.settings.accent2 = '#1fa2b8'; save(); } // migrate old neon default
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { /* storage may be blocked; demo still works in-memory */ } }
  SEED_CLIENTS.forEach(buildMetrics);
  load();

  const Store = {
    get db() { return DB; },
    save,
    reset() { try { localStorage.removeItem(KEY); } catch (e) { } DB = seedStore(); save(); },
    client: id => DB.clients.find(c => c.id === id),
    byClient(coll, cid) { return DB[coll].filter(x => x.cid === cid); },
    add(coll, obj) { obj.id = obj.id || uid(coll[0]); DB[coll].unshift(obj); save(); return obj; },
    remove(coll, id) { DB[coll] = DB[coll].filter(x => x.id !== id); save(); },
    log(cid, text, icon = 'zap') { DB.timeline.unshift({ id: uid('e'), cid, ts: Date.now(), text, icon }); save(); },
    notify(text, icon = 'bell') { DB.notifications.unshift({ id: uid('a'), ts: Date.now(), text, icon, read: false }); save(); },
    toUSD(amount, cur) { return cur === 'ZAR' ? amount / DB.settings.zarRate : amount; },
    mrrUSD() { return DB.clients.filter(c => c.status === 'Active').reduce((a, c) => a + this.toUSD(c.retainer, c.currency), 0); },
    /** Phase 1 only: add a brand-new client (e.g. from a converted lead) with starter sample metrics */
    addClient(c) {
      const seed = Math.floor(Math.random() * 9000) + 100; c.seed = seed; c.scale = c.scale || .3;
      const slug = '@' + c.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18); c.accounts = c.accounts || { tiktok: slug, instagram: slug, facebook: '', youtube: '' }; c.notes = c.notes || ''; c.logoUrl = '';
      DB.clients.push(c); buildMetrics(c); save();
      ['views:Monthly views:' + 20000, 'followers:New followers:300', 'engagement:Engagement rate:8', 'posts:Posts published:16'].forEach(g => { const [m, l, t] = g.split(':'); DB.goals.push({ id: uid('g'), cid: c.id, metric: m, label: l, target: +t }); }); save();
      return c;
    },
    rebuildMetrics(c) { buildMetrics(c); }
  };

  w.Metrics = Metrics; w.Store = Store;
})(window);
