/* Small page runtime for the standalone NJSLA Explorer.
   Loads the CSV files in data/, keeps the filter state, and redraws the page's drawings when data, filters or width change. */
(() => {
  const FILES = ['entities', 'regions', 'region_schools', 'leas_core', 'leas_groups', 'schools_core', 'schools_groups'];
  const cache = new Map();          // dataset id -> { status, data, columns, message }
  const draws = new Map();          // drawing name -> function
  const onDataFns = [];
  const widths = new WeakMap();
  let params = {};
  let queued = false;

  const visible = (el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (n.hasAttribute('hidden')) return false; return el.isConnected; };
  const load = (id) => {
    if (!FILES.includes(id)) { cache.set(id, { status: 'missing', message: 'No data named ' + id }); return; }
    cache.set(id, { status: 'loading' });
    fetch('data/' + id + '.csv')
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then((text) => { const rows = d3.csvParse(text); cache.set(id, { status: 'ok', data: rows, columns: rows.columns }); })
      .catch((e) => { cache.set(id, { status: 'error', message: String((e && e.message) || e) }); })
      .finally(queue);
  };
  const run = (name, el) => { widths.set(el, el.clientWidth); sizes.observe(el); try { draws.get(name)(el); } catch (e) { console.error(name, e); } };
  const drawName = (name) => { if (!draws.has(name)) return; for (const el of document.querySelectorAll('[data-draw="' + name + '"]')) if (visible(el)) run(name, el); };
  const cycle = () => { for (const fn of onDataFns) { try { fn(); } catch (e) { console.error(e); } } for (const name of draws.keys()) drawName(name); };
  const queue = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; cycle(); }); };
  const sizes = new ResizeObserver((entries) => {
    for (const { target: el } of entries) { const w = el.clientWidth; if (widths.get(el) === w || !visible(el)) continue; const name = el.dataset.draw; if (draws.has(name)) run(name, el); }
  });

  window.dash = {
    data: (id) => { if (!cache.has(id)) load(id); const c = cache.get(id), ok = c.status === 'ok'; return { status: c.status, data: ok ? c.data : [], columns: ok ? c.columns : [], message: c.message || '' }; },
    onData: (fn) => { onDataFns.push(fn); try { fn(); } catch (e) { console.error(e); } },
    draw: (name, fn) => { if (fn === undefined) drawName(name); else draws.set(name, fn); },
    params: () => ({ ...params }),
    setParams: (o) => { const next = { ...params }; for (const [k, v] of Object.entries(o || {})) { if (v === null || v === undefined) delete next[k]; else next[k] = v; } params = next; queue(); },
    resetParams: () => { params = {}; queue(); },
    setLink: (name) => { try { history.replaceState(null, '', name ? '#' + name : location.pathname + location.search); } catch (_) { /* ignore */ } },
  };
  // a link clicked or typed while the page is open: #regions, #statewide, #profile-camden
  window.addEventListener('hashchange', () => {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === 'regions' || h === 'statewide' || h === 'profile') window.dash.setParams({ view: h });
    else if (h.startsWith('profile-')) window.dash.setParams({ view: 'profile', region: h.slice(8) });
  });
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(queue).observe(document.getElementById('njsla'), { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    cycle();
  });
})();
