# dsh-github-trending

A daily GitHub trending briefing for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness):
an overall leaderboard, per-domain hotspots, and a model-written summary — as a full-width main panel.

## What it adds

- **Dashboard**: KPI tiles (repos trending, stars gained, new projects, languages), a bar chart of
  today's star gain, and a donut of the domain split.
- **Today's hotspots**: the full leaderboard as cards with `+stars`, language and total stars.
- **Model summary**: one `ctx.llm.stream` call writes the overall read, one line per domain, and a read
  on the new projects.
- **New projects (last 5 days)**: repositories created in the last five days, by stars, with their age.
- **Browse by domain**: a chip picker that filters both the hotspot board and the new-project board.
- **`gh_trending_brief` tool**: the same story for the agent, optionally filtered by `domain`.
- **`GET /gh-trending/brief[?refresh=1]`**: the JSON the panel reads.

## How it works

1. `https://github.com/trending?since=daily` is read through the system `curl` (Node's fetch cannot verify
   this machine's intercepted TLS chain), falling back to the GitHub Search API.
2. Repositories are bucketed by word-bounded keywords plus a language hint.
3. New projects come from the GitHub Search API (`created:>5d`, sorted by stars).
4. The compact data goes to the configured model, which returns JSON `{ overall, domains, fresh }`.
5. The payload is cached for `cacheMinutes` (default 30); `?refresh=1` bypasses it.

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
