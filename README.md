# dsh-github-trending

A daily GitHub trending briefing for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness):
an overall leaderboard, per-domain hotspots, and a model-written summary — as a full-width main panel.

## What it adds

- **Sidebar row + main panel**: today's leaderboard with `+stars` bars, language, and description.
- **Per-domain hotspots**: AI & LLM, web, backend & infra, data, devtools, security, systems, mobile.
- **Model summary**: one `ctx.llm.stream` call writes the overall read plus one line per domain.
- **`gh_trending_brief` tool**: the same story for the agent, optionally filtered by `domain`.
- **`GET /gh-trending/brief[?refresh=1]`**: the JSON the panel reads.

## How it works

1. `https://github.com/trending?since=daily` is read through the system `curl` (Node's fetch cannot verify
   this machine's intercepted TLS chain), falling back to the GitHub Search API.
2. Repositories are bucketed by word-bounded keywords plus a language hint.
3. The compact leaderboard goes to the configured model, which returns JSON `{ overall, domains }`.
4. The payload is cached for `cacheMinutes` (default 30); `?refresh=1` bypasses it.

## Configuration

| Key | Default | Meaning |
|---|---|---|
| `provider` | `deepseek-account` | LLM provider id |
| `model` | `deepseek-flash` | LLM model id |
| `topOverall` | `12` | Leaderboard length |
| `perDomain` | `5` | Repositories per domain |
| `cacheMinutes` | `30` | Reuse window for the fetch and the summary |
| `refreshOnDemand` | `true` | Allow `?refresh=1` |

## Install

Add `https://prophetcrab.github.io/dsh-plugins/index.json` in Settings → Plugins → Discover, or:

```json
{
  "dependencies": {
    "dsh-github-trending": "github:prophetcrab/dsh-github-trending"
  }
}
```

## License

MIT
