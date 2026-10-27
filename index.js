/**
 * GitHub trending briefing, Host half.
 *
 *   GET /gh-trending/brief[?refresh=1] → today's leaderboard, per-domain
 *                                        hotspots, and a model-written summary
 *   tool gh_trending_brief             → the same story for the agent
 *
 * Data comes from `https://github.com/trending?since=daily` (parsed HTML),
 * falling back to the GitHub Search API when the page cannot be read. Domains
 * are assigned with keyword and language heuristics; the summary is one
 * `ctx.llm.stream` call over the compact leaderboard, cached with the data.
 *
 * @module dsh-github-trending
 */

import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'github-trending'

/** Required services: HTTP routes, the tool registry, the LLM, prompt assembly. */
export const inject = ['webServer', 'tools', 'llm', 'systemPrompt']

const BRIEF_PATH = '/gh-trending/brief'
const TRENDING_URL = 'https://github.com/trending?since=daily'
const SEARCH_URL = 'https://api.github.com/search/repositories'
const USER_AGENT = 'dsh-github-trending/0.1 (+https://github.com/prophetcrab/dsh-github-trending)'

/**
 * Deployment-owned knobs, read straight from the row config.
 * @typedef {object} Config
 * @property {string} [provider] - LLM provider id.
 * @property {string} [model] - LLM model id.
 * @property {number} [topOverall] - leaderboard length.
 * @property {number} [perDomain] - repositories per domain.
 * @property {number} [cacheMinutes] - reuse window for fetching and summarizing.
 * @property {boolean} [refreshOnDemand] - allow ?refresh=1 to bypass the cache.
 */

/** Domain buckets, ordered; the first best-scoring bucket wins. */
const DOMAINS = [
  {
    key: 'ai', zh: 'AI / 大模型', en: 'AI & LLM',
    keywords: ['llm', 'agent', 'agents', 'gpt', 'model', 'models', 'neural', 'diffusion', 'transformer', 'rag',
      'embedding', 'inference', 'vision', 'speech', 'tts', 'asr', 'openai', 'claude', 'deepseek', 'mcp', 'prompt',
      'fine-tune', 'fine-tuning', 'vlm', 'voice', 'transcription', 'audio', 'elevenlabs', 'chatbot', 'machine learning'],
  },
  {
    key: 'web', zh: 'Web / 前端', en: 'Web & frontend',
    keywords: ['react', 'vue', 'svelte', 'next.js', 'nextjs', 'nuxt', 'css', 'tailwind', 'component', 'frontend',
      'vite', 'astro', 'webgl', 'three.js', 'design system', 'browser', 'html', 'animation'],
  },
  {
    key: 'backend', zh: '后端 / 基础设施', en: 'Backend & infra',
    keywords: ['server', 'api', 'gateway', 'kubernetes', 'docker', 'cloud', 'microservice', 'runtime', 'proxy',
      'queue', 'kafka', 'redis', 'grpc', 'terraform', 'deploy', 'container'],
  },
  {
    key: 'data', zh: '数据 / 存储', en: 'Data & storage',
    keywords: ['database', 'sql', 'postgres', 'sqlite', 'vector', 'storage', 'analytics', 'olap', 'etl', 'duckdb',
      'clickhouse', 'orm', 'datasource', 'streaming', 'pipeline'],
  },
  {
    key: 'devtools', zh: '开发者工具', en: 'Developer tools',
    keywords: ['cli', 'editor', 'ide', 'vscode', 'linter', 'formatter', 'git', 'build', 'bundler', 'debug',
      'testing', 'compiler', 'terminal', 'shell', 'code editor', 'language server'],
  },
  {
    key: 'security', zh: '安全', en: 'Security',
    keywords: ['security', 'exploit', 'cve', 'phishing', 'malware', 'auth', 'encryption', 'vulnerability',
      'pentest', 'hacking', 'credential'],
  },
  {
    key: 'systems', zh: '系统 / 底层', en: 'Systems & low level',
    keywords: ['kernel', 'driver', 'embedded', 'firmware', 'wasm', 'assembler', 'filesystem', 'hypervisor',
      'operating system', 'rtos', 'bootloader'],
  },
  {
    key: 'mobile', zh: '移动 / 桌面', en: 'Mobile & desktop',
    keywords: ['ios', 'android', 'swift', 'kotlin', 'flutter', 'electron', 'tauri', 'desktop', 'macos', 'app store'],
  },
]

