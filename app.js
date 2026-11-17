(() => {
  const root = document.getElementById('njsla');
  if (!root) return;
  const startHash = decodeURIComponent((location.hash || '').slice(1));

  // ---------------------------------------------------------------- constants
  const YEARS = [2022, 2023, 2024, 2025, 2026];
  const NEW_TEST_YEAR = 2026;
  const NEW_TEST = new Set(['EM', 'ELA', 'MATH', 'ELAGP', 'MATGP']);
  const GP = new Set(['ELAGP', 'MATGP']);
  const MIN_N = 20;   // smallest tested count that is ranked or given a change
  const TESTS = ['ELA03', 'ELA04', 'ELA05', 'ELA06', 'ELA07', 'ELA08', 'ELA09', 'MAT03', 'MAT04', 'MAT05', 'MAT06', 'MAT07', 'MAT08',
    'ALG01', 'GEO01', 'ALG02', 'SC05', 'SC08', 'SC11', 'ELAGP', 'MATGP'];
  const GRADE_KEYS = ['3', '4', '5', '6', '7', '8', 'HS'];
  const GT = {
    ELA: { 3: ['ELA03'], 4: ['ELA04'], 5: ['ELA05'], 6: ['ELA06'], 7: ['ELA07'], 8: ['ELA08'], HS: ['ELA09'] },
    MATH: { 3: ['MAT03'], 4: ['MAT04'], 5: ['MAT05'], 6: ['MAT06'], 7: ['MAT07'], 8: ['MAT08'], HS: ['ALG01'] },
    SCI: { 5: ['SC05'], 8: ['SC08'], HS: ['SC11'] },
    ELAGP: { HS: ['ELAGP'] },
    MATGP: { HS: ['MATGP'] },
  };
  GT.EM = Object.fromEntries(GRADE_KEYS.map((k) => [k, [...GT.ELA[k], ...GT.MATH[k]]]));
  const SUBJ_LABEL = { EM: 'ELA + Math', ELA: 'ELA', MATH: 'Math', SCI: 'Science', ELAGP: 'NJGPA ELA', MATGP: 'NJGPA Math' };
  const GROUP_LABEL = {
    ALL: 'All students', BL: 'Black & Latino', AA: 'African American', HI: 'Hispanic', WH: 'White', AS: 'Asian', MR: 'Two or more races / other',
    ED: 'Economically disadvantaged', NED: 'Not economically disadvantaged', ML: 'Multilingual learners', CML: 'Current multilingual learners',
    FML: 'Former multilingual learners', SWD: 'Students with disabilities', SEA: 'Special education accommodation', IEPN: 'No IEP',
    S504: 'Section 504', F: 'Female', M: 'Male',
  };
  const CHART_GROUPS = ['ALL', 'BL', 'AA', 'HI', 'ED', 'NED', 'ML', 'FML', 'SWD', 'F', 'M'];
  const ONLY_2026 = new Set(['IEPN', 'S504']);
  const SCHOOL_GROUPS = new Set(['ALL', 'ED', 'BL', 'AA', 'HI', 'WH', 'AS', 'SWD', 'ML']);
  const CORE = new Set(['ALL', 'ED']);
  const REG = {
    newark: { name: 'Newark', k: '80-7325', d: '13-3570', kname: 'KIPP Newark', since: 2022 },
    camden: { name: 'Camden', k: '07-1799', d: '07-0680', kname: 'KIPP Camden', since: 2022 },
    paterson: { name: 'Paterson', k: '80-7899', d: '31-4010', kname: 'KIPP Paterson', since: 2026 },
  };
  const RKEYS = ['newark', 'camden', 'paterson'];
  const KIPP_IDS = RKEYS.map((r) => REG[r].k);
  const HOST_IDS = RKEYS.map((r) => REG[r].d);
  const COLOR = { K: 'var(--c-k)', D: 'var(--c-d)', C: 'var(--c-c)', S: 'var(--c-s)', SCH: 'var(--c-sch)' };
  const VIEWS = ['regions', 'profile', 'statewide'];
  const DEF = { view: 'regions', region: 'newark', subj: 'ELA', grades: '', year: 2026, group: 'ALL', trend: 'rate', cohort: '7',
    plist: 'bars', pschools: '', slevel: 'lea', smode: 'bars', county: '' };
  const S = { ...DEF };
  let q = '';                              // statewide search text
  let limit = 200;                         // statewide rows shown
  const sortP = { key: 'p', dir: -1 };     // region profile list
  const sortS = { key: 'p', dir: -1 };     // statewide list

  // ---------------------------------------------------------------- small helpers
  const all = (sel) => root.querySelectorAll(sel);
  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const fmtInt = d3.format(',');
  const fmt1 = (v) => v.toFixed(1);
  const fmtPct = (v) => (v == null ? '—' : v.toFixed(1) + '%');
  const fmtPts = (d) => (d > 0.049 ? '+' : d < -0.049 ? '−' : '±') + Math.abs(d).toFixed(1) + ' pts';
  const fmtSigned = (d) => (d > 0.049 ? '+' : d < -0.049 ? '−' : '±') + Math.abs(d).toFixed(1);
  const num = (v) => (v === '' || v == null ? null : Number(v));
  const regionOf = (el) => { const h = el.closest('[data-region]'); return h ? h.dataset.region : S.region; };
  const pen = document.createElement('canvas').getContext('2d');
  const FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  const tw = (s, font) => { if (!pen) return String(s).length * 7; pen.font = (font || '400 12px ') + FAMILY; return pen.measureText(String(s)).width; };
  const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const scoresWord = () => (S.subj === 'EM' ? 'scores' : 'tested');

  // ---------------------------------------------------------------- selection
  const gradesSel = () => (S.grades ? String(S.grades).split(' ').filter(Boolean) : []);
  const testsFor = (subj, grades) => { const m = GT[subj] || {}; return (grades.length ? grades : GRADE_KEYS).flatMap((k) => m[k] || []); };
  let curT = [];
  const gradeRows = () => {
    const sub = S.subj;
    if (GP.has(sub)) return [{ label: 'Grade 11', tests: GT[sub].HS }];
    const rows = GRADE_KEYS.filter((k) => GT[sub][k]).map((k) => ({
      key: k,
      label: k === 'HS' ? (sub === 'ELA' ? 'Grade 9' : sub === 'MATH' ? 'Algebra I' : sub === 'SCI' ? 'Grade 11' : 'Grade 9 ELA + Algebra I') : 'Grade ' + k,
      tests: GT[sub][k],
    }));
    if (sub === 'MATH') rows.push({ label: 'Geometry', tests: ['GEO01'], extra: true }, { label: 'Algebra II', tests: ['ALG02'], extra: true });
    return rows;
  };

  // ---------------------------------------------------------------- data, indexed once per file
  const IDX = new Map();      // `${y}|${id}|${g}` -> { test: [n, p] }
  const LV = new Map();       // `${y}|${id}|${g}` -> { test: [l1..l5] }
  const ENT = new Map();      // id -> entity
  const loaded = new Set();
  let cache = new Map();
  const WIDE = new Set(['leas_core', 'leas_groups', 'schools_core', 'schools_groups']);
  const ingest = (id) => {
    const d = dash.data(id);
    if (d.status !== 'ok') return d.status;
    if (loaded.has(id)) return 'ok';
    loaded.add(id);
    cache = new Map();
    if (id === 'entities') {
      for (const r of d.data) ENT.set(r.id, { id: r.id, kind: r.kind, name: r.name, lea: r.lea, county: r.county || '', city: r.city || '', region: r.region || '', kipp: r.kipp === '1', y0: Number(r.y0), y1: Number(r.y1), ed: num(r.ed), lc: (r.name + ' ' + (r.city || '')).toLowerCase() });
    } else if (WIDE.has(id)) {
      for (const r of d.data) {
        const key = r.y + '|' + r.id + '|' + r.g;
        let rec = IDX.get(key); if (!rec) IDX.set(key, (rec = {}));
        for (const t of TESTS) { const c = r[t]; if (!c) continue; const i = c.indexOf('|'); rec[t] = [i > 0 ? Number(c.slice(0, i)) : null, Number(c.slice(i + 1))]; }
      }
    } else {
      const lv = id === 'regions';
      for (const r of d.data) {
        const key = r.y + '|' + r.id + '|' + r.g;
        let rec = IDX.get(key); if (!rec) IDX.set(key, (rec = {}));
        rec[r.t] = [num(r.n), Number(r.p)];
        if (lv && r.l1 !== '' && r.l1 != null) {
          let l = LV.get(key); if (!l) LV.set(key, (l = {}));
          l[r.t] = [num(r.l1), num(r.l2), num(r.l3), num(r.l4), num(r.l5)];
        }
      }
    }
    return 'ok';
  };
  // true when every dataset named is loaded; otherwise leaves a placeholder in el
  const need = (el, ids, text) => {
    let st = 'ok';
    for (const id of ids) { const s = ingest(id); if (s !== 'ok') st = (s === 'error' || s === 'missing' || st === 'error') ? 'error' : 'loading'; }
    if (st === 'ok') { el.classList.remove('dash-skeleton'); return true; }
    if (text) { el.textContent = '—'; return false; }
    el.replaceChildren();
    if (st === 'loading') el.classList.add('dash-skeleton');
    else { el.classList.remove('dash-skeleton'); el.append(make('p', 'kx-fail', 'Failed to load')); }
    return false;
  };

  // one entity's rate over a set of tests: adds up published scores and proficient scores
  const val = (id, y, g, tests) => {
    const ck = id + '|' + y + '|' + g + '|' + tests.join(' ');
    if (cache.has(ck)) return cache.get(ck);
    const rec = IDX.get(y + '|' + id + '|' + g);
    let out = null;
    if (rec) {
      let n = 0, k = 0, used = 0, hid = 0, lone = null, one = null;
      for (const t of tests) {
        const c = rec[t]; if (!c) continue;
        if (c[0] == null) { hid++; lone = c; continue; }
        n += c[0]; k += Math.round(c[0] * c[1] / 100); used++; one = c;
      }
      if (used) out = { n, k, p: used === 1 ? one[1] : 100 * k / n, used, hid };
      else if (hid === 1 && tests.length === 1) out = { n: null, k: null, p: lone[1], used: 0, hid };
      if (out && g !== 'ALL') {
        const a = val(id, y, 'ALL', tests);
        if (out.hid || (a && a.used > out.used + out.hid)) out.partial = true;
      }
    }
    cache.set(ck, out);
    return out;
  };
  const pool = (ids, y, g, tests) => {
    let n = 0, k = 0, m = 0;
    for (const id of ids) { const v = val(id, y, g, tests); if (v && v.n != null) { n += v.n; k += v.k; m++; } }
    return m ? { n, k, p: 100 * k / n, members: m } : null;
  };
  const nLevels = () => (GP.has(S.subj) ? 2 : S.subj === 'SCI' ? 4 : 5);
  const levels = (ids, y, g, tests) => {
    const L = nLevels(), acc = new Array(L).fill(0); let n = 0;
    for (const id of ids) {
      const rec = IDX.get(y + '|' + id + '|' + g), lv = LV.get(y + '|' + id + '|' + g);
      if (!rec || !lv) continue;
      for (const t of tests) { const c = rec[t], l = lv[t]; if (!c || c[0] == null || !l) continue; for (let i = 0; i < L; i++) acc[i] += (l[i] || 0) * c[0]; n += c[0]; }
    }
    return n ? acc.map((v) => v / n) : null;
  };
  const othersMemo = {};
  const othersOf = (rk) => othersMemo[rk] || (ENT.size ? (othersMemo[rk] = [...ENT.values()].filter((e) => e.region === rk && (e.kind === 'Charter' || e.kind === 'Renaissance') && e.id !== REG[rk].k).map((e) => e.id)) : []);
  const sector = (rk, code, y, g, tests) => (code === 'K' ? val(REG[rk].k, y, g, tests) : code === 'D' ? val(REG[rk].d, y, g, tests)
    : code === 'C' ? pool(othersOf(rk), y, g, tests) : val('NJ', y, g, tests));
  const sectorIds = (rk, code) => (code === 'K' ? [REG[rk].k] : code === 'D' ? [REG[rk].d] : code === 'C' ? othersOf(rk) : ['NJ']);
  const has = (v) => !!v && v.p != null;
  const solid = (v) => has(v) && v.n != null && v.n >= MIN_N;

  // ---------------------------------------------------------------- shared pieces
  const chip = (d, text) => make('span', 'kx-delta ' + (d > 0.049 ? 'up' : d < -0.049 ? 'down' : ''), text || fmtPts(d));
  const dash1 = () => make('span', 'kx-muted', '—');
  const big = (el, v) => {
    el.replaceChildren();
    if (!has(v)) { el.append(make('span', 'kx-none', 'No results published')); return; }
    el.append(fmt1(v.p), make('span', 'kx-unit', '%'));
    if (v.partial) { const f = make('span', 'kx-flag', '◐'); f.title = 'Some grades are hidden for this group'; el.append(f); }
  };
  const nText = (v) => (!has(v) ? '' : v.n == null ? 'Count hidden by the state' : fmtInt(v.n) + ' ' + scoresWord() + (v.members ? ' · ' + v.members + (v.members === 1 ? ' LEA' : ' LEAs') : ''));
  const chgNode = (el, cur, prev) => {
    el.replaceChildren();
    if (!has(cur) || !has(prev)) { el.append(dash1()); return; }
    el.append(chip(cur.p - prev.p), make('small', '', 'from ' + fmtPct(prev.p)));
  };
  const gapNode = (el, a, b) => {
    el.replaceChildren();
    if (!has(a) || !has(b)) { el.append(dash1()); if (has(b)) el.append(make('small', '', fmtPct(b.p))); return; }
    el.append(chip(a.p - b.p), make('small', '', fmtPct(b.p)));
  };
  const tipFor = (host) => { let t = host.querySelector(':scope > .kx-tip'); if (!t) { t = make('div', 'kx-tip'); t.hidden = true; host.append(t); } return t; };
  const showTip = (host, x, y, head, rows) => {
    const t = tipFor(host);
    t.replaceChildren(make('div', 'kx-tip-head', head));
    for (const r of rows) {
      const row = make('div', 'kx-tip-row');
      if (r.color) { const sw = make('span', 'kx-tip-sw'); sw.style.background = r.color; row.append(sw); }
      row.append(make('span', '', r.label), make('span', 'kx-tip-val', r.value));
      t.append(row);
    }
    t.hidden = false;
    const w = t.offsetWidth, h = t.offsetHeight;
    let left = x + 14; if (left + w > host.clientWidth) left = x - w - 14; if (left < 0) left = 0;
    t.style.left = left + 'px';
    t.style.top = Math.max(0, Math.min(y - h / 2, host.clientHeight - h)) + 'px';
  };
  const hideTip = (host) => { const t = host.querySelector(':scope > .kx-tip'); if (t) t.hidden = true; };

  // ---------------------------------------------------------------- line chart
  // cfg: { xs: [{key, label, sub}], series: [{label, color, dashed, width, pts: Map(key -> {y, hollow, tip})}], gap, h, small, mark, aria, unit }
  const lineChart = (el, cfg) => {
    el.replaceChildren();
    const W = Math.max(el.clientWidth, 220), H = cfg.h || 220;
    const ys = cfg.series.flatMap((s) => [...s.pts.values()].map((p) => p.y));
    if (!ys.length) { el.append(make('p', 'kx-empty', cfg.empty || 'No results published for this selection.')); return; }
    let lo, hi;
    if (cfg.gap) { lo = Math.min(-5, Math.floor(d3.min(ys) / 5) * 5); hi = Math.max(5, Math.ceil(d3.max(ys) / 5) * 5); }
    else { lo = 0; hi = Math.min(100, Math.max(20, Math.ceil((d3.max(ys) + 4) / 10) * 10)); }
    const fmtTick = (v) => (cfg.gap ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) : v + '%');
    const fmtEnd = (v) => (cfg.gap ? fmtSigned(v) : fmt1(v) + '%');
    const yTicks = d3.ticks(lo, hi, cfg.small ? 2 : 4);
    const ends = cfg.series.map((s) => { let last = null; for (const x of cfg.xs) { const p = s.pts.get(x.key); if (p) last = { x: x.key, y: p.y }; } return last; });
    const mr = Math.max(...ends.map((e) => (e ? tw(fmtEnd(e.y), '600 12px ') : 0)), 10) + 12;
    const ml = cfg.small ? 6 : Math.max(...yTicks.map((t) => tw(fmtTick(t)))) + 10;
    const mt = 14, mb = cfg.xs.some((x) => x.sub) ? 36 : 22;
    const x = d3.scalePoint().domain(cfg.xs.map((d) => d.key)).range([ml, W - mr]).padding(0.25);
    const y = d3.scaleLinear().domain([lo, hi]).range([H - mb, mt]);
    const svg = d3.select(el).append('svg').attr('class', 'kx-svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img').attr('aria-label', cfg.aria || 'Line chart');
    if (!cfg.small) {
      svg.append('g').selectAll('line').data(yTicks).join('line').attr('class', 'kx-grid-line').attr('x1', ml).attr('x2', W - mr).attr('y1', (d) => y(d)).attr('y2', (d) => y(d));
      svg.append('g').selectAll('text').data(yTicks).join('text').attr('class', 'kx-tick-t').attr('x', ml - 6).attr('y', (d) => y(d)).attr('dy', '0.32em').attr('text-anchor', 'end').text(fmtTick);
    }
    if (cfg.gap) svg.append('line').attr('class', 'kx-zero').attr('x1', ml).attr('x2', W - mr).attr('y1', y(0)).attr('y2', y(0));
    else svg.append('line').attr('class', 'kx-axis-line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(lo)).attr('y2', y(lo));
    if (cfg.mark != null && x(cfg.mark) != null && !cfg.gap) {
      svg.append('line').attr('class', 'kx-newtest').attr('x1', x(cfg.mark)).attr('x2', x(cfg.mark)).attr('y1', mt - 2).attr('y2', H - mb);
      svg.append('text').attr('class', 'kx-newtest-t').attr('x', x(cfg.mark) - 5).attr('y', mt + 6).attr('text-anchor', 'end').text('New test');
    }
    const step = cfg.xs.length > 1 ? x(cfg.xs[1].key) - x(cfg.xs[0].key) : 60;
    const skip = step < 34 ? 2 : 1;
    const gx = svg.append('g');
    cfg.xs.forEach((d, i) => {
      if (i % skip && i !== cfg.xs.length - 1) return;
      gx.append('text').attr('class', 'kx-tick-t').attr('x', x(d.key)).attr('y', H - mb + 16).attr('text-anchor', 'middle').text(d.label);
      if (d.sub) gx.append('text').attr('class', 'kx-tick-t').attr('x', x(d.key)).attr('y', H - mb + 30).attr('text-anchor', 'middle').text(d.sub);
    });
    const line = d3.line().x((d) => x(d.x)).y((d) => y(d.y));
    cfg.series.forEach((s) => {
      const pts = cfg.xs.filter((d) => s.pts.has(d.key)).map((d) => ({ x: d.key, ...s.pts.get(d.key) }));
      if (!pts.length) return;
      const g = svg.append('g');
      g.append('path').attr('class', 'kx-line').attr('d', line(pts)).style('stroke', s.color).attr('stroke-width', s.width || 2).attr('stroke-dasharray', s.dashed ? '5 4' : null);
      if (!s.dashed) g.selectAll('circle').data(pts).join('circle').attr('class', 'kx-dot').attr('cx', (d) => x(d.x)).attr('cy', (d) => y(d.y)).attr('r', s.width > 2 ? 4 : 3)
        .style('fill', (d) => (d.hollow ? '#fff' : s.color)).style('stroke', (d) => (d.hollow ? s.color : null)).attr('stroke-width', (d) => (d.hollow ? 2 : null));
    });
    // end labels, pushed apart so they never meet
    const labs = cfg.series.map((s, i) => (ends[i] ? { s, x: x(ends[i].x), y: y(ends[i].y), v: ends[i].y } : null)).filter(Boolean).sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 13) labs[i].y = labs[i - 1].y + 13;
    const over = labs.length ? labs[labs.length - 1].y - (H - mb + 2) : 0;
    if (over > 0) for (const l of labs) l.y -= over;
    svg.append('g').selectAll('text').data(labs).join('text').attr('class', 'kx-end').attr('x', (d) => d.x + 8).attr('y', (d) => d.y).attr('dy', '0.32em').style('fill', (d) => d.s.color).text((d) => fmtEnd(d.v));
    // hover
    const rule = svg.append('line').attr('class', 'kx-hover').attr('y1', mt).attr('y2', H - mb).attr('visibility', 'hidden');
    svg.append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', H).attr('fill', 'transparent')
      .on('pointermove', (ev) => {
        const [px] = d3.pointer(ev);
        const scale = (el.clientWidth || W) / W;
        let best = cfg.xs[0]; for (const d of cfg.xs) if (Math.abs(x(d.key) - px) < Math.abs(x(best.key) - px)) best = d;
        rule.attr('x1', x(best.key)).attr('x2', x(best.key)).attr('visibility', 'visible');
        const rows = cfg.series.filter((s) => s.pts.has(best.key)).map((s) => { const p = s.pts.get(best.key); return { color: s.color, label: s.label + (p.hollow ? ' (before KIPP)' : ''), value: (cfg.gap ? fmtPts(p.y) : fmtPct(p.y)) + (p.tip ? ' · ' + p.tip : '') }; });
        showTip(el, x(best.key) * scale, mt + 30, best.tip || best.label, rows.length ? rows : [{ label: 'No results', value: '' }]);
      })
      .on('pointerleave', () => { rule.attr('visibility', 'hidden'); hideTip(el); });
  };

  // ---------------------------------------------------------------- bar-and-tick rows
  // cols: [{id, label, kind: 'rank'|'name'|'track'|'num', cls, sort}], rows: [{cls, name, sub, region, bar: {p, color, faded}, ticks: [{p, cls}], ref, cells: {id: {text, cls}}, open}]
  const rowsList = (el, cols, rows, sort, onSort, emptyText) => {
    el.replaceChildren();
    const head = make('div', 'kx-rl-head');
    for (const c of cols) {
      if (c.kind === 'track') { const ax = make('div', 'kx-rl-axis'); for (const [v, t] of [[0, '0'], [50, '50'], [100, '100%']]) { const s = make('span', '', t); s.style.left = v + '%'; ax.append(s); } head.append(ax); continue; }
      const cls = (c.kind === 'num' ? 'c ' : '') + (c.cls || '');
      if (c.sort && sort) {
        const b = make('button', 'kx-sort ' + cls, c.label); b.type = 'button';
        const on = sort.key === c.sort;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) b.classList.add(sort.dir < 0 ? 'is-desc' : 'is-asc');
        b.addEventListener('click', () => { if (sort.key === c.sort) sort.dir = -sort.dir; else { sort.key = c.sort; sort.dir = c.sort === 'name' ? 1 : -1; } onSort(); });
        head.append(b);
      } else head.append(make('span', cls, c.label));
    }
    el.append(head);
    if (!rows.length) { el.append(make('p', 'kx-empty', emptyText || 'No results published for this selection.')); return; }
    const frag = document.createDocumentFragment();
    for (const r of rows) {
      const row = make('div', 'kx-rl-row ' + (r.cls || ''));
      if (r.region) row.dataset.region = r.region;
      if (r.open) {
        row.classList.add('is-link'); row.tabIndex = 0; row.setAttribute('role', 'button');
        row.addEventListener('click', r.open);
        row.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); r.open(); } });
      }
      for (const c of cols) {
        if (c.kind === 'name') {
          const nm = make('div', 'kx-rl-name'); nm.append(make('span', 'nm', r.name)); if (r.sub) nm.append(make('span', 'sub', r.sub)); nm.title = r.name; row.append(nm);
        } else if (c.kind === 'track') {
          const tr = make('div', 'kx-rl-track');
          if (r.bar && r.bar.p != null) { const b = make('span', 'bar'); b.style.width = Math.max(0.4, r.bar.p) + '%'; b.style.background = r.bar.color; if (r.bar.faded) b.style.opacity = 0.45; tr.append(b); }
          for (const t of r.ticks || []) if (t.p != null) { const k = make('span', 'tick ' + (t.cls || '')); k.style.left = t.p + '%'; tr.append(k); }
          if (r.ref != null) { const f = make('span', 'ref'); f.style.left = r.ref + '%'; tr.append(f); }
          row.append(tr);
        } else {
          const cell = (r.cells && r.cells[c.id]) || { text: '' };
          row.append(make('span', (c.kind === 'num' ? 'c ' : '') + (c.cls || '') + ' ' + (cell.cls || ''), cell.text));
        }
      }
      frag.append(row);
    }
    el.append(frag);
  };
  const sortRows = (rows, sort) => rows.sort((a, b) => {
    const av = a.sortv[sort.key], bv = b.sortv[sort.key];
    if (av == null && bv == null) return 0; if (av == null) return 1; if (bv == null) return -1;
    return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * sort.dir;
  });
  const pctCell = (v) => (!has(v) ? { text: v === false ? '' : '—', cls: 'muted' } : { text: fmtPct(v.p) + (v.partial ? ' ◐' : ''), cls: 'c1' });
  const nCell = (v) => (!has(v) ? { text: '' } : v.n == null ? { text: 'hidden', cls: 'muted' } : { text: fmtInt(v.n), cls: 'muted' });
  const diffCell = (a, b, okN) => (!has(a) || !has(b) || (okN && (!solid(a) || !solid(b))) ? { text: '—', cls: 'muted' } : { text: fmtPts(a.p - b.p), cls: a.p - b.p > 0.049 ? 'kx-up' : a.p - b.p < -0.049 ? 'kx-down' : '' });

  // ---------------------------------------------------------------- heat map
  const heatColor = d3.scaleLinear().domain([-25, 0, 25]).range(['#d98300', '#ffffff', '#001E62']).clamp(true);
  const heatList = (el, rows, nameLabel) => {
    el.replaceChildren();
    const wrap = make('div', 'kx-heat-grid'); wrap.style.setProperty('--hcols', YEARS.length);
    const head = make('div', 'kx-heat-row is-head');
    head.append(make('span', '', nameLabel));
    for (const y of YEARS) head.append(make('span', y === NEW_TEST_YEAR && NEW_TEST.has(S.subj) ? 'is-new' : '', String(y)));
    head.append(make('span', '', 'Gap change'));
    wrap.append(head);
    if (!rows.length) { el.append(wrap, make('p', 'kx-empty', 'No results published for this selection.')); return; }
    for (const r of rows) {
      const row = make('div', 'kx-heat-row ' + (r.cls || ''));
      if (r.region) row.dataset.region = r.region;
      const nm = make('div', 'kx-heat-name'); nm.append(make('span', 'nm', r.name)); if (r.sub) nm.append(make('span', 'sub', r.sub)); nm.title = r.name; row.append(nm);
      let first = null, last = null;
      for (const y of YEARS) {
        const v = r.get(y), st = val('NJ', y, S.group, curT);
        if (!has(v)) { row.append(make('span', 'kx-heat-cell is-na', r.exists && r.exists(y) ? '<10' : '')); continue; }
        const cell = make('span', 'kx-heat-cell', fmt1(v.p));
        if (has(st)) {
          const gap = v.p - st.p, col = heatColor(gap);
          cell.style.background = col; if (d3.lab(col).l < 58) cell.classList.add('is-dark');
          cell.title = fmtPts(gap) + ' vs. New Jersey';
          if (v.n == null || v.n >= MIN_N) { if (first == null) first = gap; last = gap; }
        }
        row.append(cell);
      }
      const chg = make('span', 'kx-heat-chg');
      if (first != null && last != null && first !== last) { const d = last - first; chg.textContent = fmtSigned(d); chg.classList.add(d > 0.049 ? 'kx-up' : d < -0.049 ? 'kx-down' : 'kx-muted'); } else { chg.textContent = '—'; chg.classList.add('kx-muted'); }
      row.append(chg);
      wrap.append(row);
    }
    el.append(wrap);
    const key = make('div', 'kx-heat-key');
    key.append(make('span', '', 'Below New Jersey'), make('span', 'kx-heat-ramp'), make('span', '', 'Above · ±25 pts or more at full color'), make('span', 'kx-heat-na'), make('span', '', 'No results'));
    el.append(key);
  };

  // ---------------------------------------------------------------- level bars
  const LV_NAMES = { 5: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'], 4: ['Level 1', 'Level 2', 'Level 3', 'Level 4'], 2: ['Not yet graduation ready', 'Graduation ready'] };
  const LV_CLS = { 5: ['lv1', 'lv2', 'lv3', 'lv4', 'lv5'], 4: ['lv1', 'lv2', 'lv4', 'lv5'], 2: ['lv2', 'lv5'] };
  const levelBars = (el, rows) => {
    el.replaceChildren();
    const L = nLevels(), names = LV_NAMES[L], cls = LV_CLS[L];
    const live = rows.filter((r) => r.lv);
    if (!live.length) { el.append(make('p', 'kx-empty', 'No results published for this selection.')); return; }
    for (const r of rows) {
      const row = make('div', 'kx-lv-row' + (r.gap ? ' is-gap' : ''));
      row.append(make('span', 'kx-lv-name' + (r.kipp ? ' is-kipp' : ''), r.name));
      const bar = make('div', 'kx-lv-bar');
      if (r.lv) {
        const tot = d3.sum(r.lv) || 100;
        r.lv.forEach((v, i) => {
          const seg = make('span', 'kx-lv-seg ' + cls[i], v / tot >= 0.085 ? Math.round(v) + '%' : '');
          seg.style.width = (100 * v / tot) + '%';
          seg.addEventListener('pointermove', (ev) => { const b = el.getBoundingClientRect(); showTip(el, ev.clientX - b.left, ev.clientY - b.top, r.name, r.lv.map((x, j) => ({ label: names[j], value: fmt1(x) + '%' }))); });
          seg.addEventListener('pointerleave', () => hideTip(el));
          bar.append(seg);
        });
      }
      row.append(bar, make('span', 'kx-lv-tot', has(r.v) ? fmtPct(r.v.p) : '—'));
      el.append(row);
    }
  };

  // ---------------------------------------------------------------- labels
  dash.draw('subject-label', (el) => { const g = gradesSel(); el.textContent = SUBJ_LABEL[S.subj] + (g.length && !GP.has(S.subj) ? ' (' + (g.length === 1 ? 'grade ' : 'grades ') + g.join(', ').replace('HS', 'high school') + ')' : ''); });
  dash.draw('year-label', (el) => { el.textContent = String(S.year); });
  dash.draw('prior-label', (el) => { el.textContent = String(S.year - 1); });
  dash.draw('group-label', (el) => { el.textContent = GROUP_LABEL[S.group] || S.group; });
  dash.draw('group-label-lc', (el) => { el.textContent = (GROUP_LABEL[S.group] || S.group).toLowerCase().replace('black & latino', 'Black & Latino').replace('african american', 'African American').replace('hispanic', 'Hispanic').replace('white', 'White').replace('asian', 'Asian').replace('iep', 'IEP'); });
  dash.draw('lv-legend', (el) => {
    const L = nLevels();
    el.replaceChildren(...LV_NAMES[L].map((n, i) => { const li = make('li'); li.append(make('span', 'kx-sw ' + LV_CLS[L][i]), n + (L > 2 && i >= L - 2 ? ' (proficient)' : '')); return li; }));
  });

  // ---------------------------------------------------------------- Our regions
  dash.draw('r-val', (el) => { if (need(el, ['regions'], true)) big(el, val(REG[regionOf(el)].k, S.year, S.group, curT)); });
  dash.draw('r-n', (el) => { if (need(el, ['regions'], true)) el.textContent = nText(val(REG[regionOf(el)].k, S.year, S.group, curT)); });
  dash.draw('r-chg', (el) => { if (need(el, ['regions'], true)) { const k = REG[regionOf(el)].k; chgNode(el, val(k, S.year, S.group, curT), val(k, S.year - 1, S.group, curT)); } });
  dash.draw('r-gap', (el) => {
    if (!need(el, ['regions', 'entities'], true)) return;
    const rk = regionOf(el);
    gapNode(el, sector(rk, 'K', S.year, S.group, curT), sector(rk, el.dataset.vs, S.year, S.group, curT));
  });
  const trendSeries = (rk, codes, gap, y2k) => codes.map((code) => {
    const pts = new Map();
    for (const y of YEARS) {
      const v = sector(rk, code, y, S.group, curT), st = val('NJ', y, S.group, curT);
      if (!has(v) || (gap && !has(st))) continue;
      if (code === 'K' && y < ENT.get(REG[rk].k).y0) continue;
      pts.set(y, { y: gap ? v.p - st.p : v.p, hollow: code === 'K' && y < REG[rk].since, tip: v.n != null ? fmtInt(v.n) + ' ' + scoresWord() : '' });
    }
    return { label: code === 'K' ? REG[rk].kname : code === 'D' ? REG[rk].name + ' district schools' : code === 'C' ? 'Other ' + REG[rk].name + ' charters' : 'New Jersey', color: COLOR[code], dashed: code === 'S', width: code === 'K' ? 3 : 2, pts };
  });
  const yearXs = () => YEARS.map((y) => ({ key: y, label: String(y) }));
  dash.draw('r-spark', (el) => {
    if (!need(el, ['regions', 'entities'])) return;
    const rk = regionOf(el);
    lineChart(el, { xs: YEARS.map((y) => ({ key: y, label: "'" + String(y).slice(2), tip: String(y) })), series: trendSeries(rk, ['D', 'K'], true), gap: true, small: true, h: 104,
      aria: REG[rk].kname + ' and district schools, gap to New Jersey by year' });
  });
  const drawTrend = (el, h) => {
    if (!need(el, ['regions', 'entities'])) return;
    const rk = regionOf(el), gap = S.trend === 'gap';
    lineChart(el, { xs: yearXs(), series: trendSeries(rk, gap ? ['C', 'D', 'K'] : ['S', 'C', 'D', 'K'], gap), gap, h, mark: NEW_TEST.has(S.subj) ? NEW_TEST_YEAR : null,
      aria: REG[rk].name + ': ' + (gap ? 'gap to New Jersey' : 'percent proficient') + ' by year for KIPP, district schools and other charters' });
  };
  dash.draw('r-trend', (el) => drawTrend(el, 230));
  dash.draw('p-trend', (el) => drawTrend(el, 320));

  const MINI_COLS = (first) => [{ id: 'name', label: first, kind: 'name' }, { kind: 'track' }, { id: 'p', label: 'KIPP', kind: 'num' }, { id: 'gap', label: 'vs. district', kind: 'num' }];
  const compareRows = (rk, items, withC) => items.map((it) => {
    const k = sector(rk, 'K', S.year, it.g, it.tests), d = sector(rk, 'D', S.year, it.g, it.tests), st = val('NJ', S.year, it.g, it.tests);
    const c = withC ? sector(rk, 'C', S.year, it.g, it.tests) : null;
    if (!has(k) && !has(d)) return null;
    return { name: it.label, sub: has(k) ? (k.n != null ? fmtInt(k.n) + ' ' + scoresWord() : 'count hidden') : 'KIPP: no results', cls: it.dim ? 'is-dim' : '',
      bar: has(k) ? { p: k.p, color: COLOR.K, faded: it.dim } : null,
      ticks: [{ p: has(d) ? d.p : null }, { p: has(c) ? c.p : null, cls: 'c' }], ref: has(st) ? st.p : null,
      cells: { p: pctCell(k), gap: diffCell(k, d) } };
  }).filter(Boolean);
  const groupItems = () => CHART_GROUPS.map((g) => ({ label: GROUP_LABEL[g], g, tests: curT }));
  const gradeItems = () => { const sel = new Set(gradesSel()); return gradeRows().map((r) => ({ label: r.label, g: S.group, tests: r.tests, dim: r.extra || (sel.size > 0 && r.key && !sel.has(r.key)) })); };
  dash.draw('r-groups', (el) => { if (need(el, ['regions'])) rowsList(el, MINI_COLS('Student group'), compareRows(regionOf(el), groupItems(), false)); });
  dash.draw('r-grades', (el) => { if (need(el, ['regions'])) rowsList(el, MINI_COLS('Grade or course'), compareRows(regionOf(el), gradeItems(), false)); });
  dash.draw('p-groups', (el) => { if (need(el, ['regions', 'entities'])) rowsList(el, MINI_COLS('Student group'), compareRows(S.region, groupItems(), true)); });
  dash.draw('p-grades', (el) => { if (need(el, ['regions', 'entities'])) rowsList(el, MINI_COLS('Grade or course'), compareRows(S.region, gradeItems(), true)); });

  dash.draw('r-cohort', (el) => {
    if (!need(el, ['regions'])) return;
    const rk = regionOf(el), c = Number(S.cohort) || 7;
    if (!['ELA', 'MATH', 'EM'].includes(S.subj)) { el.replaceChildren(make('p', 'kx-empty', 'Pick ELA, Math or Overall to follow a class. Science and NJGPA are not tested every year.')); return; }
    const xs = [], series = [['D', new Map()], ['K', new Map()]];
    for (const y of YEARS) {
      const grade = c - (NEW_TEST_YEAR - y);
      if (grade < 3) continue;
      const tests = (GT[S.subj][String(grade)] || (grade === 9 ? GT[S.subj].HS.filter((t) => t === 'ELA09') : []));
      if (!tests.length) continue;
      xs.push({ key: y, label: 'Gr ' + grade, sub: String(y), tip: 'Grade ' + grade + ', ' + y });
      const st = val('NJ', y, S.group, tests);
      for (const [code, pts] of series) {
        const v = sector(rk, code, y, S.group, tests);
        if (has(v) && has(st)) pts.set(y, { y: v.p - st.p, hollow: code === 'K' && y < REG[rk].since, tip: fmtPct(v.p) + (v.n != null ? ', ' + fmtInt(v.n) + ' ' + scoresWord() : '') });
      }
    }
    lineChart(el, { xs, series: series.map(([code, pts]) => ({ label: code === 'K' ? REG[rk].kname : REG[rk].name + ' district schools', color: COLOR[code], width: code === 'K' ? 3 : 2, pts })), gap: true, h: 220,
      empty: 'No results published for this class.', aria: REG[rk].name + ': one class followed across grades, gap to New Jersey' });
  });

  const levelRow = (name, ids, kipp, gap) => ({ name, kipp, gap, lv: levels(ids, S.year, S.group, curT), v: pool(ids, S.year, S.group, curT) });
  dash.draw('r-levels', (el) => {
    if (!need(el, ['regions'])) return;
    const rows = [];
    RKEYS.forEach((rk, i) => { rows.push(levelRow(REG[rk].kname, [REG[rk].k], true, i > 0), levelRow(REG[rk].name + ' district schools', [REG[rk].d])); });
    rows.push(levelRow('New Jersey', ['NJ'], false, true));
    levelBars(el, rows);
  });
  dash.draw('p-levels', (el) => {
    if (!need(el, ['regions', 'entities'])) return;
    const rk = S.region;
    levelBars(el, [levelRow(REG[rk].kname, [REG[rk].k], true), levelRow('Other ' + REG[rk].name + ' charters', othersOf(rk)), levelRow(REG[rk].name + ' district schools', [REG[rk].d]), levelRow('New Jersey', ['NJ'], false, true)]);
  });

  // ---------------------------------------------------------------- takeaways
  const li = (cls, parts) => { const n = make('li', cls); for (const p of parts) n.append(typeof p === 'string' ? p : make('b', '', p.b)); return n; };
  const aboveBelow = (d) => (Math.abs(d) < 0.05 ? 'level with' : fmt1(Math.abs(d)) + ' pts ' + (d > 0 ? 'above' : 'below'));
  dash.draw('takeaways', (el) => {
    if (!need(el, ['regions', 'entities'])) return;
    const out = [], y = S.year, g = S.group;
    if (!curT.length) { el.replaceChildren(li('is-caveat', ['None of the grades picked are tested in this subject.'])); return; }
    const st = val('NJ', y, g, curT);
    const region = (rk, long) => {
      const k = sector(rk, 'K', y, g, curT), d = sector(rk, 'D', y, g, curT);
      if (!has(k)) { out.push(li('', [{ b: REG[rk].kname }, ' has no published results for this selection.'])); return; }
      const parts = [{ b: REG[rk].kname }, ': ', { b: fmtPct(k.p) }, ' proficient'];
      if (has(d)) parts.push(', ', { b: aboveBelow(k.p - d.p) }, ' ' + REG[rk].name + ' district schools (' + fmtPct(d.p) + ')');
      if (has(st)) parts.push(' and ' + aboveBelow(k.p - st.p) + ' New Jersey');
      parts.push('.');
      const y0 = YEARS.find((yy) => yy >= REG[rk].since && has(val(REG[rk].k, yy, g, curT)) && has(val('NJ', yy, g, curT)));
      if (y0 && y0 < y && has(st)) {
        const g0 = val(REG[rk].k, y0, g, curT).p - val('NJ', y0, g, curT).p, g1 = k.p - st.p;
        parts.push(' Its gap to the state moved from ' + fmtSigned(g0) + ' in ' + y0 + ' to ', { b: fmtSigned(g1) }, ' in ' + y + '.');
      }
      if (long) {
        const ids = [REG[rk].k, ...othersOf(rk)].map((id) => ({ id, v: val(id, y, g, curT) })).filter((o) => solid(o.v)).sort((a, b) => b.v.p - a.v.p);
        const pos = ids.findIndex((o) => o.id === REG[rk].k);
        if (pos >= 0 && ids.length > 1) parts.push(' It ranks ', { b: ordinal(pos + 1) + ' of ' + ids.length }, ' charter and Renaissance LEAs in ' + REG[rk].name + '.');
      }
      out.push(li(has(d) && k.p > d.p ? 'is-bright' : '', parts));
    };
    if (S.view === 'profile') region(S.region, true);
    else {
      if (S.view === 'statewide' && has(st)) {
        const pv = val('NJ', y - 1, g, curT), kn = pool(KIPP_IDS, y, g, curT);
        const parts = [{ b: 'New Jersey' }, ': ', { b: fmtPct(st.p) }, ' proficient'];
        if (has(pv)) parts.push(', ' + (st.p >= pv.p ? 'up ' : 'down ') + fmt1(Math.abs(st.p - pv.p)) + ' pts from ' + (y - 1));
        parts.push('.');
        if (has(kn)) parts.push(' KIPP\'s three New Jersey regions together: ', { b: fmtPct(kn.p) }, ' across ' + fmtInt(kn.n) + ' ' + scoresWord() + '.');
        out.push(li('', parts));
      }
      RKEYS.forEach((rk) => region(rk, false));
    }
    if (NEW_TEST.has(S.subj)) out.push(li('is-caveat', ['2026 is the first year of the new adaptive test, so compare gaps to the state or the district across years, not raw rates.']));
    if ((S.view !== 'profile' || S.region === 'paterson')) out.push(li('is-caveat', ['Paterson Prep first tested in 2024 and joined KIPP for 2025–26. Its 2024 and 2025 results are from before KIPP.']));
    el.replaceChildren(...out);
  });

  // ---------------------------------------------------------------- Region profile
  dash.draw('p-title', (el) => { el.textContent = REG[S.region].name; });
  dash.draw('p-kname', (el) => { el.textContent = REG[S.region].kname; });
  dash.draw('p-badges', (el) => {
    if (!need(el, ['entities', 'regions'], true)) return;
    const rk = S.region, ch = othersOf(rk).filter((id) => has(val(id, S.year, 'ALL', curT))).length;
    const sc = [...ENT.values()].filter((e) => e.region === rk && e.kind === 'School' && e.y0 <= S.year && e.y1 >= S.year).length;
    el.replaceChildren(make('span', 'kx-badge is-key', ENT.get(REG[rk].k).name), make('span', 'kx-badge', ch + ' other charter and Renaissance LEAs with results'), make('span', 'kx-badge', sc + ' district schools tested'));
  });
  const tileSector = (el) => el.closest('[data-sector]').dataset.sector;
  dash.draw('p-val', (el) => { if (need(el, ['regions', 'entities'], true)) big(el, sector(S.region, tileSector(el), S.year, S.group, curT)); });
  dash.draw('p-n', (el) => { if (need(el, ['regions', 'entities'], true)) el.textContent = nText(sector(S.region, tileSector(el), S.year, S.group, curT)); });
  dash.draw('p-chg', (el) => { if (need(el, ['regions', 'entities'], true)) { const c = tileSector(el); chgNode(el, sector(S.region, c, S.year, S.group, curT), sector(S.region, c, S.year - 1, S.group, curT)); } });
  dash.draw('p-gap', (el) => { if (need(el, ['regions', 'entities'], true)) gapNode(el, sector(S.region, tileSector(el), S.year, S.group, curT), sector(S.region, el.dataset.vs, S.year, S.group, curT)); });

  const P_COLS = [{ id: 'name', label: 'Charter, LEA or school', kind: 'name', sort: 'name' }, { kind: 'track' }, { id: 'p', label: 'Proficient', kind: 'num', sort: 'p' },
    { id: 'n', label: 'Tested', kind: 'num', cls: 'hide-narrow', sort: 'n' }, { id: 'chg', label: 'vs. prior yr', kind: 'num', cls: 'hide-narrow', sort: 'chg' }, { id: 'gap', label: 'vs. district', kind: 'num', sort: 'gap' }];
  dash.draw('p-list', (el) => {
    const withSchools = el.dataset.with === 'schools';
    if (!need(el, withSchools ? ['regions', 'entities', 'region_schools'] : ['regions', 'entities'])) return;
    const rk = S.region, y = S.year, g = S.group, R = REG[rk];
    const d = sector(rk, 'D', y, g, curT), st = val('NJ', y, g, curT);
    const mk = (name, sub, cls, color, get, exists) => {
      const v = get(y), pv = get(y - 1);
      return { name, sub, cls, region: cls.includes('is-kipp') ? rk : null, get, exists, v,
        bar: has(v) ? { p: v.p, color } : null, ticks: [{ p: has(pv) ? pv.p : null, cls: 'py' }], ref: has(st) ? st.p : null,
        cells: { p: pctCell(v), n: nCell(v), chg: diffCell(v, pv, true), gap: cls.includes('is-d') ? { text: '' } : diffCell(v, d) },
        sortv: { name, p: has(v) ? v.p : null, n: has(v) ? v.n : null, chg: solid(v) && solid(pv) ? v.p - pv.p : null, gap: has(v) && has(d) ? v.p - d.p : null } };
    };
    const avg = [mk('New Jersey', 'State', 'is-avg', COLOR.S, (yy) => val('NJ', yy, g, curT)),
      mk(R.name + ' district schools', 'District average', 'is-avg is-d', COLOR.D, (yy) => val(R.d, yy, g, curT)),
      mk('Other ' + R.name + ' charters', 'All other charter and Renaissance LEAs, added up', 'is-avg is-last-avg', COLOR.C, (yy) => pool(othersOf(rk), yy, g, curT))];
    const ents = [...ENT.values()].filter((e) => e.region === rk && e.kind !== 'District' && (withSchools || e.kind !== 'School'));
    const rows = ents.map((e) => mk(e.name, e.kind === 'School' ? 'District school' : e.kind + ' LEA', e.kipp ? 'is-kipp' : '', e.kipp ? COLOR.K : e.kind === 'School' ? COLOR.SCH : COLOR.C,
      (yy) => val(e.id, yy, g, curT), (yy) => !!IDX.get(yy + '|' + e.id + '|ALL')))
      .filter((r) => (S.plist === 'heat' ? YEARS.some((yy) => has(r.get(yy))) : has(r.v)));
    sortRows(rows, sortP);
    if (S.plist === 'heat') heatList(el, [...avg, ...rows], 'Charter, LEA or school');
    else rowsList(el, P_COLS, [...avg, ...rows], sortP, () => dash.draw('p-list'));
  });

  // ---------------------------------------------------------------- Statewide
  const sIds = (code) => (code === 'KN' ? KIPP_IDS : code === 'HD' ? HOST_IDS : ['NJ']);
  dash.draw('s-val', (el) => { if (need(el, ['regions'], true)) big(el, pool(sIds(tileSector(el)), S.year, S.group, curT)); });
  dash.draw('s-n', (el) => { if (need(el, ['regions'], true)) { const v = pool(sIds(tileSector(el)), S.year, S.group, curT); el.textContent = has(v) ? fmtInt(v.n) + ' ' + scoresWord() : ''; } });
  dash.draw('s-chg', (el) => { if (need(el, ['regions'], true)) { const ids = sIds(tileSector(el)); chgNode(el, pool(ids, S.year, S.group, curT), pool(ids, S.year - 1, S.group, curT)); } });
  dash.draw('s-gap', (el) => { if (need(el, ['regions'], true)) gapNode(el, pool(sIds(tileSector(el)), S.year, S.group, curT), val('NJ', S.year, S.group, curT)); });

  const sPick = () => { const school = S.slevel === 'school'; return (school ? 'school' : 'lea') + '-' + (CORE.has(S.group) ? 'core' : 'groups'); };
  const sData = (lea) => { const school = !lea && S.slevel === 'school'; const ids = ['entities', school ? 'schools_core' : 'leas_core']; if (!CORE.has(S.group)) ids.push(school ? 'schools_groups' : 'leas_groups'); return ids; };
  const schoolGroupOk = () => S.slevel !== 'school' || SCHOOL_GROUPS.has(S.group);
  const levelEnts = () => [...ENT.values()].filter((e) => (S.slevel === 'school' ? (e.kind === 'School' || e.kind === 'Charter' || e.kind === 'Renaissance')
    : S.slevel === 'charter' ? (e.kind === 'Charter' || e.kind === 'Renaissance') : (e.kind === 'District' || e.kind === 'Charter' || e.kind === 'Renaissance')));
  const kindWord = (e) => (e.kind === 'School' ? e.city : (e.kind === 'District' ? 'District' : e.kind + (e.city ? ' · ' + e.city : '')) + (e.county ? ' · ' + e.county + ' County' : ''));
  const openRegion = (rk) => () => dash.setParams({ view: 'profile', region: rk });
  dash.draw('s-list-title', (el) => { el.textContent = S.slevel === 'school' ? 'Every school' : S.slevel === 'charter' ? 'Every charter' : 'Every district and charter'; });
  dash.draw('s-unit', (el) => { el.textContent = S.slevel === 'school' ? 'school' : S.slevel === 'charter' ? 'charter LEA' : 'district or charter LEA'; });
  const S_COLS = [{ id: 'rank', label: '#', kind: 'rank', cls: 'kx-rank hide-narrow' }, { id: 'name', label: 'Name', kind: 'name', sort: 'name' }, { kind: 'track' }, { id: 'p', label: 'Proficient', kind: 'num', sort: 'p' },
    { id: 'n', label: 'Tested', kind: 'num', cls: 'hide-narrow', sort: 'n' }, { id: 'chg', label: 'vs. prior yr', kind: 'num', cls: 'hide-narrow', sort: 'chg' }, { id: 'gap', label: 'vs. state', kind: 'num', sort: 'gap' }];
  let sShown = { shown: 0, total: 0 };
  dash.draw('s-list', (el) => {
    if (!schoolGroupOk()) { el.classList.remove('dash-skeleton'); el.replaceChildren(make('p', 'kx-empty', 'Pick one of the main student groups to list schools.')); sShown = { shown: 0, total: 0 }; dash.draw('s-count'); return; }
    if (!need(el, sData())) return;
    const y = S.year, g = S.group, st = val('NJ', y, g, curT);
    const mk = (e, pinned) => {
      const get = (yy) => val(e.id, yy, g, curT), v = get(y), pv = get(y - 1);
      const kipp = e.kipp, host = HOST_IDS.includes(e.id);
      return { e, name: e.name, sub: e.id === 'NJ' ? 'State' : kindWord(e), cls: (pinned ? 'is-avg ' : '') + (kipp ? 'is-kipp' : host ? 'is-host' : ''), region: e.region || null, get, v,
        exists: (yy) => !!IDX.get(yy + '|' + e.id + '|ALL'),
        open: e.region ? openRegion(e.region) : null,
        bar: has(v) ? { p: v.p, color: e.id === 'NJ' ? COLOR.S : kipp ? COLOR.K : host ? COLOR.D : e.kind === 'School' ? COLOR.SCH : e.kind === 'District' ? '#8d99ab' : COLOR.C } : null,
        ticks: [{ p: has(pv) ? pv.p : null, cls: 'py' }], ref: has(st) ? st.p : null,
        cells: { rank: { text: '' }, p: pctCell(v), n: nCell(v), chg: diffCell(v, pv, true), gap: e.id === 'NJ' ? { text: '' } : diffCell(v, st) },
        sortv: { name: e.name, p: has(v) ? v.p : null, n: has(v) ? v.n : null, chg: solid(v) && solid(pv) ? v.p - pv.p : null, gap: has(v) && has(st) ? v.p - st.p : null } };
    };
    let rows = levelEnts().map((e) => mk(e, false)).filter((r) => solid(r.v));
    const ranked = [...rows].sort((a, b) => b.v.p - a.v.p);
    ranked.forEach((r, i) => { r.rank = i + 1; r.cells.rank = { text: String(i + 1) }; });
    const total = ranked.length;
    const pinIds = ['NJ', ...RKEYS.flatMap((rk) => (S.slevel === 'lea' ? [REG[rk].k, REG[rk].d] : [REG[rk].k]))];
    const pins = pinIds.map((id) => { const e = ENT.get(id); if (!e) return null; const r = mk(e, true); const hit = ranked.find((x) => x.e.id === id); if (hit) r.cells.rank = { text: String(hit.rank) }; return has(r.v) ? r : null; }).filter(Boolean);
    if (pins.length) pins[pins.length - 1].cls += ' is-last-avg';
    if (S.county) rows = rows.filter((r) => r.e.county === S.county);
    if (q) rows = rows.filter((r) => r.e.lc.includes(q));
    sortRows(rows, sortS);
    const filtered = rows.length;
    rows = rows.slice(0, limit);
    sShown = { shown: rows.length, total: filtered, of: total };
    for (const b of all('#s-more-btn')) b.hidden = rows.length >= filtered;
    const list = [...pins, ...rows];
    if (S.smode === 'heat') heatList(el, list, 'Name'); else rowsList(el, S_COLS, list, sortS, () => dash.draw('s-list'), 'Nothing matches.');
    dash.draw('s-count');
  });
  dash.draw('s-count', (el) => { el.textContent = sShown.total ? 'Showing ' + fmtInt(sShown.shown) + ' of ' + fmtInt(sShown.total) + (sShown.total !== sShown.of ? ' matching rows (' + fmtInt(sShown.of) + ' ranked statewide)' : ' ranked rows') : ''; });

  let scatterNote = '';
  dash.draw('s-scatter', (el) => {
    if (!schoolGroupOk()) { el.classList.remove('dash-skeleton'); el.replaceChildren(make('p', 'kx-empty', 'Pick one of the main student groups to chart schools.')); scatterNote = ''; dash.draw('s-scatter-foot'); return; }
    if (!need(el, sData())) return;
    const y = S.year, g = S.group;
    const pts = [];
    for (const e of levelEnts()) {
      const v = val(e.id, y, g, curT), x = e.ed;
      if (!solid(v) || x == null) continue;
      const cls = e.kipp ? 'K' : (HOST_IDS.includes(e.id) || (e.kind === 'School' && e.region)) ? 'D' : (e.kind === 'Charter' || e.kind === 'Renaissance') ? 'C' : 'O';
      pts.push({ e, x, y: v.p, n: v.n, cls });
    }
    el.replaceChildren();
    if (pts.length < 5) { el.append(make('p', 'kx-empty', 'Not enough published results to chart.')); scatterNote = ''; dash.draw('s-scatter-foot'); return; }
    const W = Math.max(el.clientWidth, 260), H = W > 700 ? 420 : 340, ml = tw('100%') + 12, mr = 14, mt = 12, mb = 40;
    const xs = d3.scaleLinear().domain([0, 100]).range([ml, W - mr]), ys = d3.scaleLinear().domain([0, 100]).range([H - mb, mt]);
    const svg = d3.select(el).append('svg').attr('class', 'kx-svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img')
      .attr('aria-label', 'Scatter of percent proficient against the share of tested students who are economically disadvantaged');
    const ticks = [0, 25, 50, 75, 100];
    svg.append('g').selectAll('line').data(ticks).join('line').attr('class', 'kx-grid-line').attr('x1', ml).attr('x2', W - mr).attr('y1', (d) => ys(d)).attr('y2', (d) => ys(d));
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'kx-tick-t').attr('x', ml - 6).attr('y', (d) => ys(d)).attr('dy', '0.32em').attr('text-anchor', 'end').text((d) => d + '%');
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'kx-tick-t').attr('x', (d) => xs(d)).attr('y', H - mb + 16).attr('text-anchor', (d) => (d === 100 ? 'end' : d === 0 ? 'start' : 'middle')).text((d) => d + '%');
    svg.append('text').attr('class', 'kx-axis-title').attr('x', (ml + W - mr) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text('Economically disadvantaged, share of tested students');
    // least-squares line over every dot
    const mx = d3.mean(pts, (d) => d.x), my = d3.mean(pts, (d) => d.y);
    const sxx = d3.sum(pts, (d) => (d.x - mx) ** 2), sxy = d3.sum(pts, (d) => (d.x - mx) * (d.y - my));
    const slope = sxx ? sxy / sxx : 0, icpt = my - slope * mx, fit = (x) => icpt + slope * x;
    const clampY = (v) => Math.max(0, Math.min(100, v));
    svg.append('line').attr('class', 'kx-fit').attr('x1', xs(0)).attr('x2', xs(100)).attr('y1', ys(clampY(fit(0)))).attr('y2', ys(clampY(fit(100))));
    const order = { O: 0, C: 1, D: 2, K: 3 };
    pts.sort((a, b) => order[a.cls] - order[b.cls]);
    const small = S.slevel === 'school';
    svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', (d) => xs(d.x)).attr('cy', (d) => ys(d.y))
      .attr('r', (d) => (d.cls === 'K' ? 6.5 : d.cls === 'D' && !small ? 6 : d.cls === 'O' ? (small ? 2 : 2.6) : 3.2))
      .style('fill', (d) => (d.cls === 'K' ? COLOR.K : d.cls === 'D' ? COLOR.D : d.cls === 'C' ? COLOR.C : COLOR.SCH))
      .attr('fill-opacity', (d) => (d.cls === 'O' ? 0.55 : d.cls === 'C' ? 0.8 : 1)).attr('stroke', (d) => (d.cls === 'K' || (d.cls === 'D' && !small) ? '#fff' : 'none')).attr('stroke-width', 1.5);
    // labels for the highlighted dots: each takes the first spot that clears the other labels and highlighted dots
    const marks = pts.filter((d) => d.cls === 'K' || (d.cls === 'D' && !small)).sort((a, b) => order[b.cls] - order[a.cls]);
    const boxes = marks.map((d) => ({ x0: xs(d.x) - 7, x1: xs(d.x) + 7, y0: ys(d.y) - 7, y1: ys(d.y) + 7, own: d }));
    const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    const spots = [[-11, 0, 'end'], [11, 0, 'start'], [-9, -13, 'end'], [-9, 13, 'end'], [9, -13, 'start'], [9, 13, 'start'], [0, -17, 'middle'], [0, 17, 'middle'], [-11, -26, 'end'], [-11, 26, 'end'], [11, -26, 'start'], [11, 26, 'start']];
    const labs = [];
    for (const d of marks) {
      const text = d.cls === 'K' ? REG[d.e.region].kname : REG[d.e.region].name + ' district', w = tw(text, '600 12px ');
      let pick = null;
      for (const [dx, dy, anchor] of spots) {
        const x = xs(d.x) + dx, y = ys(d.y) + dy;
        const box = { x0: anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x, y0: y - 7, y1: y + 7 }; box.x1 = box.x0 + w;
        if (box.x0 < ml || box.x1 > W - 2 || box.y0 < 0 || box.y1 > H - mb) continue;
        if (boxes.some((o) => o.own !== d && hit(box, o))) continue;
        pick = { x, y, anchor, text, box }; break;
      }
      if (!pick) continue;
      boxes.push(pick.box); labs.push(pick);
    }
    svg.append('g').selectAll('text').data(labs).join('text').attr('class', 'kx-pt-lab').attr('x', (l) => l.x).attr('y', (l) => l.y).attr('dy', '0.32em').attr('text-anchor', (l) => l.anchor).text((l) => l.text);
    const del = d3.Delaunay.from(pts, (d) => xs(d.x), (d) => ys(d.y));
    const ring = svg.append('circle').attr('r', 8).attr('fill', 'none').attr('stroke', 'var(--kx-strong)').attr('stroke-width', 1.5).attr('visibility', 'hidden');
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'transparent')
      .on('pointermove', (ev) => {
        const [px, py] = d3.pointer(ev), i = del.find(px, py), d = pts[i];
        if (!d || Math.hypot(xs(d.x) - px, ys(d.y) - py) > 28) { ring.attr('visibility', 'hidden'); hideTip(el); return; }
        ring.attr('cx', xs(d.x)).attr('cy', ys(d.y)).attr('visibility', 'visible');
        const sc = (el.clientWidth || W) / W;
        showTip(el, xs(d.x) * sc, ys(d.y), d.e.name, [{ label: '% proficient', value: fmtPct(d.y) }, { label: 'Economically disadvantaged', value: fmtPct(d.x) }, { label: 'Against the statewide pattern', value: fmtPts(d.y - fit(d.x)) }, { label: 'Tested', value: fmtInt(d.n) }]);
      })
      .on('pointerleave', () => { ring.attr('visibility', 'hidden'); hideTip(el); });
    const ks = pts.filter((d) => d.cls === 'K').map((d) => REG[d.e.region].kname + ' ' + fmtPts(d.y - fit(d.x)));
    scatterNote = fmtInt(pts.length) + ' dots. Against the statewide pattern for the same share of economically disadvantaged students: ' + (ks.length ? ks.join(', ') + '.' : 'no KIPP results for this selection.');
    dash.draw('s-scatter-foot');
  });
  dash.draw('s-scatter-foot', (el) => { el.textContent = scatterNote || '—'; });

  dash.draw('s-standing', (el) => {
    const ids = ['entities', 'leas_core']; if (!CORE.has(S.group)) ids.push('leas_groups');
    if (!need(el, ids)) return;
    const g = S.group;
    const leas = [...ENT.values()].filter((e) => e.kind === 'District' || e.kind === 'Charter' || e.kind === 'Renaissance');
    const dist = new Map(YEARS.map((y) => [y, leas.map((e) => val(e.id, y, g, curT)).filter(solid).map((v) => v.p).sort((a, b) => a - b)]));
    const pct = (id, y) => { const v = val(id, y, g, curT), arr = dist.get(y); if (!has(v) || !arr.length) return null; return { pc: 100 * d3.bisectLeft(arr, v.p) / arr.length, rank: arr.length - d3.bisectRight(arr, v.p) + 1, of: arr.length, p: v.p }; };
    el.replaceChildren();
    const thead = make('thead'), hr = make('tr'); hr.append(make('th', '', 'Percentile (rank)'));
    for (const y of YEARS) hr.append(make('th', '', String(y))); hr.append(make('th', '', 'Change')); thead.append(hr);
    const tb = make('tbody');
    for (const rk of RKEYS) for (const [id, name, kipp] of [[REG[rk].k, REG[rk].kname, true], [REG[rk].d, REG[rk].name + ' district schools', false]]) {
      const tr = make('tr', kipp ? 'is-kipp' : ''); if (kipp) tr.dataset.region = rk;
      tr.append(make('td', '', name));
      let first = null, last = null;
      for (const y of YEARS) {
        const td = make('td'), r = (kipp && y < ENT.get(id).y0) ? null : pct(id, y);
        if (!r) td.append(make('span', 'kx-muted', '—'));
        else { td.append(ordinal(Math.max(1, Math.min(99, Math.round(r.pc)))) + ' ', make('small', '', '(' + r.rank + ' of ' + r.of + ')')); if (!kipp || y >= REG[rk].since) { if (first == null) first = r.pc; last = r.pc; } }
        tr.append(td);
      }
      const c = make('td');
      if (first != null && last !== first) { const d = last - first; c.append(make('span', d > 0.5 ? 'kx-up' : d < -0.5 ? 'kx-down' : 'kx-muted', (d > 0 ? '+' : '−') + Math.abs(Math.round(d)))); } else c.append(make('span', 'kx-muted', '—'));
      tr.append(c); tb.append(tr);
    }
    el.append(thead, tb);
  });

  // ---------------------------------------------------------------- controls (listen, and set state attributes only)
  const press = (sel, attr, value) => { for (const b of all(sel)) b.setAttribute('aria-pressed', String(b.dataset[attr]) === String(value) ? 'true' : 'false'); };
  const bind = (sel, fn) => { for (const b of all(sel)) b.addEventListener('click', () => fn(b)); };
  const go = (o) => { limit = 200; dash.setParams(o); };
  bind('[data-view]', (b) => go({ view: b.dataset.view }));
  bind('[data-region-pick]', (b) => go({ region: b.dataset.regionPick }));
  bind('[data-subject]', (b) => go({ subj: b.dataset.subject }));
  bind('[data-gset]', (b) => go({ grades: b.dataset.gset }));
  bind('[data-grade]', (b) => { const cur = new Set(gradesSel()); const k = b.dataset.grade; if (cur.has(k)) cur.delete(k); else cur.add(k); go({ grades: GRADE_KEYS.filter((x) => cur.has(x)).join(' ') }); });
  bind('[data-trend]', (b) => dash.setParams({ trend: b.dataset.trend }));
  bind('[data-plist]', (b) => dash.setParams({ plist: b.dataset.plist }));
  bind('[data-pschools]', () => dash.setParams({ pschools: S.pschools ? '' : '1' }));
  bind('[data-smode]', (b) => dash.setParams({ smode: b.dataset.smode }));
  bind('[data-slevel]', (b) => go({ slevel: b.dataset.slevel }));
  bind('#s-more-btn', () => { limit += 200; dash.draw('s-list'); });
  for (const c of all('[data-open-region]')) {
    c.addEventListener('click', () => go({ view: 'profile', region: c.dataset.openRegion }));
    c.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go({ view: 'profile', region: c.dataset.openRegion }); } });
  }
  const onChange = (sel, fn) => { for (const s of all(sel)) s.addEventListener('change', () => fn(s.value)); };
  onChange('#kx-year', (v) => go({ year: Number(v) }));
  onChange('#kx-group', (v) => go({ group: v }));
  onChange('#kx-cohort', (v) => dash.setParams({ cohort: v }));
  onChange('#kx-county', (v) => go({ county: v }));
  let qTimer = 0;
  for (const inp of all('#kx-search')) inp.addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(() => { q = inp.value.trim().toLowerCase(); limit = 200; dash.draw('s-list'); }, 180); });

  let lastLink = null;
  dash.onData(() => {
    const p = dash.params();
    for (const k of Object.keys(DEF)) S[k] = p[k] == null || p[k] === '' ? DEF[k] : p[k];
    for (const k of ['grades', 'pschools', 'county']) S[k] = p[k] == null ? '' : p[k];
    S.year = Number(S.year) || 2026;
    if (!VIEWS.includes(S.view)) S.view = 'regions';
    if (!REG[S.region]) S.region = 'newark';
    if (!GT[S.subj]) S.subj = 'ELA';
    if (!GROUP_LABEL[S.group]) S.group = 'ALL';
    curT = testsFor(S.subj, GP.has(S.subj) ? [] : gradesSel());

    for (const sec of all('[data-view-panel]')) sec.hidden = sec.dataset.viewPanel !== S.view;
    for (const f of all('[data-only-view]')) f.hidden = f.dataset.onlyView !== S.view;
    press('[data-view]', 'view', S.view);
    press('[data-region-pick]', 'regionPick', S.region);
    press('[data-subject]', 'subject', S.subj);
    press('[data-gset]', 'gset', S.grades);
    press('[data-trend]', 'trend', S.trend);
    press('[data-plist]', 'plist', S.plist);
    press('[data-smode]', 'smode', S.smode);
    press('[data-slevel]', 'slevel', S.slevel);
    const gs = new Set(gradesSel()), gp = GP.has(S.subj);
    for (const b of all('[data-grade]')) { b.setAttribute('aria-pressed', gs.has(b.dataset.grade) ? 'true' : 'false'); b.disabled = gp || !GT[S.subj][b.dataset.grade]; }
    for (const b of all('[data-gset]')) b.disabled = gp || (S.subj === 'SCI' && b.dataset.gset !== '');
    for (const b of all('[data-pschools]')) b.setAttribute('aria-pressed', S.pschools ? 'true' : 'false');
    for (const s of all('#kx-year')) if (document.activeElement !== s) s.value = String(S.year);
    for (const s of all('#kx-group')) if (document.activeElement !== s) s.value = S.group;
    for (const s of all('#kx-cohort')) if (document.activeElement !== s) s.value = String(S.cohort);
    for (const s of all('#kx-county')) if (document.activeElement !== s) s.value = S.county;
    for (const b of all('[data-plist-box]')) b.hidden = b.dataset.plistBox !== (S.pschools ? 'schools' : 'plain');
    const pick = sPick();
    for (const b of all('[data-spick]')) b.hidden = !b.dataset.spick.split(' ').includes(pick);

    const show = (id, on) => { for (const n of all('#' + id)) n.hidden = !on; };
    show('cv-newtest', NEW_TEST.has(S.subj) && curT.length > 0);
    show('cv-alg', (S.subj === 'MATH' || S.subj === 'EM') && (gs.has('7') || gs.has('8')) && !gs.has('HS'));
    show('cv-nograde', curT.length === 0);
    show('cv-em', S.subj === 'EM');
    show('cv-gp22', gp);
    show('cv-group26', ONLY_2026.has(S.group));
    const edg = S.group === 'ED' || S.group === 'NED';
    show('cv-ed26', S.year === 2026 && edg);
    show('cv-paterson26', S.year === 2026 && !edg && ['BL', 'AA', 'HI', 'WH', 'AS', 'MR'].includes(S.group) && (S.view === 'regions' || (S.view === 'profile' && S.region === 'paterson')));
    show('cv-schoolgroup', S.view === 'statewide' && !schoolGroupOk());

    const link = S.view === 'profile' ? 'profile-' + S.region : S.view;
    if (link !== lastLink) { if (lastLink != null && dash.setLink) dash.setLink(link); lastLink = link; }
  });

  // a link that opens on a view: #statewide, #profile-camden
  if (startHash === 'statewide') dash.setParams({ view: 'statewide' });
  else if (startHash.startsWith('profile-') && REG[startHash.slice(8)]) dash.setParams({ view: 'profile', region: startHash.slice(8) });
  else if (startHash === 'profile') dash.setParams({ view: 'profile' });
})();
