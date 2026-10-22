# k6-web Plugin for Claude Code and Codex

Create, run, and analyze k6-web load tests in natural language from Claude Code or Codex.
The plugin talks to a running **k6-agent** API server.

## Requirements

- A reachable k6-agent (see the [Quick Start](../../README.md#quick-start))
- `curl` and `jq` on the machine running Claude Code or Codex

## Install

### Claude Code

```
/plugin marketplace add k6-web/k6-web
/plugin install k6-web@k6-web
```

You will be asked for the **k6-agent API URL** (for example `http://localhost:3000`).
Change it later from the `/plugin` menu.

### Codex

```sh
codex plugin marketplace add k6-web/k6-web --sparse .agents/plugins --sparse plugins/k6-web
codex plugin add k6-web@k6-web
```

Set the agent URL with an environment variable
before starting Codex, or the plugin will ask for it:

```sh
export K6_AGENT_URL=http://localhost:3000
```

> The URL is the **k6-agent API**, not the k6-front web UI.
> `<url>/health` must return `{"status":"ok"}`.

## Skills

| Skill | Arguments | Purpose |
|---|---|---|
| `folders` | `[folderId]` | List folders and their scripts |
| `new-script` | `<requirements>` | Generate a script from natural language and register it |
| `update-script` | `<scriptId> <change>` | Modify an existing script |
| `run-test` | `<scriptId>` | Run a script, wait for completion, and summarize the result |
| `stop-test` | `[testId]` | Stop a running test or cancel a queued one |
| `script-summary` | `<scriptId> [count]` | Summarize recent runs and performance trends |

In Claude Code, invoke them as `/k6-web:<skill>`:

```
/k6-web:folders
/k6-web:new-script POST https://api.example.com/pay with 100 VUs for 3 minutes
/k6-web:update-script payment-load increase the duration to 5 minutes
/k6-web:run-test payment-load
/k6-web:stop-test
/k6-web:script-summary payment-load 5
```

In Codex, mention the skill (for example `$run-test payment-load`) or just ask in plain language,
such as "run payment-load and summarize the result".

## Behavior

- Scripts follow the same format as k6-web's Postman import (`constant-vus`, `constant-tps`, `ramp-up`).
  Without a load setting, `constant-vus` with 10 VUs for 30 seconds is used.
- The plugin always asks before registering or changing a script, creating a folder,
  starting a test, or stopping a test.
- The load of a run comes from the script itself. To change it, update the script first.
- Deleting scripts or folders is not supported.