/** Language → the bucket it leans toward when no keyword matches. */
const LANGUAGE_HINT = {
  TypeScript: 'web', JavaScript: 'web', Vue: 'web', Svelte: 'web', HTML: 'web', CSS: 'web',
  Python: 'ai', 'Jupyter Notebook': 'ai',
  Go: 'backend', Java: 'backend', 'C#': 'backend', Ruby: 'backend', PHP: 'backend',
  Rust: 'systems', C: 'systems', 'C++': 'systems', Zig: 'systems', Assembly: 'systems',
  Swift: 'mobile', Kotlin: 'mobile', Dart: 'mobile', 'Objective-C': 'mobile',
  Shell: 'devtools',
}

/** Keyword matchers built once: word-bounded so short tokens cannot hit inside other words. */
const MATCHERS = DOMAINS.map(domain => ({
  key: domain.key,
  patterns: domain.keywords.map((keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i')
  }),
}))

/** One cache entry: the payload plus when it was built. */
let cache = { at: 0, payload: null }

/** In-flight build, so simultaneous requests share one fetch and one summary. */
let pending = null

/**
 * Decode the few HTML entities GitHub puts in descriptions.
 * @param text - raw HTML text.
 * @returns plain text.
 */
function decode(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parse one number out of a text fragment.
 * @param text - digits with optional commas, or a K suffix.
 * @returns integer value.
 */
function toNumber(text) {
  if (typeof text !== 'string') return 0
  const clean = text.replace(/,/g, '').trim().toLowerCase()
  const match = /^([\d.]+)\s*([km])?$/.exec(clean)
  if (match === null) return 0
  const value = Number(match[1])
  if (!Number.isFinite(value)) return 0
  return Math.round(match[2] === 'k' ? value * 1000 : match[2] === 'm' ? value * 1e6 : value)
}

/**
 * Assign one repository to a domain bucket.
 * @param fullName - owner/repo.
 * @param description - repository description.
 * @param language - primary language, when known.
 * @returns bucket key.
 */
function classify(fullName, description, language) {
  const haystack = `${fullName} ${description}`
  let best = { key: null, score: 0 }
  for (const domain of MATCHERS) {
    let score = 0
    for (const pattern of domain.patterns) {
      if (pattern.test(haystack)) score += 2
    }
    if (score > best.score) best = { key: domain.key, score }
  }
  if (best.key !== null) return best.key
  return LANGUAGE_HINT[language] ?? 'other'
}

/**
 * Parse the trending page into repository records.
 * @param html - the fetched page.
 * @returns repositories in page order.
 */
function parseTrending(html) {
  const items = []
  const article = /<article class="Box-row">([\s\S]*?)<\/article>/g
  let match
  while ((match = article.exec(html)) !== null) {
    const body = match[1]
    const heading = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(body)
    if (heading === null) continue
    const link = /href="\/([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+)"/.exec(heading[1])
    if (link === null) continue
    const fullName = link[1]
    const slash = fullName.indexOf('/')
    if (slash <= 0) continue
    const owner = fullName.slice(0, slash)
    const repo = fullName.slice(slash + 1)
    const description = /<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(body)
    const language = /itemprop="programmingLanguage">([^<]+)</.exec(body)
    const starsToday = /([\d,]+)\s+stars today/.exec(body)
    const stars = /href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?([\d,]+)\s*<\/a>/.exec(body)
    const forks = /href="\/[^"]+\/forks"[^>]*>[\s\S]*?([\d,]+)\s*<\/a>/.exec(body)
    const text = description === null ? '' : decode(description[1])
    const lang = language === null ? null : language[1].trim()
    items.push({
      fullName,
      owner,
      repo,
      description: text,
      language: lang,
      stars: stars === null ? 0 : toNumber(stars[1]),
      forks: forks === null ? 0 : toNumber(forks[1]),
      starsToday: starsToday === null ? 0 : toNumber(starsToday[1]),
      url: `https://github.com/${fullName}`,
      domain: classify(fullName, text, lang),
    })
  }
  return items
}

/**
 * Read one URL through the system `curl`.
 *
 * Node's own fetch cannot verify this machine's intercepted TLS chain, while
 * curl uses the system trust store. This is the same reason the plugin shells
 * out for it rather than using global fetch.
 * @param url - https URL.
 * @param accept - Accept header value.
 * @param timeoutMs - whole-request deadline.
 * @returns response body text.
 */
function curl(url, accept, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/curl', [
      '-sS', '-L',
      '--max-time', String(Math.max(1, Math.ceil(timeoutMs / 1000))),
      '-A', USER_AGENT,
      '-H', `accept: ${accept}`,
      url,
    ], { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error !== null) {
        reject(new Error(`curl: ${String(stderr).trim() || error.message}`))
        return
      }
      resolve(String(stdout))
    })
  })
}

