/* @ds-bundle: {"format":4,"namespace":"Tracker","components":[{"name":"Logo"},{"name":"Icon"},{"name":"Button"},{"name":"Kbd"},{"name":"Highlight"},{"name":"ImpactMark"},{"name":"StatusMark"},{"name":"EventRow"},{"name":"MetricStrip"},{"name":"SegmentedControl"},{"name":"FilterBar"},{"name":"Sidebar"},{"name":"TimeRuler"},{"name":"CommandPalette"},{"name":"EventDrawer"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  var Fragment = React.Fragment;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) { if (arguments[i]) out.push(arguments[i]); }
    return out.join(' ');
  }
  function omit(obj, keys) {
    var out = {};
    for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) === -1) out[k] = obj[k]; }
    return out;
  }
  var idCounter = 0;
  function useStableId(prefix) {
    var ref = React.useRef(null);
    if (ref.current === null) { idCounter += 1; ref.current = prefix + idCounter; }
    return ref.current;
  }

  /* ---------- Icons: 16 px grid, 1.5 px stroke, square caps, mitre joins ---------- */
  var icons = {
    dashboard: ['M2.75 11.75 A5.25 5.25 0 0 1 13.25 11.75', 'M8 11.75 L10.75 7', 'M1.75 13.75 H14.25'],
    timeline: ['M4 2.75 V13.25', 'M4 4.75 H6', 'M4 8 H6', 'M4 11.25 H6', 'M8.5 4.75 H13.25', 'M8.5 8 H12', 'M8.5 11.25 H13.25'],
    streamline: ['M2.75 4.25 H8.25', 'M5.25 8 H12.75', 'M3.75 11.75 H9.75', 'M11 2 V14'],
    calendar: ['M2.75 3.75 H13.25 V13.25 H2.75 Z', 'M2.75 6.75 H13.25', 'M5.5 2 V5', 'M10.5 2 V5', 'M5.25 9.75 H7.25'],
    overlaps: ['M2.75 6 H10.25', 'M5.75 10 H13.25', 'M5.75 3.75 V12.25', 'M10.25 3.75 V12.25'],
    insights: ['M2.75 13.25 H13.25', 'M4.75 10.5 V13.25', 'M8 7.5 V13.25', 'M11.25 4.5 V13.25'],
    catalog: ['M2.75 2.75 H13.25 V13.25 H2.75 Z', 'M2.75 6.25 H13.25', 'M2.75 9.75 H13.25', 'M7 4.5 H9', 'M7 8 H9', 'M7 11.5 H9'],
    architecture: ['M2.75 2.75 H6.25 V6.25 H2.75 Z', 'M9.75 2.75 H13.25 V6.25 H9.75 Z', 'M6.25 9.75 H9.75 V13.25 H6.25 Z', 'M4.5 6.25 V8 H11.5 V6.25', 'M8 8 V9.75'],
    compliance: ['M3.75 2.75 H12.25 V13.25 H3.75 Z', 'M5.75 8.25 L7.25 9.75 L10.25 6.25'],
    drifts: ['M1.75 11 H5.5 L10.5 5 H14.25', { d: 'M10.5 11 H14.25', dash: '1.5 1.5', cap: 'butt' }],
    rpa: ['M12.25 9.5 A4.5 4.5 0 1 1 11.6 4.9', 'M12 2.25 V5.25 H9'],
    locks: ['M4.25 7.25 H11.75 V13.25 H4.25 Z', 'M5.75 7.25 V5 A2.25 2.25 0 0 1 10.25 5 V7.25', 'M8 9.5 V11'],
    links: ['M7 9 L13.25 2.75', 'M9 2.75 H13.25 V7', 'M11.25 9.5 V13.25 H2.75 V4.75 H6.5'],
    docs: ['M3.75 2.75 H9.5 L12.25 5.5 V13.25 H3.75 Z', 'M9.5 2.75 V5.5 H12.25', 'M5.75 8.25 H10.25', 'M5.75 10.75 H10.25'],
    deployment: ['M8 10.75 V2.75', 'M4.75 6 L8 2.75 L11.25 6', 'M2.75 13.25 H13.25'],
    operation: ['M2.75 5 H13.25', 'M2.75 11 H13.25', 'M6 3.25 V6.75', 'M10 9.25 V12.75'],
    incident: ['M1.75 8.5 H4.75 L6.5 3.75 L9.5 12.25 L11.25 8.5 H14.25'],
    service: ['M2.75 3.25 H13.25 V7.25 H2.75 Z', 'M2.75 8.75 H13.25 V12.75 H2.75 Z', 'M5 5.25 H6', 'M5 10.75 H6'],
    now: ['M8 1.75 V14.25', 'M5.75 1.75 H10.25'],
    rows: ['M2.75 3.5 H13.25', 'M2.75 6.5 H13.25', 'M2.75 9.5 H13.25', 'M2.75 12.5 H13.25'],
    search: ['M11.25 7 A4.25 4.25 0 1 1 2.75 7 A4.25 4.25 0 1 1 11.25 7 Z', 'M10.25 10.25 L13.5 13.5'],
    filter: ['M2.75 4.5 H13.25', 'M4.75 8 H11.25', 'M6.75 11.5 H9.25'],
    plus: ['M8 3 V13', 'M3 8 H13'],
    close: ['M4 4 L12 12', 'M12 4 L4 12'],
    'chevron-down': ['M4.5 6.25 L8 9.75 L11.5 6.25'],
    'arrow-right': ['M2.75 8 H13', 'M9.5 4.5 L13 8 L9.5 11.5'],
    copy: ['M5.75 5.75 H13.25 V13.25 H5.75 Z', 'M10.25 5.75 V2.75 H2.75 V10.25 H5.75'],
    environment: ['M2.75 5.25 L8 2.75 L13.25 5.25 L8 7.75 Z', 'M2.75 8.25 L8 10.75 L13.25 8.25', 'M2.75 11.25 L8 13.75 L13.25 11.25'],
    owner: ['M10.25 5 A2.25 2.25 0 1 1 5.75 5 A2.25 2.25 0 1 1 10.25 5 Z', 'M3.25 13.25 V12.25 A3 3 0 0 1 6.25 9.25 H9.75 A3 3 0 0 1 12.75 12.25 V13.25'],
    impact: ['M9.75 8 A1.75 1.75 0 1 1 6.25 8 A1.75 1.75 0 1 1 9.75 8 Z', 'M4 12 A5.66 5.66 0 0 1 4 4', 'M12 4 A5.66 5.66 0 0 1 12 12'],
    'pull-request': ['M6.25 3.5 A1.75 1.75 0 1 1 2.75 3.5 A1.75 1.75 0 1 1 6.25 3.5 Z', 'M4.5 5.25 V13.25', 'M13.25 12.5 A1.75 1.75 0 1 1 9.75 12.5 A1.75 1.75 0 1 1 13.25 12.5 Z', 'M11.5 10.75 V4.75 H7.75', 'M9.25 3.25 L7.75 4.75 L9.25 6.25'],
    ticket: ['M2.75 4.25 H13.25 V6.5 A1.5 1.5 0 0 0 13.25 9.5 V11.75 H2.75 V9.5 A1.5 1.5 0 0 0 2.75 6.5 Z', 'M9.75 5.75 V6.75 M9.75 7.75 V8.25 M9.75 9.25 V10.25']
  };

  function Icon(props) {
    var size = props.size || 16;
    var paths = icons[props.name] || [];
    var a11y = props.title ? { role: 'img', 'aria-label': props.title } : { 'aria-hidden': 'true' };
    return h('svg', Object.assign({ className: cx('tk-icon', props.className), width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'square', strokeLinejoin: 'miter' }, a11y),
      paths.map(function (p, i) {
        if (typeof p === 'string') return h('path', { key: i, d: p });
        return h('path', { key: i, d: p.d, strokeDasharray: p.dash, strokeLinecap: p.cap || 'square' });
      }));
  }

  /* ---------- Logo ---------- */
  function Logo(props) {
    var size = props.size || 24;
    var showWord = props.word !== false;
    return h('span', { className: 'tk-logo', role: 'img', 'aria-label': 'Tracker' },
      h('svg', { width: size, height: size, viewBox: '0 0 44 44', 'aria-hidden': 'true' },
        h('rect', { x: 0, y: 0, width: 44, height: 44, rx: 8, style: { fill: 'var(--ink)' } }),
        h('rect', { x: 19, y: 12, width: 6, height: 22, rx: 1, style: { fill: 'var(--surface)' } }),
        h('rect', { x: 9, y: 11, width: 26, height: 8, rx: 1.5, style: { fill: 'var(--signature)' } })),
      showWord ? h('span', { className: 'tk-logo__word', 'aria-hidden': 'true', style: { fontSize: Math.round(size * 0.78) + 'px' } }, 'tracker') : null);
  }

  /* ---------- Button, Kbd, Highlight ---------- */
  function Button(props) {
    var variant = props.variant || 'secondary';
    var size = props.size || 'md';
    var iconOnly = props.icon && !props.children;
    var rest = omit(props, ['variant', 'size', 'icon', 'iconRight', 'className', 'children', 'type']);
    return h('button', Object.assign({ type: props.type || 'button', className: cx('tk-btn', 'tk-btn--' + variant, size === 'sm' && 'tk-btn--sm', iconOnly && 'tk-btn--icon', props.className) }, rest),
      props.icon ? h(Icon, { name: props.icon }) : null,
      props.children,
      props.iconRight ? h(Icon, { name: props.iconRight, size: 12 }) : null);
  }

  function Kbd(props) {
    return h('kbd', { className: 'tk-kbd' }, props.children);
  }

  /* ImpactMark: the event touches users (attribute impact = true). Magenta, independent of status. */
  function ImpactMark(props) {
    var label = props.title || 'Users impacted';
    if (props.compact) {
      return h('span', { className: cx('tk-impact-mark', 'tk-impact-mark--compact', props.className), role: 'img', 'aria-label': label, title: label },
        h(Icon, { name: 'impact', size: 12 }));
    }
    return h('span', { className: cx('tk-impact-mark', props.className), title: label },
      h(Icon, { name: 'impact', size: 12 }),
      h('span', null, props.text || 'impact'));
  }

  function Highlight(props) {
    return h('span', { className: cx('tk-hl', props.data && 'tk-hl--data', props.className) }, props.children);
  }

  /* ---------- StatusMark ---------- */
  /* Status glyphs: 16 px grid, round caps (distinct from the square-capped icon set).
     failed = square + ✕, warning = triangle + !, running = open arc + dot, done = circle + ✓, open = empty circle. */
  var STATUSES = ['failed', 'warning', 'running', 'done', 'open'];
  function Glyph(props) {
    var s = props.status;
    var size = props.size || 12;
    var common = { className: cx('tk-glyph', s === 'running' && 'tk-glyph--running'), width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': 'true' };
    var mark = { fill: 'none', className: 'tk-glyph__mark', strokeWidth: 1.75, strokeLinecap: 'round' };
    if (s === 'failed') return h('svg', common,
      h('rect', { x: 1, y: 1, width: 14, height: 14, rx: 3, fill: 'currentColor' }),
      h('path', Object.assign({ d: 'M5.6 5.6 L10.4 10.4 M10.4 5.6 L5.6 10.4' }, mark)));
    if (s === 'warning') return h('svg', common,
      h('path', { d: 'M8 1.2 L15.1 14.4 L0.9 14.4 Z', fill: 'currentColor', stroke: 'currentColor', strokeWidth: 0.8, strokeLinejoin: 'round' }),
      h('path', Object.assign({ d: 'M8 6.3 V9.4 M8 11.9 V12' }, mark)));
    if (s === 'running') return h('svg', common,
      h('path', { d: 'M8 1.75 A6.25 6.25 0 1 1 1.75 8', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' }),
      h('circle', { cx: 8, cy: 8, r: 2.1, fill: 'currentColor' }));
    if (s === 'open') return h('svg', common,
      h('circle', { cx: 8, cy: 8, r: 6.25, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }));
    return h('svg', common,
      h('circle', { cx: 8, cy: 8, r: 6.25, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }),
      h('path', { d: 'M5.1 8.2 L7.1 10.2 L10.9 6.1', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }));
  }

  function StatusMark(props) {
    var s = STATUSES.indexOf(props.status) === -1 ? 'done' : props.status;
    var text = props.text || s;
    if (props.label === false) {
      return h('span', { className: cx('tk-status-glyph', 'tk-tone--' + s, props.className), role: 'img', 'aria-label': text },
        h(Glyph, { status: s, size: props.size || 14 }));
    }
    return h('span', { className: cx('tk-status', 'tk-status--' + s, props.className) },
      h(Glyph, { status: s, size: 12 }),
      h('span', null, text));
  }

  /* ---------- EventRow ---------- */
  function metaText(meta) {
    if (!meta) return '';
    return Array.isArray(meta) ? meta.filter(Boolean).join(' · ') : meta;
  }

  function EventRow(props) {
    var compact = props.density === 'compact';
    var s = props.status || 'done';
    function onKey(e) {
      if ((e.key === 'Enter' || e.key === ' ') && props.onSelect) { e.preventDefault(); props.onSelect(); }
    }
    return h('div', { role: 'option', tabIndex: 0, 'aria-selected': props.selected ? 'true' : 'false', className: cx('tk-row', compact && 'tk-row--compact'), onClick: props.onSelect, onKeyDown: onKey },
      h('span', { className: 'tk-row__time' }, props.time),
      h('span', { className: 'tk-row__body' },
        h('span', { className: 'tk-row__title' }, props.title),
        h('span', { className: 'tk-meta' }, metaText(props.meta))),
      h('span', { className: 'tk-row__status' },
        props.impact ? h(ImpactMark, { compact: true }) : null,
        h(StatusMark, { status: s })));
  }

  function EventList(props) {
    var events = props.events || [];
    return h('div', { role: 'listbox', 'aria-label': props.label || 'Events', className: 'tk-list' },
      events.map(function (ev, i) {
        return h(EventRow, Object.assign({ key: ev.id || i, density: props.density, selected: props.selectedId != null && ev.id === props.selectedId, onSelect: props.onSelect ? function () { props.onSelect(ev); } : undefined }, ev));
      }));
  }

  /* ---------- MetricStrip ---------- */
  function MetricStrip(props) {
    var items = props.items || [];
    return h('div', { className: 'tk-metrics', role: 'group', 'aria-label': props.label || 'Metrics' },
      items.map(function (m, i) {
        return h('div', { key: i, className: 'tk-metric' },
          h('span', { className: 'tk-metric__label' }, m.label),
          h('span', { className: cx('tk-metric__value', m.tone && 'tk-metric__value--' + m.tone) }, m.value),
          m.sub ? h('span', { className: 'tk-metric__sub' }, m.sub) : null,
          m.delta ? h('span', { className: cx('tk-metric__delta', 'tk-metric__delta--' + (m.trend || 'flat')), title: m.trend === 'worse' ? 'Worse than the previous period' : (m.trend === 'better' ? 'Better than the previous period' : 'Compared with the previous period') },
            m.trend === 'worse' ? h(Glyph, { status: 'warning', size: 10 }) : null,
            h('span', null, m.delta)) : null);
      }));
  }

  /* ---------- SegmentedControl ---------- */
  function SegmentedControl(props) {
    var options = props.options || [];
    var controlled = props.value !== undefined;
    var st = React.useState(props.defaultValue || options[0]);
    var value = controlled ? props.value : st[0];
    function pick(o) { if (!controlled) st[1](o); if (props.onChange) props.onChange(o); }
    return h('div', { className: 'tk-seg', role: 'group', 'aria-label': props.label || 'Options' },
      options.map(function (o) {
        return h('button', { key: o, type: 'button', className: 'tk-seg__item', 'aria-pressed': o === value ? 'true' : 'false', onClick: function () { pick(o); } }, o);
      }));
  }

  /* ---------- FilterBar ---------- */
  function FilterBar(props) {
    var init = props.filters || [];
    var st = React.useState(init);
    var filters = props.onRemove ? init : st[0];
    function remove(i) {
      if (props.onRemove) props.onRemove(filters[i], i);
      else st[1](filters.filter(function (_, j) { return j !== i; }));
    }
    return h('div', { className: 'tk-filters', role: 'toolbar', 'aria-label': 'Filters' },
      h(SegmentedControl, { label: 'Period', options: props.periods || ['24h', '7d', '30d'], defaultValue: props.period || (props.periods || ['24h', '7d', '30d'])[1], onChange: props.onPeriodChange }),
      filters.map(function (f, i) {
        return h('span', { key: f.key + ':' + f.value, className: 'tk-token' },
          h('span', { className: 'tk-token__key' }, f.key),
          h('span', null, f.value),
          h('button', { type: 'button', className: 'tk-token__remove', 'aria-label': 'Remove filter ' + f.key + ' ' + f.value, onClick: function () { remove(i); } }, h(Icon, { name: 'close', size: 12 })));
      }),
      h(Button, { variant: 'ghost', size: 'sm', icon: 'plus', onClick: props.onAdd }, 'Filter'),
      h('span', { className: 'tk-filters__spacer' }),
      props.scope ? h('span', { className: 'tk-filters__scope' }, props.scope) : null);
  }

  /* ---------- Sidebar ---------- */
  function Sidebar(props) {
    var groups = props.groups || [];
    var collapsed = !!props.collapsed;
    return h('aside', { className: cx('tk-sidebar', collapsed && 'tk-sidebar--collapsed') },
      props.logo === false ? null : h('a', { href: props.homeHref || '#', className: 'tk-logo', 'aria-label': 'Tracker home', style: { padding: collapsed ? '0' : '2px 6px' } }, h(Logo, { size: collapsed ? 28 : 26, word: !collapsed })),
      h('nav', { className: 'tk-nav', 'aria-label': 'Main' },
        groups.map(function (g) {
          return h('div', { key: g.label, className: 'tk-nav__group', role: collapsed ? 'group' : undefined, 'aria-label': collapsed ? g.label : undefined },
            h('span', { className: 'tk-nav__label' }, g.label),
            g.items.map(function (it) {
              var current = it.name === props.active;
              var hint = it.count != null ? it.name + ' (' + it.count + ')' : it.name;
              return h('a', { key: it.name, href: it.href || '#', className: 'tk-nav__item', 'aria-current': current ? 'page' : undefined, 'aria-label': collapsed ? hint : undefined, title: collapsed ? hint : undefined },
                it.icon ? h(Icon, { name: it.icon }) : null,
                collapsed ? null : h('span', null, it.name),
                it.count != null ? h('span', { className: 'tk-nav__count' }, it.count) : null);
            }));
        })),
      props.onToggle ? h('div', { className: 'tk-sidebar__foot' },
        h(Button, { variant: 'ghost', size: 'sm', icon: collapsed ? 'arrow-right' : 'rows', 'aria-label': collapsed ? 'Expand navigation' : 'Collapse navigation', onClick: props.onToggle }, collapsed ? null : 'Collapse')) : null);
  }

  /* ---------- TimeRuler ---------- */
  function toHours(t) {
    if (typeof t === 'number') return t;
    var p = String(t).split(':');
    return parseInt(p[0], 10) + (parseInt(p[1] || '0', 10) / 60);
  }
  function TimeRuler(props) {
    /* startHour / endHour are the canonical props; from / to stay as aliases (from is reserved on x-import). */
    var from = props.startHour != null ? Number(props.startHour) : (props.from != null ? Number(props.from) : 12);
    var to = props.endHour != null ? Number(props.endHour) : (props.to != null ? Number(props.to) : 18);
    var W = props.width || 600;
    var H = 40;
    var pph = W / (to - from);
    var gid = useStableId('tk-ruler-grid-');
    function x(t) { return (toHours(t) - from) * pph; }
    var majors = [];
    for (var hr = from; hr <= to; hr++) majors.push(hr);
    var marks = props.marks || [];
    var nowX = props.now ? x(props.now) : null;
    var nowLabel = props.now ? 'now ' + props.now : '';
    var chipW = nowLabel.length * 6.2 + 12;
    var chipX = nowX != null ? Math.min(nowX, W - chipW) : 0;
    return h('svg', { className: 'tk-ruler', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'img', 'aria-label': props.label || ('Time axis from ' + from + ':00 to ' + to + ':00' + (props.now ? ', now ' + props.now : '')) },
      h('defs', null, h('pattern', { id: gid, width: 8, height: 8, patternUnits: 'userSpaceOnUse' }, h('path', { d: 'M8 0.5 H0.5 V8', fill: 'none', className: 'tk-ruler__grid', strokeWidth: 1 }))),
      h('rect', { x: 0, y: 0, width: W, height: H, rx: 4, fill: 'url(#' + gid + ')' }),
      majors.map(function (m, i) {
        var mx = (m - from) * pph + 0.5;
        return h(Fragment, { key: m },
          h('line', { x1: mx, y1: 26, x2: mx, y2: H, className: 'tk-ruler__major', strokeWidth: 1 }),
          i < majors.length - 1 ? h('text', { x: mx + 4.5, y: 34, className: 'tk-ruler__label' }, (m < 10 ? '0' : '') + m + ':00') : null);
      }),
      marks.map(function (mk, i) {
        return h('circle', { key: i, cx: x(mk.at), cy: 14, r: 3, className: 'tk-ruler__mark--' + (mk.status || 'done') });
      }),
      nowX != null ? h(Fragment, null,
        h('rect', { x: chipX, y: 4, width: chipW, height: 16, rx: 3, className: 'tk-ruler__chip' }),
        h('text', { x: chipX + 6, y: 15.5, className: 'tk-ruler__chip-text' }, nowLabel),
        h('line', { x1: nowX, y1: 4, x2: nowX, y2: H, className: 'tk-ruler__needle' })) : null);
  }

  /* ---------- CommandPalette ---------- */
  function CommandPalette(props) {
    var qs = React.useState(props.defaultQuery || '');
    var as = React.useState(0);
    var q = qs[0].trim().toLowerCase();
    var groups = (props.groups || []).map(function (g) {
      return { label: g.label, items: g.items.filter(function (it) { return !q || it.label.toLowerCase().indexOf(q) !== -1 || (it.hint || '').toLowerCase().indexOf(q) !== -1; }) };
    }).filter(function (g) { return g.items.length; });
    var flat = [];
    groups.forEach(function (g) { g.items.forEach(function (it) { flat.push(it); }); });
    var active = Math.min(as[0], Math.max(flat.length - 1, 0));
    var listId = useStableId('tk-palette-list-');
    function onKey(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); as[1](Math.min(active + 1, flat.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); as[1](Math.max(active - 1, 0)); }
      else if (e.key === 'Enter' && flat[active] && props.onSelect) { e.preventDefault(); props.onSelect(flat[active]); }
      else if (e.key === 'Escape' && props.onClose) { props.onClose(); }
    }
    var idx = -1;
    return h('div', { className: 'tk-palette', role: 'dialog', 'aria-label': 'Command palette' },
      h('div', { className: 'tk-palette__search' },
        h(Icon, { name: 'search' }),
        h('input', { className: 'tk-palette__input', type: 'text', role: 'combobox', 'aria-expanded': 'true', 'aria-controls': listId, 'aria-activedescendant': flat.length ? listId + '-' + active : undefined, 'aria-label': 'Search or run a command', placeholder: props.placeholder || 'Search events, services, teams — or type a command', value: qs[0], onChange: function (e) { qs[1](e.target.value); as[1](0); }, onKeyDown: onKey, autoFocus: props.autoFocus }),
        h(Kbd, null, 'esc')),
      h('div', { className: 'tk-palette__list', role: 'listbox', id: listId },
        groups.length === 0 ? h('div', { className: 'tk-palette__group' }, 'No results for “' + qs[0] + '”') : null,
        groups.map(function (g) {
          return h('div', { key: g.label, role: 'group', 'aria-label': g.label },
            h('div', { className: 'tk-palette__group', 'aria-hidden': 'true' }, g.label),
            g.items.map(function (it) {
              idx += 1;
              var my = idx;
              return h('div', { key: it.label, id: listId + '-' + my, role: 'option', 'aria-selected': my === active ? 'true' : 'false', className: 'tk-palette__item', onMouseEnter: function () { as[1](my); }, onClick: function () { if (props.onSelect) props.onSelect(it); } },
                it.icon ? h(Icon, { name: it.icon }) : null,
                h('span', { className: 'tk-palette__label' }, it.label),
                it.hint ? h('span', { className: 'tk-palette__hint' }, it.hint) : null,
                it.kbd ? h(Kbd, null, it.kbd) : null);
            }));
        })),
      h('div', { className: 'tk-palette__footer', 'aria-hidden': 'true' },
        h('span', null, '↑ ↓ move'), h('span', null, '↵ open'), h('span', null, 'esc close')));
  }

  /* ---------- EventDrawer ---------- */
  /* Bandeau layout: type, status, title, then the facts people act on (service, environment, owner,
     pull request, ticket) in the header band; user impact as its own full-width band in --impact. */
  var TYPE_ICON = { deployment: 'deployment', operation: 'operation', drift: 'drifts', incident: 'incident', rpa_usage: 'rpa', rpa: 'rpa' };
  function Chip(props) {
    return h('button', { type: 'button', className: 'tk-chip', title: props.hint, 'aria-label': props.hint, onClick: props.onClick },
      h(Icon, { name: props.icon, size: 14 }),
      h('span', { className: 'tk-chip__text' }, props.children));
  }
  function LinkButton(props) {
    if (!props.link) {
      return h('span', { className: 'tk-linkbtn tk-linkbtn--empty' },
        h(Icon, { name: props.icon, size: 14 }),
        h('span', null, props.emptyLabel),
        props.onAdd ? h(Button, { variant: 'ghost', size: 'sm', icon: 'plus', 'aria-label': props.addLabel, onClick: props.onAdd }) : null);
    }
    return h('a', { className: 'tk-linkbtn', href: props.link.href || '#', title: props.link.title, target: props.link.href ? '_blank' : undefined, rel: props.link.href ? 'noopener' : undefined },
      h(Icon, { name: props.icon, size: 14 }),
      h('span', null, (props.prefix || '') + props.link.label),
      h('span', { className: 'tk-linkbtn__ext' }, h(Icon, { name: 'links', size: 12 })));
  }

  function EventDrawer(props) {
    var ev = props.event || {};
    var fields = ev.fields || [];
    var history = ev.history || [];
    var hasFacts = ev.service || ev.environment || ev.owner;
    var hasLinks = ev.pullRequest !== undefined || ev.ticket !== undefined;
    function filter(key, value) { return props.onFilter ? function () { props.onFilter(key, value); } : undefined; }
    var stake = (ev.stakeholders || []).length ? 'Owner ' + ev.owner + ', stakeholders: ' + ev.stakeholders.join(', ') : 'Filter by owner ' + ev.owner;
    return h('section', { className: 'tk-drawer', role: 'dialog', 'aria-modal': 'false', 'aria-label': ev.title || 'Event detail', style: props.style },
      h('header', { className: cx('tk-drawer__head', hasFacts && 'tk-drawer__head--band') },
        h('div', { className: 'tk-drawer__bar' },
          ev.type ? h('span', { className: 'tk-type' }, h(Icon, { name: TYPE_ICON[ev.type] || 'operation', size: 12 }), String(ev.type).replace('_', ' ')) : null,
          h(StatusMark, { status: ev.status }),
          h('span', { className: 'tk-meta' }, ev.time),
          h(Button, { variant: 'ghost', size: 'sm', icon: 'close', 'aria-label': 'Close detail', onClick: props.onClose })),
        h('h2', { className: 'tk-drawer__title' }, ev.title),
        hasFacts ? h('div', { className: 'tk-chips' },
          ev.service ? h(Chip, { icon: 'service', hint: 'Filter by service ' + ev.service, onClick: filter('service', ev.service) }, ev.service) : null,
          ev.environment ? h(Chip, { icon: 'environment', hint: 'Filter by environment ' + ev.environment, onClick: filter('env', ev.environment) }, ev.environment) : null,
          ev.owner ? h(Chip, { icon: 'owner', hint: stake, onClick: filter('owner', ev.owner) }, ev.owner) : null,
          ev.priority ? h('span', { className: 'tk-chip tk-chip--quiet', title: 'Priority' }, ev.priority) : null)
          : (ev.meta ? h('span', { className: 'tk-meta' }, metaText(ev.meta)) : null),
        hasLinks ? h('div', { className: 'tk-links' },
          h(LinkButton, { icon: 'pull-request', link: ev.pullRequest, prefix: 'PR ', emptyLabel: 'no pull request', addLabel: 'Link a pull request', onAdd: props.onLinkPullRequest }),
          h(LinkButton, { icon: 'ticket', link: ev.ticket, emptyLabel: 'no ticket', addLabel: 'Link a ticket', onAdd: props.onLinkTicket })) : null),
      ev.impact === true ? h('div', { className: 'tk-impact', role: 'note' },
        h(Icon, { name: 'impact', size: 16 }),
        h('span', { className: 'tk-impact__title' }, 'Users impacted'),
        ev.impactNote ? h('span', { className: 'tk-impact__note' }, ev.impactNote) : null) : null,
      ev.impact === false ? h('div', { className: 'tk-impact tk-impact--none' },
        h(Icon, { name: 'impact', size: 14 }),
        h('span', null, 'No user impact declared')) : null,
      h('div', { className: 'tk-drawer__body' },
        ev.summary ? h('p', { style: { margin: 0, fontSize: '14px', lineHeight: '21px' } }, ev.summary) : null,
        fields.length ? h('div', null,
          h('h3', { className: 'tk-drawer__section-label' }, 'details'),
          h('dl', { className: 'tk-fields' }, fields.map(function (f) {
            return h(Fragment, { key: f[0] }, h('dt', null, f[0]), h('dd', null, f[2] ? h('a', { href: f[2] }, f[1]) : f[1]));
          }))) : null,
        history.length ? h('div', null,
          h('h3', { className: 'tk-drawer__section-label' }, 'history'),
          h('ol', { className: 'tk-history' }, history.map(function (it, i) {
            return h('li', { key: i },
              h('time', null, it.time),
              h('span', { className: 'tk-history__glyph tk-tone--' + (it.status || 'done') }, h(Glyph, { status: it.status || 'done', size: 12 })),
              h('span', null, it.text));
          }))) : null),
      props.actions === false ? null : h('footer', { className: 'tk-drawer__foot' },
        h(Button, { variant: 'ghost', icon: 'copy' }, 'Copy link'),
        h(Button, { variant: 'secondary', icon: 'locks' }, 'Lock service'),
        h(Button, { variant: 'primary' }, 'Edit event')));
  }

  var api = {
    icons: icons,
    Icon: Icon,
    Logo: Logo,
    Button: Button,
    Kbd: Kbd,
    Highlight: Highlight,
    ImpactMark: ImpactMark,
    StatusMark: StatusMark,
    EventRow: EventRow,
    EventList: EventList,
    MetricStrip: MetricStrip,
    SegmentedControl: SegmentedControl,
    FilterBar: FilterBar,
    Sidebar: Sidebar,
    TimeRuler: TimeRuler,
    CommandPalette: CommandPalette,
    EventDrawer: EventDrawer
  };
  window.Tracker = Object.assign(window.Tracker || {}, api);
})();
