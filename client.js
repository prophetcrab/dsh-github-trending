/**
 * GitHub trending briefing, browser half.
 *
 * Adds a sidebar row and a full-width main panel: today's overall leaderboard,
 * per-domain hotspots, and the model-written summary. Data comes from
 * `/gh-trending/brief`, which caches the fetch and the summary on the Host.
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
      subtitle: "Today's fastest-moving repositories, grouped by field, with a model-written read.",
      refresh: 'Refresh',
      refreshing: 'Rebuilding…',
      loading: 'Fetching github.com/trending…',
      error: 'Could not load the briefing',
      retry: 'Retry',
      leaderboard: 'Overall leaderboard',
      domains: 'By domain',
      repositories: 'repos',
      starsToday: 'stars today',
      languages: 'languages',
      noSummary: 'No model summary this time.',
      fallback: 'search fallback',
      updated: 'Updated',
      source: 'Source',
      totalStars: 'total stars',
    }

    const zh = {
      title: 'GitHub 每日热点',
      subtitle: '今日增长最快的仓库，按领域分组，并附模型总结。',
      refresh: '刷新',
      refreshing: '重新生成中…',
      loading: '正在抓取 github.com/trending…',
      error: '简报加载失败',
      retry: '重试',
      leaderboard: '总榜',
      domains: '子领域',
      repositories: '个仓库',
      starsToday: '今日新增 star',
      languages: '种语言',
      noSummary: '本次没有模型总结。',
      fallback: '搜索兜底',
      updated: '更新于',
      source: '来源',
      totalStars: '总 star',
    }

    const COLOR = {
      primary: 'var(--dsw-alias-label-primary)',
      secondary: 'var(--dsw-alias-label-secondary)',
      tertiary: 'var(--dsw-alias-label-tertiary)',
      border: 'var(--dsw-alias-border-l1)',
      surface: 'var(--dsw-alias-bg-layer-1)',
      surfaceAlt: 'var(--dsw-alias-bg-layer-2)',
      link: 'var(--dsw-alias-link)',
      accent: 'var(--dsw-alias-brand-primary)',
      error: 'var(--dsw-alias-state-error-primary)',
    }

    const styles = {
      page: { padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1100px', margin: '0 auto', minHeight: '100%' },
      header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' },
      title: { margin: 0, fontSize: '20px', lineHeight: 1.3, fontWeight: 500, color: COLOR.primary },
      subtitle: { margin: '6px 0 0', fontSize: '12.5px', lineHeight: 1.5, color: COLOR.tertiary, maxWidth: '62ch' },
      button: {
        appearance: 'none', border: `0.5px solid ${COLOR.border}`, background: 'transparent',
        color: COLOR.primary, fontSize: '12px', lineHeight: 1.2, padding: '6px 12px',
        borderRadius: '8px', cursor: 'pointer', flex: 'none',
      },
      stats: { display: 'flex', flexWrap: 'wrap', gap: '18px', fontSize: '12px', color: COLOR.secondary },
      stat: { display: 'flex', alignItems: 'baseline', gap: '5px' },
      statValue: { fontSize: '15px', color: COLOR.primary, fontWeight: 500 },
      card: { border: `0.5px solid ${COLOR.border}`, borderRadius: '12px', background: COLOR.surface, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' },
      sectionTitle: { margin: 0, fontSize: '13px', fontWeight: 500, color: COLOR.primary, display: 'flex', alignItems: 'baseline', gap: '8px' },
      muted: { fontSize: '11.5px', color: COLOR.tertiary },
      summary: { margin: 0, fontSize: '13px', lineHeight: 1.65, color: COLOR.primary },
      row: { display: 'grid', gridTemplateColumns: '22px minmax(0,1fr) auto', alignItems: 'center', gap: '10px', padding: '7px 0', borderTop: `0.5px solid ${COLOR.border}` },
      rank: { fontSize: '11px', color: COLOR.tertiary, fontVariantNumeric: 'tabular-nums', textAlign: 'right' },
      repoName: { fontSize: '12.5px', color: COLOR.link, textDecoration: 'none', fontWeight: 500 },
      repoDesc: { fontSize: '11.5px', lineHeight: 1.45, color: COLOR.tertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      bar: { height: '4px', borderRadius: '2px', background: COLOR.surfaceAlt, overflow: 'hidden', marginTop: '3px' },
      barFill: (ratio) => ({ height: '100%', width: `${Math.max(4, Math.round(ratio * 100))}%`, background: COLOR.accent }),
      count: { fontSize: '12px', color: COLOR.secondary, fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: '56px' },
      grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' },
      domainHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' },
      chip: { fontSize: '10.5px', lineHeight: 1.4, color: COLOR.tertiary, border: `0.5px solid ${COLOR.border}`, borderRadius: '999px', padding: '1px 7px' },
      domainSummary: { margin: 0, fontSize: '12px', lineHeight: 1.6, color: COLOR.secondary },
      domainItem: { display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '11.5px', color: COLOR.tertiary, minWidth: 0 },
      notice: { border: `0.5px solid ${COLOR.border}`, borderRadius: '12px', padding: '14px 16px', fontSize: '12.5px', color: COLOR.secondary },
      errorText: { color: COLOR.error, margin: '0 0 8px' },
      linkButton: { appearance: 'none', border: 'none', background: 'none', padding: 0, color: COLOR.link, fontSize: '12px', cursor: 'pointer' },
      footnote: { fontSize: '11px', color: COLOR.tertiary, display: 'flex', gap: '14px', flexWrap: 'wrap' },
    }

    function TrendingIcon(props) {
      const size = props && props.size ? props.size : 18
      return h('svg', { viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': true, fill: 'none' },
        h('path', { d: 'M2.5 12.5 6 8.6l2.4 2.1 4.6-6.2', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M9.6 4.5h3.9v3.9', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    function RepoRow(props) {
      const item = props.item
      const ratio = props.max === 0 ? 0 : item.starsToday / props.max
      return h('div', { style: styles.row },
        h('span', { style: styles.rank }, props.index + 1),
        h('div', { style: { minWidth: 0 } },
          h('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer', style: styles.repoName }, item.fullName),
          h('div', { style: styles.repoDesc, title: item.description }, item.description || '—'),
          h('div', { style: styles.bar }, h('i', { style: styles.barFill(ratio) })),
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' } },
          h('span', { style: styles.count }, `+${item.starsToday.toLocaleString()}`),
          h('span', { style: styles.muted }, item.language ?? '—'),
        ),
      )
    }

    function Brief(props) {
      const t = props.t
      const [state, setState] = React.useState({ status: 'loading', data: null, error: null })
      const ticket = React.useRef(0)

      const load = React.useCallback((force) => {
        const mine = ++ticket.current
        setState(previous => ({ ...previous, status: previous.data === null ? 'loading' : 'refreshing', error: null }))
        const suffix = force ? '?refresh=1' : ''
        fetch(`/gh-trending/brief${suffix}`, { cache: 'no-store', headers: { accept: 'application/json' } })
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
            setState(previous => ({
              status: previous.data === null ? 'error' : 'ready',
              data: previous.data,
              error: error && error.message ? error.message : String(error),
            }))
          })
      }, [])

      React.useEffect(() => { load(false) }, [load])

      const data = state.data
      const busy = state.status === 'loading' || state.status === 'refreshing'
      const maxStars = data === null ? 0 : Math.max(1, ...data.overall.map(item => item.starsToday))

      return h('div', { style: styles.page },
        h('div', { style: styles.header },
          h('div', null,
            h('h1', { style: styles.title }, `${t('title')}${data !== null && typeof data.day === 'string' ? ' · ' + data.day : ''}`),
            h('p', { style: styles.subtitle }, t('subtitle')),
          ),
          h('button', { type: 'button', style: styles.button, disabled: busy, onClick: () => { load(true) } },
            t(busy ? 'refreshing' : 'refresh')),
        ),

        state.status === 'loading' && h('div', { style: styles.notice, role: 'status' }, t('loading')),

        state.status === 'error' && h('div', { style: styles.notice, role: 'alert' },
          h('p', { style: styles.errorText }, `${t('error')}: ${state.error}`),
          h('button', { type: 'button', style: styles.linkButton, onClick: () => { load(true) } }, t('retry')),
        ),

        data !== null && h('div', { style: styles.stats },
          h('span', { style: styles.stat }, h('b', { style: styles.statValue }, String(data.stats.repositories)), t('repositories')),
          h('span', { style: styles.stat }, h('b', { style: styles.statValue }, data.stats.starsToday.toLocaleString()), t('starsToday')),
          h('span', { style: styles.stat }, h('b', { style: styles.statValue }, String(data.stats.languages)), t('languages')),
        ),

        data?.summary?.overall && h('div', { style: styles.card },
          h('h2', { style: styles.sectionTitle }, t('leaderboard')),
          h('p', { style: styles.summary }, data.summary.overall),
        ),

        data !== null && h('div', { style: styles.card },
          h('h2', { style: styles.sectionTitle }, t('leaderboard')),
          ...data.overall.map((item, index) => h(RepoRow, { key: item.fullName, item, index, max: maxStars })),
        ),

        data !== null && data.domains.length > 0 && h('div', { style: styles.card },
          h('h2', { style: styles.sectionTitle }, t('domains')),
          h('div', { style: styles.grid },
            ...data.domains.map(group => h('div', { key: group.key, style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              h('div', { style: styles.domainHead },
                h('span', { style: { fontSize: '12.5px', color: COLOR.primary, fontWeight: 500 } }, group.title.zh),
                h('span', { style: styles.chip }, `${group.items.length} ${t('repositories')}`),
              ),
              typeof data.summary?.domains?.[group.key] === 'string'
                && h('p', { style: styles.domainSummary }, data.summary.domains[group.key]),
              ...group.items.map(item => h('div', { key: item.fullName, style: styles.domainItem },
                h('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer', style: { ...styles.repoName, fontSize: '11.5px', flex: 'none' } }, item.repo),
                h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.description || ''),
                h('span', { style: { ...styles.chip, flex: 'none' } }, `+${item.starsToday}`),
              )),
            )),
          ),
        ),

        data?.warning && h('div', { style: { ...styles.muted, color: COLOR.secondary } }, `⚠ ${data.warning}`),

        data !== null && h('div', { style: styles.footnote },
          h('span', null, `${t('updated')} ${new Date(data.generatedAt).toLocaleTimeString()}`),
          h('span', null, `${t('source')}: ${data.source === 'search' ? t('fallback') : 'github.com/trending'}`),
          h('span', null, `${data.model}`),
        ),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'github-trending: copy dictionaries')
        const t = ctx.locale.bind(NS)
        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
        }, Brief)), 'github-trending: main panel')
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