/**
 * Fetch the trending page, falling back to the search API.
 * @returns repository records.
 */
async function fetchTrending() {
  const html = await curl(TRENDING_URL, 'text/html', 45_000)
  const items = parseTrending(html)
  if (items.length === 0) throw new Error('github trending page had no repository rows')
  return items
}

/**
 * Search API fallback: repositories created in the last week, by stars.
 * @returns repository records shaped like the trending rows.
 */
async function fetchSearchFallback() {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const url = `${SEARCH_URL}?q=created:>${since}&sort=stars&order=desc&per_page=25`
  const body = JSON.parse(await curl(url, 'application/vnd.github+json', 30_000))
  const items = Array.isArray(body?.items) ? body.items : []
  return items.map(item => {
    const fullName = String(item.full_name ?? '')
    const slash = fullName.indexOf('/')
    const description = String(item.description ?? '')
    const language = item.language === null || item.language === undefined ? null : String(item.language)
    return {
      fullName,
      owner: slash > 0 ? fullName.slice(0, slash) : '',
      repo: slash > 0 ? fullName.slice(slash + 1) : fullName,
      description,
      language,
      stars: Number(item.stargazers_count ?? 0),
      forks: Number(item.forks_count ?? 0),
      starsToday: Number(item.stargazers_count ?? 0),
      url: String(item.html_url ?? `https://github.com/${fullName}`),
      domain: classify(fullName, description, language),
    }
  })
}

/**
 * Fetch repositories created in the last few days, by stars.
 * @param days - creation window in days.
 * @returns repository records shaped like the trending rows, with their age.
 */
async function fetchFresh(days) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const url = `${SEARCH_URL}?q=created:>${since}&sort=stars&order=desc&per_page=30`
  const body = JSON.parse(await curl(url, 'application/vnd.github+json', 30_000))
  const items = Array.isArray(body?.items) ? body.items : []
  return items.map(item => {
    const fullName = String(item.full_name ?? '')
    const slash = fullName.indexOf('/')
    const description = String(item.description ?? '')
    const language = item.language === null || item.language === undefined ? null : String(item.language)
    const createdAt = String(item.created_at ?? '')
    const created = Date.parse(createdAt)
    return {
      fullName,
      owner: slash > 0 ? fullName.slice(0, slash) : '',
      repo: slash > 0 ? fullName.slice(slash + 1) : fullName,
      description,
      language,
      stars: Number(item.stargazers_count ?? 0),
      forks: Number(item.forks_count ?? 0),
      starsToday: Number(item.stargazers_count ?? 0),
      url: String(item.html_url ?? `https://github.com/${fullName}`),
      domain: classify(fullName, description, language),
      createdAt,
      ageDays: Number.isFinite(created) ? Math.max(0, Math.floor((Date.now() - created) / 86_400_000)) : null,
    }
  })
}

/**
 * Ask the model for the day's summary.
 * @param ctx - plugin context (uses its LLM service).
 * @param config - resolved config.
 * @param overall - the leaderboard slice.
 * @param domains - grouped repositories.
 * @returns the parsed summary, or null when the model refused prose-only output.
 */
