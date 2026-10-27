/**
 * GitHub trending briefing, browser half.
 *
 * Adds a sidebar row and a full-width main panel: a hero header with the day's
 * numbers, the model's read, the overall leaderboard, and per-domain hotspots.
 * The same data can be exported as a self-contained HTML page.
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
      export: 'Export HTML',
      leaderboard: 'Overall leaderboard',
      domains: 'By domain',
      editors: "Editor's read",
      repositories: 'repos',
      starsToday: 'stars today',
      languages: 'languages',
      totalStars: 'total',
      updated: 'Updated',
      source: 'Source',
      fallback: 'search fallback',
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
      export: '导出 HTML',
      leaderboard: '总榜',
      domains: '子领域',
      editors: '编辑导读',
      repositories: '个仓库',
      starsToday: '今日新增 star',
      languages: '种语言',
      totalStars: '总 star',
      updated: '更新于',
      source: '来源',
      fallback: '搜索兜底',
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
        padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: '18px',
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
      actions: { display: 'flex', gap: '8px', flex: 'none' },
      button: {
        appearance: 'none', border: `0.5px solid ${COLOR.border}`, background: COLOR.surface,
        color: COLOR.primary, fontSize: '12px', lineHeight: 1.2, padding: '7px 13px',
        borderRadius: '9px', cursor: 'pointer', whiteSpace: 'nowrap',
      },
      stats: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
      stat: {
        display: 'flex', alignItems: 'baseline', gap: '7px', padding: '8px 14px',
        borderRadius: '11px', background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-1) 70%, transparent)',
        border: `0.5px solid ${COLOR.border}`,
      },
      statValue: { fontSize: '17px', fontWeight: 500, color: COLOR.primary, fontVariantNumeric: 'tabular-nums' },
      statLabel: { fontSize: '11.5px', color: COLOR.tertiary },
      card: {
        border: `0.5px solid ${COLOR.border}`, borderRadius: '16px', background: COLOR.surface,
        padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px',
      },
      cardHead: { display: 'flex', alignItems: 'baseline', gap: '10px' },
      cardTitle: { margin: 0, fontSize: '13.5px', fontWeight: 500, color: COLOR.primary },
      cardHint: { fontSize: '11.5px', color: COLOR.tertiary },
      summaryCard: {
        border: `0.5px solid ${COLOR.border}`, borderRadius: '16px', padding: '18px 22px 18px 20px',
        background: `linear-gradient(90deg, color-mix(in srgb, ${COLOR.brand} 9%, transparent), transparent 70%), ${COLOR.surface}`,
        borderLeft: `3px solid ${COLOR.brand}`, display: 'flex', flexDirection: 'column', gap: '8px',
      },
      summaryLabel: { fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: COLOR.secondary, fontWeight: 500 },
      summaryText: { margin: 0, fontSize: '14px', lineHeight: 1.75, color: COLOR.primary },
      row: {
        display: 'grid', gridTemplateColumns: '30px minmax(0, 1fr) 118px', gap: '14px', alignItems: 'center',
        padding: '12px 0', borderTop: `0.5px solid ${COLOR.border}`,
      },
      rank: { fontSize: '12px', fontVariantNumeric: 'tabular-nums', textAlign: 'center', color: COLOR.tertiary, fontWeight: 500 },
      rankTop: { fontSize: '12px', fontVariantNumeric: 'tabular-nums', textAlign: 'center', fontWeight: 500, color: COLOR.brand },
      repoName: { fontSize: '13px', fontWeight: 500, color: COLOR.link, textDecoration: 'none' },
      repoDesc: {
        marginTop: '3px', fontSize: '12px', lineHeight: 1.5, color: COLOR.tertiary,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      },
      track: { height: '3px', borderRadius: '2px', background: COLOR.surfaceAlt, marginTop: '7px', overflow: 'hidden' },
      fill: (ratio) => ({ height: '100%', width: `${Math.max(3, Math.round(ratio * 100))}%`, background: COLOR.brand, opacity: 0.85 }),
      num: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '3px' },
      numMain: { fontSize: '13px', fontWeight: 500, color: COLOR.primary, fontVariantNumeric: 'tabular-nums' },
      numSub: { fontSize: '10.5px', color: COLOR.tertiary, fontVariantNumeric: 'tabular-nums' },
      grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' },
      domain: {
        border: `0.5px solid ${COLOR.border}`, borderRadius: '14px', background: COLOR.surface,
        padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '9px',
      },
      domainHead: { display: 'flex', alignItems: 'center', gap: '8px' },
      domainDot: (color) => ({ width: '7px', height: '7px', borderRadius: '999px', background: color, flex: 'none' }),
      domainName: { fontSize: '12.5px', fontWeight: 500, color: COLOR.primary, flex: 1 },
      chip: {
        fontSize: '10.5px', lineHeight: 1.4, color: COLOR.tertiary,
        border: `0.5px solid ${COLOR.border}`, borderRadius: '999px', padding: '1px 8px', flex: 'none',
      },
      domainText: { margin: 0, fontSize: '12px', lineHeight: 1.65, color: COLOR.secondary },
      item: { display: 'flex', alignItems: 'baseline', gap: '7px', minWidth: 0 },
      itemName: { fontSize: '11.5px', color: COLOR.link, textDecoration: 'none', flex: 'none' },
      itemDesc: { fontSize: '11px', color: COLOR.tertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
      itemPlus: { fontSize: '10.5px', color: COLOR.secondary, flex: 'none', fontVariantNumeric: 'tabular-nums' },
      notice: { border: `0.5px solid ${COLOR.border}`, borderRadius: '14px', padding: '16px 18px', fontSize: '12.5px', color: COLOR.secondary },
      errorText: { color: COLOR.error, margin: '0 0 8px' },
      linkButton: { appearance: 'none', border: 'none', background: 'none', padding: 0, color: COLOR.link, fontSize: '12px', cursor: 'pointer' },
      foot: { display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: COLOR.tertiary, paddingTop: '2px' },
      warn: { fontSize: '11.5px', color: COLOR.secondary },
    }

    function TrendingIcon(props) {
      const size = props && props.size ? props.size : 18
      return h('svg', { viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': true, fill: 'none' },
        h('path', { d: 'M2.5 12.5 6 8.6l2.4 2.1 4.6-6.2', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M9.6 4.5h3.9v3.9', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    /** Escape text for the exported document. */
    function esc(text) {
      return String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
    }

    /**
     * Build a self-contained HTML page from one briefing payload.
     * @param data - the payload served by /gh-trending/brief.
     * @param t - bound translator.
     * @returns a complete HTML document.
     */
    function buildStandaloneHtml(data, t) {
      const top = Math.max(1, data.overall[0].starsToday)
      const rows = data.overall.map((item, index) => {
        const ratio = Math.max(3, Math.round((item.starsToday / top) * 100))
        return `<li class="row">
  <span class="rank${index < 3 ? ' top' : ''}">${index + 1}</span>
  <div class="body">
    <a class="name" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.fullName)}</a>
    <p class="desc">${esc(item.description || '—')}</p>
    <div class="track"><i style="width:${ratio}%"></i></div>
  </div>
  <div class="nums">
    <b>+${item.starsToday.toLocaleString()}</b>
    <span>${esc(item.language ?? '—')} · ${item.stars.toLocaleString()} ${esc(t('totalStars'))}</span>
  </div>
</li>`
      }).join('\n')

      const domains = data.domains.map((group) => {
        const color = DOMAIN_COLOR[group.key] ?? DOMAIN_COLOR.other
        const summary = data.summary?.domains?.[group.key]
        const items = group.items.map((item) => `<li class="item">
  <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.repo)}</a>
  <span>${esc(item.description || '')}</span>
  <b>+${item.starsToday}</b>
</li>`).join('\n')
        return `<section class="domain" style="--dot:${color}">
  <header><i></i><h3>${esc(group.title.zh)}</h3><span class="chip">${group.items.length} ${esc(t('repositories'))}</span></header>
  ${summary ? `<p class="read">${esc(summary)}</p>` : ''}
  <ul>${items}</ul>
</section>`
      }).join('\n')

      return `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t('title'))} · ${esc(data.day)}</title>
<style>
  :root { color-scheme: light dark; --bg:#f6f7f9; --card:#fff; --line:#e6e8ec; --ink:#11151a; --ink-2:#4a5563; --ink-3:#8b95a3; --brand:#4d6bfe; --track:#eef0f4; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0d1117; --card:#161b22; --line:#232a33; --ink:#e6edf3; --ink-2:#a7b1bd; --ink-3:#7d8794; --brand:#7c93ff; --track:#222a33; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",system-ui,sans-serif; }
  main { max-width:1000px; margin:0 auto; padding:40px 24px 64px; display:flex; flex-direction:column; gap:18px; }
  .hero { border:1px solid var(--line); border-radius:18px; padding:26px 28px; background:
    radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 62%), var(--card); }
  .eyebrow { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-3); font-weight:500; }
  h1 { margin:8px 0 0; font-size:26px; letter-spacing:-.01em; font-weight:500; }
  .sub { margin:8px 0 0; color:var(--ink-3); font-size:12.5px; }
  .stats { display:flex; flex-wrap:wrap; gap:10px; margin-top:16px; }
  .stat { border:1px solid var(--line); border-radius:11px; padding:8px 14px; background:var(--card); font-size:11.5px; color:var(--ink-3); }
  .stat b { color:var(--ink); font-size:16px; font-weight:500; margin-right:6px; font-variant-numeric:tabular-nums; }
  .read-card { border:1px solid var(--line); border-left:3px solid var(--brand); border-radius:16px; padding:18px 22px;
    background:linear-gradient(90deg, color-mix(in srgb, var(--brand) 9%, transparent), transparent 70%), var(--card); }
  .read-card h2 { margin:0 0 8px; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-2); font-weight:500; }
  .read-card p { margin:0; font-size:14px; line-height:1.75; }
  .card { border:1px solid var(--line); border-radius:16px; background:var(--card); padding:20px 22px; }
  .card > h2 { margin:0 0 4px; font-size:13.5px; font-weight:500; }
  ul { list-style:none; margin:0; padding:0; }
  .row { display:grid; grid-template-columns:30px minmax(0,1fr) 118px; gap:14px; align-items:center; padding:12px 0; border-top:1px solid var(--line); }
  .row:first-child { border-top:0; }
  .rank { text-align:center; color:var(--ink-3); font-size:12px; font-variant-numeric:tabular-nums; }
  .rank.top { color:var(--brand); font-weight:500; }
  .name { color:var(--brand); text-decoration:none; font-size:13px; font-weight:500; }
  .desc { margin:3px 0 0; font-size:12px; color:var(--ink-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .track { height:3px; border-radius:2px; background:var(--track); margin-top:7px; overflow:hidden; }
  .track i { display:block; height:100%; background:var(--brand); opacity:.85; }
  .nums { text-align:right; display:flex; flex-direction:column; gap:3px; }
  .nums b { font-size:13px; font-weight:500; font-variant-numeric:tabular-nums; }
  .nums span { font-size:10.5px; color:var(--ink-3); font-variant-numeric:tabular-nums; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:12px; margin-top:12px; }
  .domain { border:1px solid var(--line); border-radius:14px; background:var(--card); padding:16px 18px; }
  .domain header { display:flex; align-items:center; gap:8px; }
  .domain header i { width:7px; height:7px; border-radius:50%; background:var(--dot); }
  .domain h3 { margin:0; font-size:12.5px; font-weight:500; flex:1; }
  .chip { font-size:10.5px; color:var(--ink-3); border:1px solid var(--line); border-radius:999px; padding:1px 8px; }
  .read { margin:9px 0 0; font-size:12px; line-height:1.65; color:var(--ink-2); }
  .item { display:flex; gap:7px; align-items:baseline; padding:5px 0; font-size:11.5px; color:var(--ink-3); }
  .item a { color:var(--brand); text-decoration:none; flex:none; }
  .item span { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .item b { flex:none; color:var(--ink-2); font-weight:400; font-variant-numeric:tabular-nums; }
  footer { display:flex; flex-wrap:wrap; gap:16px; font-size:11px; color:var(--ink-3); padding-top:2px; }
</style>
<main>
  <section class="hero">
    <div class="eyebrow">${esc(t('eyebrow'))}</div>
    <h1>${esc(t('title'))} · ${esc(data.day)}</h1>
    <p class="sub">${esc(t('subtitle'))}</p>
    <div class="stats">
      <span class="stat"><b>${data.stats.repositories}</b>${esc(t('repositories'))}</span>
      <span class="stat"><b>${data.stats.starsToday.toLocaleString()}</b>${esc(t('starsToday'))}</span>
      <span class="stat"><b>${data.stats.languages}</b>${esc(t('languages'))}</span>
    </div>
  </section>
  ${data.summary?.overall ? `<section class="read-card"><h2>${esc(t('editors'))}</h2><p>${esc(data.summary.overall)}</p></section>` : ''}
  <section class="card"><h2>${esc(t('leaderboard'))}</h2><ul>${rows}</ul></section>
  ${data.domains.length > 0 ? `<section class="card"><h2>${esc(t('domains'))}</h2><div class="grid">${domains}</div></section>` : ''}
  <footer>
    <span>${esc(t('updated'))} ${esc(new Date(data.generatedAt).toLocaleString())}</span>
    <span>${esc(t('source'))}: ${data.source === 'search' ? esc(t('fallback')) : 'github.com/trending'}</span>
    <span>${esc(data.model)}</span>
  </footer>
</main>
</html>`
    }

    function RepoRow(props) {
      const item = props.item
      const ratio = props.max === 0 ? 0 : item.starsToday / props.max
      return h('div', { style: S.row },
        h('span', { style: props.index < 3 ? S.rankTop : S.rank }, props.index + 1),
        h('div', { style: { minWidth: 0 } },
          h('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer', style: S.repoName }, item.fullName),
          h('div', { style: S.repoDesc, title: item.description }, item.description || '—'),
          h('div', { style: S.track }, h('i', { style: S.fill(ratio) })),
        ),
        h('div', { style: S.num },
          h('span', { style: S.numMain }, `+${item.starsToday.toLocaleString()}`),
          h('span', { style: S.numSub }, `${item.language ?? '—'} · ${item.stars.toLocaleString()} ${props.totalLabel}`),
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
      const maxStars = data === null ? 1 : Math.max(1, ...data.overall.map(item => item.starsToday))

      const exportPage = () => {
        if (data === null) return
        const blob = new Blob([buildStandaloneHtml(data, t)], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `github-trending-${String(data.day).replaceAll('/', '-')}.html`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.setTimeout(() => { URL.revokeObjectURL(url) }, 5000)
      }

      return h('div', { style: S.page },
        h('section', { style: S.hero },
          h('div', { style: S.heroTop },
            h('div', null,
              h('span', { style: S.eyebrow }, h('i', { style: S.dot }), t('eyebrow')),
              h('h1', { style: S.title }, `${t('title')}${data === null ? '' : ' · ' + data.day}`),
              h('p', { style: S.subtitle }, t('subtitle')),
            ),
            h('div', { style: S.actions },
              h('button', { type: 'button', style: S.button, disabled: busy, onClick: () => { load(true) } }, t(busy ? 'refreshing' : 'refresh')),
              data !== null && h('button', { type: 'button', style: S.button, onClick: exportPage }, t('export')),
            ),
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

        data !== null && h('section', { style: S.card },
          h('div', { style: S.cardHead },
            h('h2', { style: S.cardTitle }, t('leaderboard')),
            h('span', { style: S.cardHint }, `${data.overall.length} ${t('repositories')}`),
          ),
          ...data.overall.map((item, index) => h(RepoRow, { key: item.fullName, item, index, max: maxStars, totalLabel: t('totalStars') })),
        ),

        data !== null && data.domains.length > 0 && h('section', { style: S.card },
          h('div', { style: S.cardHead },
            h('h2', { style: S.cardTitle }, t('domains')),
            h('span', { style: S.cardHint }, String(data.domains.length)),
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
