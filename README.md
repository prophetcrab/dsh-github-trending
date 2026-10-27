# dsh-github-trending

A daily GitHub trending briefing for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness):
an overall leaderboard, per-domain hotspots, and a model-written summary — as a full-width main panel.

## What it adds

- **Two pages under one sidebar entry**: `GitHub` (trending repositories) and `Papers` (recent AI papers).
- **Papers page**: Hugging Face daily papers ranked by upvotes and recency, topic split, the model's daily read,
  a Chinese one-liner per paper, a just-submitted list, and a topic picker.
- **Dashboard**: KPI tiles (repos trending, stars gained, new projects, languages), a bar chart of
  today's star gain, and a donut of the domain split.
- **Today's hotspots**: the full leaderboard as cards with `+stars`, language and total stars.
- **Model summary**: one `ctx.llm.stream` call writes the overall read, one line per domain, a read on the new
  projects, and a Chinese one-liner for every repository shown.
- **New projects (last 5 days)**: repositories created in the last five days, by stars, with their age.
- **Browse by domain**: a chip picker that filters both the hotspot board and the new-project board.
- **`paper_brief` tool**: the paper digest with its Chinese one-liners.
- **`gh_trending_brief` tool**: the same story for the agent, optionally filtered by `domain`.
- **`GET /gh-trending/brief[?refresh=1]`**: the JSON the panel reads.

## Data sources

- `github.com/trending?since=daily` (HTML) with the GitHub Search API as a fallback, plus `created:>5d` for new projects.
- `huggingface.co/api/daily_papers` for the paper page: upvotes, AI keywords, abstract, arXiv id.

## How it works

1. `https://github.com/trending?since=daily` is read through the system `curl` (Node's fetch cannot verify
   this machine's intercepted TLS chain), falling back to the GitHub Search API.
2. Repositories are bucketed by word-bounded keywords plus a language hint.
3. New projects come from the GitHub Search API (`created:>5d`, sorted by stars).
4. The compact data goes to the configured model, which returns JSON `{ overall, domains, fresh, repos }`;
   `repos` maps each repository to its Chinese one-liner, shown on the card instead of the English description.
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