async function summarize(ctx, config, overall, domains, fresh, freshDomains) {
  const compact = {
    overall: overall.map(item => ({
      name: item.fullName,
      description: item.description.slice(0, 160),
      stars_today: item.starsToday,
      stars: item.stars,
      language: item.language,
    })),
    domains: Object.fromEntries(domains.map(group => [group.key, group.items.map(item => item.fullName)])),
    new_projects: fresh.map(item => ({
      name: item.fullName,
      description: item.description.slice(0, 160),
      stars: item.stars,
      age_days: item.ageDays,
    })),
    new_projects_by_domain: Object.fromEntries(freshDomains.map(group => [group.key, group.items.length])),
  }
  const prompt = [
    'You are writing the daily GitHub trending briefing for developers.',
    'Here is today\'s data as JSON:',
    JSON.stringify(compact),
    '',
    'Write it in Chinese. Return JSON only, no markdown fence, with this shape:',
    '{"overall":"...","domains":{"<domain key>":"..."},"fresh":"...","repos":{"<owner/name>":"..."}}',
    'Rules: overall at most 140 characters and names the most interesting 2-3 projects; each domain at most 90',
    'characters and states what actually moved today; skip a domain whose list is empty;',
    'fresh at most 110 characters and describes the newly created projects that are already attracting attention;',
    'repos maps EVERY repository name above to one Chinese sentence of at most 34 characters that says what it is',
    'and what it is for, in plain words a developer can scan; keep the key exactly as given;',
    'no hype, no emoji, no markdown.',
  ].join('\n')

  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort() }, 90_000)
  let text = ''
  try {
    for await (const chunk of ctx.llm.stream({
      provider: config.provider,
      model: config.model,
      temperature: 0.3,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      signal: controller.signal,
    })) {
      if (chunk.type === 'text-delta') text += chunk.text
      if (chunk.type === 'finish') {
        const reason = chunk.reason
        if (reason.kind === 'error' || reason.kind === 'aborted') {
          throw new Error(`model ended with ${reason.kind}`)
        }
      }
    }
  } finally {
    clearTimeout(timer)
  }
  const match = /\{[\s\S]*\}/.exec(text)
  if (match === null) return null
  try {
    const parsed = JSON.parse(match[0])
    const repos = {}
    if (parsed.repos !== null && typeof parsed.repos === 'object') {
      for (const [name, text] of Object.entries(parsed.repos)) {
        if (typeof text === 'string' && text.trim() !== '') repos[name] = text.trim()
      }
    }
    return {
      overall: typeof parsed.overall === 'string' ? parsed.overall.trim() : '',
      domains: parsed.domains !== null && typeof parsed.domains === 'object' ? parsed.domains : {},
      fresh: typeof parsed.fresh === 'string' ? parsed.fresh.trim() : '',
      repos,
    }
  } catch {
    return null
  }
}

/**
 * Build the whole briefing.
 * @param ctx - plugin context.
 * @param config - resolved config.
 * @returns the payload served by the route and the tool.
 */
async function build(ctx, config) {
  let items
  let source = 'trending'
  let warning = null
  try {
    items = await fetchTrending()
  } catch (error) {
    warning = `trending page unavailable (${error instanceof Error ? error.message : String(error)}); used the search fallback`
    try {
      items = await fetchSearchFallback()
      source = 'search'
    } catch (fallbackError) {
      throw new Error(`both trending sources failed: ${String(fallbackError)}; ${warning}`)
    }
  }

  let fresh = []
  try {
    fresh = await fetchFresh(5)
  } catch (freshError) {
    warning = `${warning === null ? '' : warning + '; '}new projects failed: ${freshError instanceof Error ? freshError.message : String(freshError)}`
  }

  const overall = [...items].sort((left, right) => right.starsToday - left.starsToday)
  const domains = DOMAINS
    .map(domain => ({
      key: domain.key,
      title: { zh: domain.zh, en: domain.en },
      items: overall.filter(item => item.domain === domain.key).slice(0, config.perDomain),
    }))
    .filter(group => group.items.length > 0)

  const freshOverall = [...fresh].sort((left, right) => right.stars - left.stars).slice(0, config.topOverall)
  const freshDomains = DOMAINS
    .map(domain => ({
      key: domain.key,
      title: { zh: domain.zh, en: domain.en },
      items: freshOverall.filter(item => item.domain === domain.key).slice(0, config.perDomain),
    }))
    .filter(group => group.items.length > 0)

  let summary = null
  try {
    summary = await summarize(ctx, config, overall.slice(0, config.topOverall), domains, freshOverall, freshDomains)
  } catch (error) {
    warning = `${warning === null ? '' : warning + '; '}summary failed: ${error instanceof Error ? error.message : String(error)}`
  }

  return {
    generatedAt: new Date().toISOString(),
    day: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    source,
    warning,
    model: `${config.provider}/${config.model}`,
    overall: overall.slice(0, config.topOverall),
    domains,
    fresh: freshOverall,
    freshDomains,
    summary,
    stats: {
      repositories: items.length,
      starsToday: items.reduce((total, item) => total + item.starsToday, 0),
      languages: [...new Set(items.map(item => item.language).filter(Boolean))].length,
      freshRepositories: fresh.length,
      freshStars: fresh.reduce((total, item) => total + item.stars, 0),
    },
  }
}

/**
 * Serve a cached briefing, or rebuild it when stale or forced.
 * @param ctx - plugin context.
 * @param config - resolved config.
 * @param force - bypass the cache.
 * @returns the payload.
 */
function briefing(ctx, config, force) {
  const fresh = cache.payload !== null && Date.now() - cache.at < config.cacheMinutes * 60_000
  if (fresh && !force) return Promise.resolve(cache.payload)
  if (pending !== null) return pending
  pending = build(ctx, config)
    .then((payload) => {
      cache = { at: Date.now(), payload }
      return payload
    })
    .finally(() => { pending = null })
  return pending
}

