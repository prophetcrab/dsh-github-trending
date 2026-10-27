/**
 * GitHub trending briefing, browser half.
 *
 * A dashboard rather than a list: hero numbers, the model's read, a bar chart
 * of today's star gain, a donut of the domain split, a detailed leaderboard,
 * and per-domain cards. Everything is drawn with plain SVG and theme tokens.
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
      leaderboard: 'Star gain today',
      domains: 'Split by domain',
      detail: 'Full leaderboard',
      editors: "Editor's read",
      repositories: 'repos',
      starsToday: 'stars today',
      languages: 'languages',
      totalStars: 'total',
      updated: 'Updated',
      source: 'Source',
      fallback: 'search fallback',
      noData: 'No repositories today.',
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
      leaderboard: '今日新增 star 榜',
      domains: '领域分布',
      detail: '总榜明细',
      editors: '编辑导读',
      repositories: '个仓库',
      starsToday: '今日新增 star',
      languages: '种语言',
      totalStars: '总 star',
      updated: '更新于',
      source: '来源',
      fallback: '搜索兜底',
      noData: '今天没有数据。',
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

    const COLOR = {
      primary: 'var(--dsw-alias-label-primary)',
      secondary: 'var(--dsw-alias-label-secondary)',
      tertiary: 'var(--dsw-alias-label-tertiary)',
      border: 'var(--dsw-alias-border-l1)',
      surface: 'var(--dsw-alias-bg-layer-1)',
      surfaceAlt: 'var(--dsw-alias-bg-layer-2)',
      link: 'var(--dsw-alias-link)',
      brand: 'var(--dsw-alias-brand-primary)',
      error: 'var(--dsw-alias-state-error-primary)',
    }

    const S = {
      page: {
        padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: '16px',
        maxWidth: '1080px', margin: '0 auto', minHeight: '100%', boxSizing: 'border-box',
      },
      hero: {
        position: 'relative', overflow: 'hidden', borderRadius: '18px', padding: '26px 28px',
        border: `0.5px solid ${COLOR.border}`,
        background: `radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, ${COLOR.brand} 16%, transparent) 0%, transparent 62%), ${COLOR.surface}`,
        display: 'flex', flexDirection: 'column', gap: '16px',
      },
      heroTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px' },
      eyebrow: {
        display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', letterSpacing: '0.08em',
        textTransform: 'uppercase', color: COLOR.secondary, fontWeight: 500,
      },
      dot: { width: '6px', height: '6px', borderRadius: '999px', background: COLOR.brand },
      title: { margin: '6px 0 0', fontSize: '26px', lineHeight: 1.2, fontWeight: 500, color: COLOR.primary, letterSpacing: '-0.01em' },
      subtitle: { margin: '8px 0 0', fontSize: '12.5px', lineHeight: 1.55, color: COLOR.tertiary, maxWidth: '60ch' },
      button: {
        appearance: 'none', border: `0.5px solid ${COLOR.border}`, background: COLOR.surface,
        color: COLOR.primary, fontSize: '12px', lineHeight: 1.2, padding: '7px 13px',
        borderRadius: '9px', cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none',
      },
      stats: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
      stat: {
        display: 'flex', alignItems: 'baseline', gap: '7px', padding: '8px 14px',
        borderRadius: '11px', background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-1) 70%, transparent)',
        border: `0.5px solid ${COLOR.border}`,
      },
      statValue: { fontSize: '18px', fontWeight: 500, color: COLOR.primary, fontVariantNumeric: 'tabular-nums' },
      statLabel: { fontSize: '11.5px', color: COLOR.tertiary },
      summaryCard: {
        border: `0.5px solid ${COLOR.border}`, borderRadius: '16px', padding: '18px 22px 18px 20px',
        background: `linear-gradient(90deg, color-mix(in srgb, ${COLOR.brand} 9%, transparent), transparent 70%), ${COLOR.surface}`,
        borderLeft: `3px solid ${COLOR.brand}`, display: 'flex', flexDirection: 'column', gap: '8px',
      },
      summaryLabel: { fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: COLOR.secondary, fontWeight: 500 },
      summaryText: { margin: 0, fontSize: '14px', lineHeight: 1.75, color: COLOR.primary },
      panels: { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'stretch' },
      panel: {
        border: `0.5px solid ${COLOR.border}`, borderRadius: '16px', background: COLOR.surface,
        padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0,
      },
      panelHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' },
      panelTitle: { margin: 0, fontSize: '13px', fontWeight: 500, color: COLOR.primary },
      panelHint: { fontSize: '11.5px', color: COLOR.tertiary },
      legend: { display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0 },
      legendRow: { display: 'grid', gridTemplateColumns: '9px minmax(0, 1fr) auto', alignItems: 'center', gap: '8px', minWidth: 0 },
      legendDot: (color) => ({ width: '9px', height: '9px', borderRadius: '3px', background: color }),
      legendName: { fontSize: '11.5px', color: COLOR.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      legendValue: { fontSize: '11px', color: COLOR.tertiary, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
      row: {
        display: 'grid', gridTemplateColumns: '26px minmax(0, 1fr) 96px', gap: '12px', alignItems: 'center',
        padding: '10px 0', borderTop: `0.5px solid ${COLOR.border}`,
      },
      rank: { fontSize: '11.5px', fontVariantNumeric: 'tabular-nums', textAlign: 'center', color: COLOR.tertiary },
      rankTop: { fontSize: '11.5px', fontVariantNumeric: 'tabular-nums', textAlign: 'center', color: COLOR.brand, fontWeight: 500 },
      repoName: { fontSize: '12.5px', fontWeight: 500, color: COLOR.link, textDecoration: 'none' },
      repoDesc: {
        marginTop: '2px', fontSize: '11.5px', lineHeight: 1.45, color: COLOR.tertiary,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      },
      num: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' },
      numMain: { fontSize: '12.5px', fontWeight: 500, color: COLOR.primary, fontVariantNumeric: 'tabular-nums' },
      numSub: { fontSize: '10.5px', color: COLOR.tertiary },
      grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' },
      domain: { border: `0.5px solid ${COLOR.border}`, borderRadius: '14px', background: COLOR.surface, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '9px' },
      domainHead: { display: 'flex', alignItems: 'center', gap: '8px' },
      domainDot: (color) => ({ width: '7px', height: '7px', borderRadius: '999px', background: color, flex: 'none' }),
      domainName: { fontSize: '12.5px', fontWeight: 500, color: COLOR.primary, flex: 1 },
      chip: { fontSize: '10.5px', lineHeight: 1.4, color: COLOR.tertiary, border: `0.5px solid ${COLOR.border}`, borderRadius: '999px', padding: '1px 8px', flex: 'none' },
      domainText: { margin: 0, fontSize: '12px', lineHeight: 1.65, color: COLOR.secondary },
      item: { display: 'flex', alignItems: 'baseline', gap: '7px', minWidth: 0 },
      itemName: { fontSize: '11.5px', color: COLOR.link, textDecoration: 'none', flex: 'none' },
      itemDesc: { fontSize: '11px', color: COLOR.tertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
      itemPlus: { fontSize: '10.5px', color: COLOR.secondary, flex: 'none', fontVariantNumeric: 'tabular-nums' },
      notice: { border: `0.5px solid ${COLOR.border}`, borderRadius: '14px', padding: '16px 18px', fontSize: '12.5px', color: COLOR.secondary },
      errorText: { color: COLOR.error, margin: '0 0 8px' },
      linkButton: { appearance: 'none', border: 'none', background: 'none', padding: 0, color: COLOR.link, fontSize: '12px', cursor: 'pointer' },
      foot: { display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: COLOR.tertiary },
      warn: { fontSize: '11.5px', color: COLOR.secondary },
      svg: { display: 'block', width: '100%', height: 'auto', overflow: 'visible' },
    }

    function TrendingIcon(props) {
      const size = props && props.size ? props.size : 18
      return h('svg', { viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': true, fill: 'none' },
        h('path', { d: 'M2.5 12.5 6 8.6l2.4 2.1 4.6-6.2', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M9.6 4.5h3.9v3.9', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    /**
     * Horizontal bar chart of the day's star gain, drawn as SVG.
     * @param props - items, max value, label formatter.
     * @returns the chart.
     */
    function BarChart(props) {
      const items = props.items
      const rowHeight = 26
      const labelWidth = 148
      const valueWidth = 58
      const width = 560
      const bodyWidth = width - labelWidth - valueWidth
      const height = items.length * rowHeight
      const max = Math.max(1, props.max)

      const rows = []
      items.forEach((item, index) => {
        const y = index * rowHeight
        const barWidth = Math.max(3, (item.starsToday / max) * bodyWidth)
        const name = item.fullName.length > 24 ? item.fullName.slice(0, 23) + '…' : item.fullName
        rows.push(
          h('text', {
            key: `n${item.fullName}`, x: 0, y: y + 17, fontSize: 11.5,
            fill: index < 3 ? COLOR.primary : COLOR.secondary,
          }, name),
          h('rect', {
            key: `t${item.fullName}`, x: labelWidth, y: y + 6, width: bodyWidth, height: 14, rx: 4,
            fill: COLOR.surfaceAlt,
          }),
          h('rect', {
            key: `b${item.fullName}`, x: labelWidth, y: y + 6, width: barWidth, height: 14, rx: 4,
            fill: COLOR.brand, opacity: 0.9,
          }),
          h('text', {
            key: `v${item.fullName}`, x: width, y: y + 17, fontSize: 11, textAnchor: 'end',
            fill: COLOR.primary, fontVariantNumeric: 'tabular-nums',
          }, `+${item.starsToday.toLocaleString()}`),
        )
      })

      return h('svg', { viewBox: `0 0 ${width} ${Math.max(height, 1)}`, style: S.svg, role: 'img', 'aria-label': props.label },
        ...rows,
      )
    }

    /**
     * Donut of the domain split with a legend beside it.
     * @param props - groups with value and color.
     * @returns the donut plus legend.
     */
    function DomainDonut(props) {
      const groups = props.groups
      const total = groups.reduce((sum, group) => sum + group.value, 0) || 1
      const radius = 54
      const circumference = 2 * Math.PI * radius
      let offset = 0
      const arcs = groups.map((group) => {
        const fraction = group.value / total
        const dash = Math.max(0, fraction * circumference - 1.5)
        const arc = h('circle', {
          key: group.key,
          cx: 64, cy: 64, r: radius, fill: 'none',
          stroke: group.color, strokeWidth: 18,
          strokeDasharray: `${dash} ${circumference - dash}`,
          strokeDashoffset: -offset,
          transform: 'rotate(-90 64 64)',
          strokeLinecap: 'butt',
        })
        offset += fraction * circumference
        return arc
      })

      return h('div', { style: { display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' } },
        h('svg', { viewBox: '0 0 128 128', style: { width: '132px', height: '132px', flex: 'none' }, role: 'img', 'aria-label': props.label },
          h('circle', { cx: 64, cy: 64, r: radius, fill: 'none', stroke: COLOR.surfaceAlt, strokeWidth: 18 }),
          ...arcs,
          h('text', { x: 64, y: 60, textAnchor: 'middle', fontSize: 20, fill: COLOR.primary, fontWeight: 500 }, String(total)),
          h('text', { x: 64, y: 78, textAnchor: 'middle', fontSize: 10, fill: COLOR.tertiary }, props.caption),
        ),
        h('div', { style: { ...S.legend, flex: 1 } },
          ...groups.map(group => h('div', { key: group.key, style: S.legendRow },
            h('i', { style: S.legendDot(group.color) }),
            h('span', { style: S.legendName }, group.label),
            h('span', { style: S.legendValue }, `${Math.round((group.value / total) * 100)}% · ${group.value.toLocaleString()}`),
          )),
        ),
      )
    }

    function RepoRow(props) {
      const item = props.item
      return h('div', { style: S.row },
        h('span', { style: props.index < 3 ? S.rankTop : S.rank }, props.index + 1),
        h('div', { style: { minWidth: 0 } },
          h('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer', style: S.repoName }, item.fullName),
          h('div', { style: S.repoDesc, title: item.description }, item.description || '—'),
        ),
        h('div', { style: S.num },
          h('span', { style: S.numMain }, `+${item.starsToday.toLocaleString()}`),
          h('span', { style: S.numSub }, `${item.language ?? '—'} · ${item.stars.toLocaleString()}`),
        ),
      )
    }

    function Brief(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const [state, setState] = React.useState({ status: 'loading', data: null, error: null })
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
      const top = data === null ? [] : data.overall.slice(0, 10)
      const donutGroups = data === null ? [] : data.domains.map(group => ({
        key: group.key,
        label: group.title.zh,
        color: DOMAIN_COLOR[group.key] ?? DOMAIN_COLOR.other,
        value: group.items.reduce((sum, item) => sum + item.starsToday, 0),
      })).filter(group => group.value > 0)

      return h('div', { style: S.page },
        h('section', { style: S.hero },
          h('div', { style: S.heroTop },
            h('div', null,
              h('span', { style: S.eyebrow }, h('i', { style: S.dot }), t('eyebrow')),
              h('h1', { style: S.title }, `${t('title')}${data === null ? '' : ' · ' + data.day}`),
              h('p', { style: S.subtitle }, t('subtitle')),
            ),
            h('button', { type: 'button', style: S.button, disabled: busy, onClick: () => { load(true) } }, t(busy ? 'refreshing' : 'refresh')),
          ),
          data !== null && h('div', { style: S.stats },
            h('span', { style: S.stat }, h('b', { style: S.statValue }, String(data.stats.repositories)), h('span', { style: S.statLabel }, t('repositories'))),
            h('span', { style: S.stat }, h('b', { style: S.statValue }, data.stats.starsToday.toLocaleString()), h('span', { style: S.statLabel }, t('starsToday'))),
            h('span', { style: S.stat }, h('b', { style: S.statValue }, String(data.stats.languages)), h('span', { style: S.statLabel }, t('languages'))),
          ),
        ),

        state.status === 'loading' && h('div', { style: S.notice, role: 'status' }, t('loading')),

        state.status === 'error' && h('div', { style: S.notice, role: 'alert' },
          h('p', { style: S.errorText }, `${t('error')}: ${state.error}`),
          h('button', { type: 'button', style: S.linkButton, onClick: () => { load(true) } }, t('retry')),
        ),

        data?.summary?.overall && h('section', { style: S.summaryCard },
          h('span', { style: S.summaryLabel }, t('editors')),
          h('p', { style: S.summaryText }, data.summary.overall),
        ),

        data !== null && h('div', { style: S.panels },
          h('section', { style: S.panel },
            h('div', { style: S.panelHead },
              h('h2', { style: S.panelTitle }, t('leaderboard')),
              h('span', { style: S.panelHint }, `Top ${top.length}`),
            ),
            top.length === 0
              ? h('div', { style: S.panelHint }, t('noData'))
              : h(BarChart, { items: top, max: top[0].starsToday, label: t('leaderboard') }),
          ),
          h('section', { style: S.panel },
            h('div', { style: S.panelHead },
              h('h2', { style: S.panelTitle }, t('domains')),
              h('span', { style: S.panelHint }, `${data.domains.length}`),
            ),
            donutGroups.length === 0
              ? h('div', { style: S.panelHint }, t('noData'))
              : h(DomainDonut, { groups: donutGroups, caption: t('starsToday'), label: t('domains') }),
          ),
        ),

        data !== null && h('section', { style: S.panel },
          h('div', { style: S.panelHead },
            h('h2', { style: S.panelTitle }, t('detail')),
            h('span', { style: S.panelHint }, `${data.overall.length} ${t('repositories')}`),
          ),
          ...data.overall.map((item, index) => h(RepoRow, { key: item.fullName, item, index })),
        ),

        data !== null && data.domains.length > 0 && h('section', { style: S.panel },
          h('div', { style: S.panelHead },
            h('h2', { style: S.panelTitle }, t('domains')),
            h('span', { style: S.panelHint }, `${data.domains.length}`),
          ),
          h('div', { style: S.grid },
            ...data.domains.map(group => h('div', { key: group.key, style: S.domain },
              h('div', { style: S.domainHead },
                h('i', { style: S.domainDot(DOMAIN_COLOR[group.key] ?? DOMAIN_COLOR.other) }),
                h('span', { style: S.domainName }, group.title.zh),
                h('span', { style: S.chip }, String(group.items.length)),
              ),
              typeof data.summary?.domains?.[group.key] === 'string' && h('p', { style: S.domainText }, data.summary.domains[group.key]),
              ...group.items.map(item => h('div', { key: item.fullName, style: S.item },
                h('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer', style: S.itemName }, item.repo),
                h('span', { style: S.itemDesc, title: item.description }, item.description || ''),
                h('span', { style: S.itemPlus }, `+${item.starsToday}`),
              )),
            )),
          ),
        ),

        data?.warning && h('div', { style: S.warn }, `⚠ ${data.warning}`),

        data !== null && h('div', { style: S.foot },
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
