/**
 * GitHub trending briefing, browser half.
 *
 * The plugin's home is a dashboard: KPI tiles, two charts, today's hotspots,
 * the model's Chinese read, the five-day new-project board, and a domain picker
 * that filters both boards. Styling lives in one injected stylesheet so hover,
 * transitions, and breakpoints work.
 */
window.__ModuleLoader__.load({
  id: 'dsh-github-trending',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'github.trending'
    const PANEL_ID = 'gh-trending'

    const en = {
      title: 'GitHub trending',
      eyebrow: 'Daily briefing',
      subtitle: "Today's fastest-moving repositories, grouped by field, with a model-written read.",
      refresh: 'Refresh',
      refreshing: 'Rebuilding…',
      loading: 'Fetching github.com/trending…',
      error: 'Could not load the briefing',
      retry: 'Retry',
      kpiRepos: 'repos trending',
      kpiStars: 'stars gained',
      kpiFresh: 'new projects (5d)',
      kpiLangs: 'languages',
      chartStars: 'Star gain today',
      chartDomains: 'Split by domain',
      today: 'Today’s hotspots',
      summary: 'Summary',
      editors: "Editor's read",
      freshTitle: 'New projects (last 5 days)',
      freshSummary: 'What just launched',
      byDomain: 'Browse by domain',
      all: 'All',
      domainHot: 'Hotspots in',
      domainFresh: 'New projects in',
      daysAgo: 'd ago',
      starsToday: 'stars today',
      repositories: 'repos',
      updated: 'Updated',
      source: 'Source',
      fallback: 'search fallback',
      noData: 'Nothing here today.',
      summaryMissing: 'The model summary is unavailable for this snapshot; retry to rebuild it.',
    }

    const zh = {
      title: 'GitHub 每日热点',
      eyebrow: '每日简报',
      subtitle: '今日增长最快的仓库，按领域分组，并附模型总结。',
      refresh: '刷新',
      refreshing: '重新生成中…',
      loading: '正在抓取 github.com/trending…',
      error: '简报加载失败',
      retry: '重试',
      kpiRepos: '个仓库上榜',
      kpiStars: '今日新增 star',
      kpiFresh: '个新开项目（5 天）',
      kpiLangs: '种语言',
      chartStars: '今日新增 star 榜',
      chartDomains: '领域分布',
      today: '今日热点项目',
      summary: '中文总结',
      editors: '编辑导读',
      freshTitle: '近期新开热点项目',
      freshSummary: '新项目观察',
      byDomain: '按领域浏览',
      all: '全部',
      domainHot: '领域热点',
      domainFresh: '领域新开',
      daysAgo: '天前',
      starsToday: '今日新增',
      repositories: '个仓库',
      updated: '更新于',
      source: '来源',
      fallback: '搜索兜底',
      noData: '今天这个领域没有数据。',
      summaryMissing: '这一份快照没有模型总结，点「重试」重新生成。',
    }

    /** Fixed accent per domain: artwork color, never used for text. */
    const DOMAIN_COLOR = {
      ai: '#7c5cff',
      web: '#2f9bff',
      backend: '#16b8a6',
      data: '#f0a020',
      devtools: '#e0563d',
      security: '#d93f6d',
      systems: '#8a8f98',
      mobile: '#3fbf6f',
      other: '#9aa4ae',
    }

    const CSS = `
.ght-page { box-sizing: border-box; width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden;
  max-width: 1120px; margin: 0 auto; padding: 24px 28px 64px; display: flex; flex-direction: column; gap: 16px;
  background: radial-gradient(80% 40% at 100% 0%, color-mix(in srgb, var(--dsw-alias-brand-primary) 7%, transparent), transparent 70%),
              radial-gradient(60% 40% at 0% 100%, color-mix(in srgb, #7c5cff 6%, transparent), transparent 70%),
              var(--dsw-alias-bg-base); }
.ght-page *, .ght-page *::before, .ght-page *::after { box-sizing: border-box; }
/* Keep every block at its natural height: a flex child with overflow:hidden
   collapses to zero here, which clipped the hero and every panel below it. */
.ght-page > * { flex: 0 0 auto; min-height: 0; }

.ght-hero { position: relative; overflow: hidden; border: 0.5px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, var(--dsw-alias-border-l1));
  border-radius: 20px; padding: 26px 28px; display: flex; flex-direction: column; gap: 18px;
  background: radial-gradient(120% 160% at 100% 0%, color-mix(in srgb, var(--dsw-alias-brand-primary) 26%, transparent), transparent 58%),
              radial-gradient(90% 130% at 0% 110%, color-mix(in srgb, #7c5cff 20%, transparent), transparent 62%),
              var(--dsw-alias-bg-layer-1); }
.ght-hero::after { content: ''; position: absolute; right: -60px; top: -80px; width: 260px; height: 260px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--dsw-alias-brand-primary) 26%, transparent), transparent 68%);
  filter: blur(18px); pointer-events: none; }
.ght-hero-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.ght-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--dsw-alias-brand-primary); font-weight: 500; }
.ght-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent); }
.ght-title { margin: 8px 0 0; font-size: 28px; line-height: 1.14; font-weight: 500; letter-spacing: -0.02em;
  color: var(--dsw-alias-label-primary); }
.ght-date { color: var(--dsw-alias-label-tertiary); font-weight: 400; }
.ght-sub { margin: 8px 0 0; font-size: 12.5px; line-height: 1.55; color: var(--dsw-alias-label-secondary); max-width: 62ch; }

.ght-btn { appearance: none; border: 0.5px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, var(--dsw-alias-border-l1));
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; padding: 7px 15px; border-radius: 10px;
  cursor: pointer; white-space: nowrap; transition: transform .15s ease, background .15s ease; }
.ght-btn:hover:not(:disabled) { transform: translateY(-1px); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 20%, var(--dsw-alias-bg-layer-1)); }
.ght-btn:disabled { opacity: .55; cursor: default; }

.ght-kpis { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.ght-kpi { border: 0.5px solid var(--dsw-alias-border-l1); border-radius: 14px; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 3px; }
.ght-kpi-value { font-size: 25px; line-height: 1.08; font-weight: 500; letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums; }
.ght-kpi-label { font-size: 11px; color: var(--dsw-alias-label-secondary); }

.ght-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: stretch; }
.ght-panel { border: 0.5px solid var(--dsw-alias-border-l1); border-radius: 18px; background: var(--dsw-alias-bg-layer-1);
  padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; min-width: 0; flex: 1 1 420px; }
.ght-panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.ght-panel-title { margin: 0; font-size: 13.5px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.ght-hint { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); }

.ght-read { border: 0.5px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, var(--dsw-alias-border-l1));
  border-left: 3px solid var(--dsw-alias-brand-primary); border-radius: 16px; padding: 16px 20px;
  display: flex; flex-direction: column; gap: 8px;
  background: linear-gradient(100deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent), transparent 78%),
              var(--dsw-alias-bg-layer-1); }
.ght-read-label { font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--dsw-alias-brand-primary); font-weight: 500; }
.ght-read-text { margin: 0; font-size: 15px; line-height: 1.85; color: var(--dsw-alias-label-primary); }

.ght-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); gap: 10px; }
.ght-card { position: relative; border: 0.5px solid var(--dsw-alias-border-l1); border-radius: 14px;
  padding: 14px 15px; display: flex; flex-direction: column; gap: 7px; min-width: 0;
  transition: transform .15s ease, border-color .15s ease; }
.ght-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, var(--dsw-alias-border-l1)); }
.ght-card-top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.ght-rank { flex: none; width: 20px; height: 20px; border-radius: 7px; display: grid; place-items: center;
  font-size: 10.5px; color: var(--dsw-alias-label-tertiary); background: var(--dsw-alias-bg-layer-2);
  font-variant-numeric: tabular-nums; }
.ght-rank.top { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent);
  color: var(--dsw-alias-brand-primary); font-weight: 500; }
.ght-name { font-size: 12.5px; font-weight: 500; color: var(--dsw-alias-label-primary); text-decoration: none;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ght-name:hover { color: var(--dsw-alias-brand-primary); }
.ght-desc { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-label-tertiary);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 34px; }
.ght-meta { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--dsw-alias-label-tertiary); flex-wrap: wrap; }
.ght-pill { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px; border-radius: 999px;
  border: 0.5px solid var(--dsw-alias-border-l1); }
.ght-pill-hot { border-color: transparent; background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
  color: var(--dsw-alias-brand-primary); font-variant-numeric: tabular-nums; }
.ght-pill-domain { border-color: transparent; font-variant-numeric: tabular-nums; }
.ght-lang-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-label-tertiary); }
.ght-age { margin-left: auto; color: var(--dsw-alias-label-secondary); }

.ght-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.ght-chip { appearance: none; border: 0.5px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11.5px; padding: 5px 12px; border-radius: 999px;
  cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all .15s ease; }
.ght-chip:hover { color: var(--dsw-alias-label-primary); transform: translateY(-1px); }
.ght-chip.active { color: var(--dsw-alias-label-primary); border-color: transparent; font-weight: 500; }
.ght-chip-dot { width: 6px; height: 6px; border-radius: 50%; }

.ght-domains { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.ght-domain { border: 0.5px solid var(--dsw-alias-border-l1); border-radius: 14px; padding: 15px 17px;
  display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.ght-domain-head { display: flex; align-items: center; gap: 8px; }
.ght-domain-name { font-size: 12.5px; font-weight: 500; color: var(--dsw-alias-label-primary); flex: 1; }
.ght-domain-text { margin: 0; font-size: 11.5px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.ght-li { display: flex; align-items: baseline; gap: 7px; min-width: 0; font-size: 11px; }
.ght-li a { color: var(--dsw-alias-label-primary); text-decoration: none; flex: none; }
.ght-li a:hover { color: var(--dsw-alias-brand-primary); }
.ght-li span { color: var(--dsw-alias-label-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.ght-li b { color: var(--dsw-alias-label-secondary); font-weight: 400; flex: none; font-variant-numeric: tabular-nums; }

.ght-empty { border: 0.5px solid var(--dsw-alias-border-l1); border-radius: 14px; padding: 18px;
  font-size: 12.5px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-1); }
.ght-error { color: var(--dsw-alias-state-error-primary); margin: 0 0 8px; font-size: 12.5px; }
.ght-link-btn { appearance: none; border: none; background: none; padding: 0; color: var(--dsw-alias-brand-primary);
  font: inherit; font-size: 12px; cursor: pointer; }
.ght-foot { display: flex; flex-wrap: wrap; gap: 16px; font-size: 11px; color: var(--dsw-alias-label-tertiary); padding-top: 2px; }
.ght-warn { font-size: 11.5px; color: var(--dsw-alias-label-secondary); }

@media (max-width: 900px) { .ght-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ght-domains { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 620px) { .ght-page { padding: 16px 14px 44px; } .ght-kpis { grid-template-columns: minmax(0, 1fr); } .ght-title { font-size: 22px; } }
`

    function TrendingIcon(props) {
      const size = props && props.size ? props.size : 18
      return h('svg', { viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': true, fill: 'none' },
        h('path', { d: 'M2.5 12.5 6 8.6l2.4 2.1 4.6-6.2', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M9.6 4.5h3.9v3.9', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    function Sparkline(props) {
      const items = props.items
      const width = 560
      const labelWidth = 142
      const valueWidth = 62
      const body = width - labelWidth - valueWidth
      const rowHeight = 26
      const max = Math.max(1, props.max)
      const rows = []
      items.forEach((item, index) => {
        const y = index * rowHeight
        const w = Math.max(3, (item.starsToday / max) * body)
        rows.push(
          h('text', { key: `n${item.fullName}`, x: 0, y: y + 17, fontSize: 11.5,
            fill: index < 3 ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)' },
            item.fullName.length > 23 ? item.fullName.slice(0, 22) + '…' : item.fullName),
          h('rect', { key: `t${item.fullName}`, x: labelWidth, y: y + 6, width: body, height: 14, rx: 4,
            fill: 'var(--dsw-alias-bg-layer-2)' }),
          h('rect', { key: `b${item.fullName}`, x: labelWidth, y: y + 6, width: w, height: 14, rx: 4,
            fill: 'var(--dsw-alias-brand-primary)', opacity: 0.9 }),
          h('text', { key: `v${item.fullName}`, x: width, y: y + 17, fontSize: 11, textAnchor: 'end',
            fill: 'var(--dsw-alias-label-primary)' }, `+${item.starsToday.toLocaleString()}`),
        )
      })
      return h('svg', { viewBox: `0 0 ${width} ${Math.max(items.length * rowHeight, 1)}`, style: { display: 'block', width: '100%', height: 'auto' }, role: 'img', 'aria-label': props.label }, ...rows)
    }

    function Donut(props) {
      const groups = props.groups
      const total = groups.reduce((sum, g) => sum + g.value, 0) || 1
      const radius = 52
      const c = 2 * Math.PI * radius
      let offset = 0
      const arcs = groups.map((group) => {
        const fraction = group.value / total
        const dash = Math.max(0, fraction * c - 2)
        const arc = h('circle', {
          key: group.key, cx: 62, cy: 62, r: radius, fill: 'none', stroke: group.color, strokeWidth: 17,
          strokeDasharray: `${dash} ${c - dash}`, strokeDashoffset: -offset, transform: 'rotate(-90 62 62)',
        })
        offset += fraction * c
        return arc
      })
      return h('div', { style: { display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' } },
        h('svg', { viewBox: '0 0 124 124', style: { width: 128, height: 128, flex: 'none' }, role: 'img', 'aria-label': props.label },
          h('circle', { cx: 62, cy: 62, r: radius, fill: 'none', stroke: 'var(--dsw-alias-bg-layer-2)', strokeWidth: 17 }),
          ...arcs,
          h('text', { x: 62, y: 58, textAnchor: 'middle', fontSize: 19, fontWeight: 500, fill: 'var(--dsw-alias-label-primary)' }, String(total)),
          h('text', { x: 62, y: 76, textAnchor: 'middle', fontSize: 9.5, fill: 'var(--dsw-alias-label-tertiary)' }, props.caption),
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minWidth: 140 } },
          ...groups.map(group => h('div', { key: group.key, style: { display: 'grid', gridTemplateColumns: '9px minmax(0,1fr) auto', gap: 8, alignItems: 'center' } },
            h('i', { style: { width: 9, height: 9, borderRadius: 3, background: group.color, display: 'inline-block' } }),
            h('span', { style: { fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, group.label),
            h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } },
              `${Math.round((group.value / total) * 100)}%`),
          )),
        ),
      )
    }

    function KpiTile(color, value, label) {
      return h('div', {
        className: 'ght-kpi',
        style: {
          background: `linear-gradient(160deg, color-mix(in srgb, ${color} 16%, var(--dsw-alias-bg-layer-1)), color-mix(in srgb, ${color} 4%, var(--dsw-alias-bg-layer-1)))`,
          borderColor: `color-mix(in srgb, ${color} 28%, var(--dsw-alias-border-l1))`,
        },
      },
        h('span', { className: 'ght-kpi-value', style: { color } }, value),
        h('span', { className: 'ght-kpi-label' }, label),
      )
    }

    function RepoCard(props) {
      const tint = DOMAIN_COLOR[props.item.domain] ?? DOMAIN_COLOR.other
      const item = props.item
      return h('article', {
        className: 'ght-card',
        style: {
          background: `linear-gradient(165deg, color-mix(in srgb, ${tint} 12%, var(--dsw-alias-bg-layer-1)), var(--dsw-alias-bg-layer-1) 62%)`,
          borderColor: `color-mix(in srgb, ${tint} 22%, var(--dsw-alias-border-l1))`,
        },
      },
        h('div', { className: 'ght-card-top' },
          h('span', { className: `ght-rank${props.index < 3 ? ' top' : ''}` }, String(props.index + 1)),
          h('a', { className: 'ght-name', href: item.url, target: '_blank', rel: 'noopener noreferrer', title: item.fullName }, item.fullName),
        ),
        h('p', { className: 'ght-desc', title: item.description }, item.description || '—'),
        h('div', { className: 'ght-meta' },
          item.language && h('span', { className: 'ght-lang-dot' }),
          h('span', null, item.language ?? '—'),
          h('span', { className: 'ght-pill ght-pill-hot' }, `+${item.starsToday.toLocaleString()}`),
          h('span', { className: 'ght-pill' }, `${item.stars.toLocaleString()} ★`),
          props.domainName && h('span', {
            className: 'ght-pill ght-pill-domain',
            style: { background: `color-mix(in srgb, ${tint} 16%, transparent)`, color: tint },
          }, props.domainName),
        ),
      )
    }

    function FreshCard(props) {
      const item = props.item
      const tint = DOMAIN_COLOR[item.domain] ?? DOMAIN_COLOR.other
      return h('article', {
        className: 'ght-card',
        style: {
          background: `linear-gradient(165deg, color-mix(in srgb, ${tint} 12%, var(--dsw-alias-bg-layer-1)), var(--dsw-alias-bg-layer-1) 62%)`,
          borderColor: `color-mix(in srgb, ${tint} 22%, var(--dsw-alias-border-l1))`,
        },
      },
        h('div', { className: 'ght-card-top' },
          h('a', { className: 'ght-name', href: item.url, target: '_blank', rel: 'noopener noreferrer', title: item.fullName }, item.fullName),
        ),
        h('p', { className: 'ght-desc', title: item.description }, item.description || '—'),
        h('div', { className: 'ght-meta' },
          item.language && h('span', { className: 'ght-lang-dot' }),
          h('span', null, item.language ?? '—'),
          h('span', { className: 'ght-pill ght-pill-hot' }, `${item.stars.toLocaleString()} ★`),
          props.domainName && h('span', {
            className: 'ght-pill ght-pill-domain',
            style: { background: `color-mix(in srgb, ${tint} 16%, transparent)`, color: tint },
          }, props.domainName),
          item.ageDays !== null && item.ageDays !== undefined
            && h('span', { className: 'ght-age' }, `${item.ageDays} ${props.daysAgo}`),
        ),
      )
    }

    function Brief(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const [state, setState] = React.useState({ status: 'loading', data: null, error: null })
      const [domain, setDomain] = React.useState('all')
      const ticket = React.useRef(0)

      const load = React.useCallback((force) => {
        const mine = ++ticket.current
        setState(previous => ({ ...previous, status: previous.data === null ? 'loading' : 'refreshing', error: null }))
        fetch(`/gh-trending/brief${force ? '?refresh=1' : ''}`, { cache: 'no-store', headers: { accept: 'application/json' } })
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return response.json()
          })
          .then((data) => {
            if (mine !== ticket.current) return
            if (data === null || typeof data !== 'object' || Array.isArray(data.overall) !== true) {
              throw new Error(typeof data?.error === 'string' ? data.error : 'unexpected payload')
            }
            setState({ status: 'ready', data, error: null })
          })
          .catch((error) => {
            if (mine !== ticket.current) return
            setState(previous => ({ status: previous.data === null ? 'error' : 'ready', data: previous.data, error: String(error?.message ?? error) }))
          })
      }, [])

      React.useEffect(() => { load(false) }, [load])

      const data = state.data
      const busy = state.status === 'loading' || state.status === 'refreshing'
      const fresh = data !== null && Array.isArray(data.fresh) ? data.fresh : []
      const freshDomains = data !== null && Array.isArray(data.freshDomains) ? data.freshDomains : []
      const domainKeys = data === null ? [] : [...new Set([...data.domains, ...freshDomains].map(group => group.key))]
      const domainTitle = (key) => {
        if (data === null) return key
        const group = [...data.domains, ...freshDomains].find(entry => entry.key === key)
        return group === undefined ? key : group.title.zh
      }
      const hotItems = data === null ? [] : (domain === 'all'
        ? data.overall
        : (data.domains.find(group => group.key === domain)?.items ?? []))
      const freshItems = data === null ? [] : (domain === 'all'
        ? fresh
        : (freshDomains.find(group => group.key === domain)?.items ?? []))
      const donutGroups = data === null ? [] : data.domains.map(group => ({
        key: group.key,
        label: group.title.zh,
        color: DOMAIN_COLOR[group.key] ?? DOMAIN_COLOR.other,
        value: group.items.reduce((sum, item) => sum + item.starsToday, 0),
      })).filter(group => group.value > 0)

      return h('div', { className: 'ght-page' },
        h('header', { className: 'ght-hero' },
          h('div', { className: 'ght-hero-top' },
            h('div', null,
              h('span', { className: 'ght-eyebrow' }, h('i', { className: 'ght-dot' }), t('eyebrow')),
              h('h1', { className: 'ght-title' }, t('title'), data === null ? null : h('span', { className: 'ght-date' }, ` · ${data.day}`)),
              h('p', { className: 'ght-sub' }, t('subtitle')),
            ),
            h('button', { type: 'button', className: 'ght-btn', disabled: busy, onClick: () => { load(true) } }, t(busy ? 'refreshing' : 'refresh')),
          ),
          data !== null && h('div', { className: 'ght-kpis' },
            KpiTile('#4d6bfe', String(data.stats.repositories), t('kpiRepos')),
            KpiTile('#7c5cff', data.stats.starsToday.toLocaleString(), t('kpiStars')),
            KpiTile('#16b8a6', String(data.stats.freshRepositories ?? fresh.length), t('kpiFresh')),
            KpiTile('#f0a020', String(data.stats.languages), t('kpiLangs')),
          ),
        ),

        state.status === 'loading' && h('div', { className: 'ght-empty', role: 'status' }, t('loading')),
        state.status === 'error' && h('div', { className: 'ght-empty', role: 'alert' },
          h('p', { className: 'ght-error' }, `${t('error')}: ${state.error}`),
          h('button', { type: 'button', className: 'ght-link-btn', onClick: () => { load(true) } }, t('retry')),
        ),

        data !== null && h('div', { className: 'ght-row' },
          h('section', { className: 'ght-panel' },
            h('div', { className: 'ght-panel-head' }, h('h2', { className: 'ght-panel-title' }, t('chartStars')), h('span', { className: 'ght-hint' }, `Top ${Math.min(10, data.overall.length)}`)),
            h(Sparkline, { items: data.overall.slice(0, 10), max: data.overall[0].starsToday, label: t('chartStars') }),
          ),
          h('section', { className: 'ght-panel', style: { flex: '1 1 320px' } },
            h('div', { className: 'ght-panel-head' }, h('h2', { className: 'ght-panel-title' }, t('chartDomains')), h('span', { className: 'ght-hint' }, String(data.domains.length))),
            donutGroups.length === 0
              ? h('div', { className: 'ght-hint' }, t('noData'))
              : h(Donut, { groups: donutGroups, caption: t('starsToday'), label: t('chartDomains') }),
          ),
        ),

        data !== null && h('section', { className: 'ght-panel' },
          h('div', { className: 'ght-panel-head' },
            h('h2', { className: 'ght-panel-title' }, t('today')),
            h('span', { className: 'ght-hint' }, `${hotItems.length} ${t('repositories')}`),
          ),
          h('div', { className: 'ght-grid' },
            ...(hotItems.length === 0
              ? [h('div', { key: 'empty', className: 'ght-hint' }, t('noData'))]
              : hotItems.map((item, index) => h(RepoCard, { key: item.fullName, item, index, domainName: item.domain === 'other' ? null : domainTitle(item.domain) }))),
          ),
        ),

        data !== null && h('section', { className: 'ght-panel', style: { gap: 10 } },
          h('div', { className: 'ght-panel-head' },
            h('h2', { className: 'ght-panel-title' }, t('summary')),
            !data.summary?.overall && h('button', { type: 'button', className: 'ght-link-btn', onClick: () => { load(true) } }, t('retry')),
          ),
          data.summary?.overall && h('div', { className: 'ght-read' },
            h('span', { className: 'ght-read-label' }, t('editors')),
            h('p', { className: 'ght-read-text' }, data.summary.overall),
          ),
          data.summary?.fresh && h('div', { className: 'ght-read' },
            h('span', { className: 'ght-read-label' }, t('freshSummary')),
            h('p', { className: 'ght-read-text' }, data.summary.fresh),
          ),
          !data.summary?.overall && h('div', { className: 'ght-hint' }, t('summaryMissing')),
        ),

        data !== null && fresh.length > 0 && h('section', { className: 'ght-panel' },
          h('div', { className: 'ght-panel-head' },
            h('h2', { className: 'ght-panel-title' }, t('freshTitle')),
            h('span', { className: 'ght-hint' }, `${fresh.length} ${t('repositories')}`),
          ),
          h('div', { className: 'ght-grid' },
            ...fresh.slice(0, 12).map((item, index) => h(FreshCard, { key: item.fullName, item, index, daysAgo: t('daysAgo'), domainName: item.domain === 'other' ? null : domainTitle(item.domain) })),
          ),
        ),

        data !== null && domainKeys.length > 0 && h('section', { className: 'ght-panel' },
          h('div', { className: 'ght-panel-head' }, h('h2', { className: 'ght-panel-title' }, t('byDomain'))),
          h('div', { className: 'ght-chips' },
            h('button', { type: 'button', className: `ght-chip${domain === 'all' ? ' active' : ''}`, onClick: () => { setDomain('all') } }, t('all')),
            ...domainKeys.map(key => h('button', {
              key, type: 'button', className: `ght-chip${domain === key ? ' active' : ''}`,
              onClick: () => { setDomain(key) },
            },
              h('i', { className: 'ght-chip-dot', style: { background: DOMAIN_COLOR[key] ?? DOMAIN_COLOR.other } }),
              domainTitle(key),
            )),
          ),
          h('div', { className: 'ght-domains' },
            h('div', { className: 'ght-domain' },
              h('div', { className: 'ght-domain-head' },
                h('i', { style: { width: 7, height: 7, borderRadius: 3, background: domain === 'all' ? 'var(--dsw-alias-brand-primary)' : (DOMAIN_COLOR[domain] ?? DOMAIN_COLOR.other) } }),
                h('span', { className: 'ght-domain-name' }, domain === 'all' ? t('domainHot') : `${t('domainHot')} · ${domainTitle(domain)}`),
                h('span', { className: 'ght-hint' }, String(hotItems.length)),
              ),
              typeof data.summary?.domains?.[domain] === 'string' && h('p', { className: 'ght-domain-text' }, data.summary.domains[domain]),
              ...(hotItems.length === 0
                ? [h('div', { key: 'e', className: 'ght-hint' }, t('noData'))]
                : hotItems.slice(0, 8).map(item => h('div', { key: item.fullName, className: 'ght-li' },
                    h('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer' }, item.repo),
                    h('span', { title: item.description }, item.description || ''),
                    h('b', null, `+${item.starsToday}`),
                  ))),
            ),
            h('div', { className: 'ght-domain' },
              h('div', { className: 'ght-domain-head' },
                h('i', { style: { width: 7, height: 7, borderRadius: 3, background: domain === 'all' ? 'var(--dsw-alias-brand-primary)' : (DOMAIN_COLOR[domain] ?? DOMAIN_COLOR.other) } }),
                h('span', { className: 'ght-domain-name' }, domain === 'all' ? t('domainFresh') : `${t('domainFresh')} · ${domainTitle(domain)}`),
                h('span', { className: 'ght-hint' }, String(freshItems.length)),
              ),
              ...(freshItems.length === 0
                ? [h('div', { key: 'e', className: 'ght-hint' }, t('noData'))]
                : freshItems.slice(0, 8).map(item => h('div', { key: item.fullName, className: 'ght-li' },
                    h('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer' }, item.repo),
                    h('span', { title: item.description }, item.description || ''),
                    h('b', null, `${item.stars.toLocaleString()} ★`),
                  ))),
            ),
          ),
        ),

        data?.warning && h('div', { className: 'ght-warn' }, `⚠ ${data.warning}`),

        data !== null && h('footer', { className: 'ght-foot' },
          h('span', null, `${t('updated')} ${new Date(data.generatedAt).toLocaleTimeString()}`),
          h('span', null, `${t('source')}: ${data.source === 'search' ? t('fallback') : 'github.com/trending'}`),
          h('span', null, data.model),
        ),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'github-trending: copy dictionaries')
        // One plugin-owned stylesheet: hover, transitions and breakpoints are
        // not expressible as inline styles.
        ctx.effect(() => {
          const style = document.createElement('style')
          style.dataset.plugin = 'gh-trending'
          style.textContent = CSS
          document.head.appendChild(style)
          return () => { style.remove() }
        }, 'github-trending: stylesheet')
        const t = ctx.locale.bind(NS)
        // The `main` seat passes no locale binding, so bind it here and hand the
        // bound translator down; a missing one used to crash the render.
        const Panel = () => h(Brief, { t })
        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
        }, Panel)), 'github-trending: main panel')
        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 20,
          label: () => t('title'),
        }, TrendingIcon)), 'github-trending: sidebar row')
      },
    }
  },
})