/** Register the route, the tool, and the prompt guidance. */
export function apply(ctx, config) {
  const resolved = {
    provider: config?.provider ?? 'deepseek-account',
    model: config?.model ?? 'deepseek-flash',
    topOverall: config?.topOverall ?? 12,
    perDomain: config?.perDomain ?? 5,
    cacheMinutes: config?.cacheMinutes ?? 30,
    refreshOnDemand: config?.refreshOnDemand ?? true,
  }

  ctx.systemPrompt.section({
    name: 'tool:github-trending',
    order: 2360,
    text: 'GitHub trending: gh_trending_brief returns today\'s trending repositories with a model-written summary, '
      + 'split into an overall leaderboard and per-domain hotspots. Use it when the user asks what is hot on GitHub today.',
  })

  ctx.tools.register({
    name: 'gh_trending_brief',
    description:
      'Read today\'s GitHub trending briefing: an overall leaderboard plus per-domain hotspots, with a model-written '
      + 'summary. Read-only; the data is cached for a short while.',
    parameters: {
      type: 'object',
      properties: {
        refresh: { type: 'boolean', description: 'Ignore the cache and rebuild from github.com/trending.' },
        domain: { type: 'string', description: 'Return only this domain key (ai, web, backend, data, devtools, security, systems, mobile).' },
      },
      additionalProperties: false,
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    execute: async (args) => {
      const payload = await briefing(ctx, resolved, args?.refresh === true)
      const wanted = typeof args?.domain === 'string' ? args.domain : null
      const lines = []
      lines.push(`GitHub trending ${payload.day} (${payload.source}, ${payload.stats.repositories} repos, `
        + `${payload.stats.starsToday} stars today)`)
      if (payload.summary?.overall) lines.push('', payload.summary.overall)
      if (payload.warning !== null) lines.push('', `warning: ${payload.warning}`)
      const groups = wanted === null ? payload.domains : payload.domains.filter(group => group.key === wanted)
      const overall = wanted === null ? payload.overall : groups.flatMap(group => group.items)
      lines.push('', 'Leaderboard:')
      for (const item of overall.slice(0, 12)) {
        lines.push(`- ${item.fullName} (+${item.starsToday}★, ${item.stars}★ total, ${item.language ?? 'n/a'}) — `
          + `${item.description.slice(0, 110)}`)
      }
      if (wanted === null && payload.fresh.length > 0) {
        lines.push('', '## 近 5 天新开项目')
        if (typeof payload.summary?.fresh === 'string') lines.push(payload.summary.fresh)
        for (const item of payload.fresh.slice(0, 10)) {
          lines.push(`- ${item.fullName} (${item.stars}★, ${item.ageDays ?? '?'} 天前) — ${item.description.slice(0, 90)}`)
        }
      }
      for (const group of groups) {
        lines.push('', `## ${group.title.zh} (${group.key})`)
        if (typeof payload.summary?.domains?.[group.key] === 'string') lines.push(payload.summary.domains[group.key])
        for (const item of group.items) lines.push(`- ${item.fullName} (+${item.starsToday}★) ${item.description.slice(0, 90)}`)
      }
      return lines.join('\n')
    },
  })

  ctx.inject(['webServer'], (child) => {
    child.effect(() => child.webServer.register({
      kind: 'exact',
      path: BRIEF_PATH,
      handler: (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { allow: 'GET, HEAD' })
          res.end()
          return
        }
        void (async () => {
          const url = new URL(req.url ?? BRIEF_PATH, 'http://127.0.0.1')
          const force = resolved.refreshOnDemand && url.searchParams.get('refresh') === '1'
          const payload = await briefing(ctx, resolved, force)
          const body = Buffer.from(JSON.stringify(payload), 'utf8')
          res.writeHead(200, {
            'content-type': 'application/json; charset=utf-8',
            'content-length': String(body.length),
            'cache-control': 'no-store',
          })
          res.end(req.method === 'HEAD' ? undefined : body)
        })().catch((error) => {
          const body = Buffer.from(JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            requestId: randomUUID(),
          }), 'utf8')
          if (!res.headersSent) {
            res.writeHead(502, { 'content-type': 'application/json; charset=utf-8', 'content-length': String(body.length) })
            res.end(body)
          } else {
            res.destroy()
          }
        })
      },
    }), 'github-trending: brief route')
  })
}
