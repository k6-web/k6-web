---
name: k6-script-authoring
description: "Rules for writing k6 load test scripts for k6-web and calling the k6-agent API (folders, scripts, test runs, history). Use when creating, editing, running, or analyzing k6-web scripts."
allowed-tools: "Read Write Bash(curl:*) Bash(jq:*) Bash(column:*) Bash(sleep:*)"
user-invocable: false
---

# k6-web Script Authoring Guide

Generate k6 scripts for the k6-web k6-agent API and operate on them.
Generated scripts must use **the same format** as scripts produced by k6-web's Postman import.

## 0. Base URL

Resolve the k6-agent API URL (`$BASE` below) in this order:

1. `${user_config.agent_url}` — Claude Code substitutes this from the plugin settings.
   If it is empty or still the literal text `${user_config.agent_url}`, skip it.
2. The `K6_AGENT_URL` environment variable (`echo "$K6_AGENT_URL"`).
3. Otherwise **stop and ask the user**. Never guess a URL, including `http://localhost:3000`.

> The k6-agent URL is not configured. Which URL should I use? (e.g. http://localhost:3000)

Use the answer as `$BASE` for the rest of the session. Do not call any API before you have it.
Strip a trailing `/`. If the scheme is missing (`localhost:3000`), prepend `http://` and say so.

### 0-1. Connection failure diagnosis

Do not run a separate health check. Call the needed API directly with `curl -s -m 10`, and
only when the call fails, diagnose with the table below, stop, and ask for the URL again.

| curl exit / response | Cause | Guidance |
|---|---|---|
| 7 (connection refused) | Agent not running or wrong port | Ask the user to start it (`cd k6-agent && npm run dev`) and check the port |
| 6 (could not resolve host) | Hostname typo | Ask the user to check the URL |
| 28 (timeout) | Firewall, VPN, or wrong port | Ask the user to check the network |
| 404 that is not k6-agent JSON | Not a k6-agent server | Ask whether the URL is really k6-agent |
| **HTTP 200 with HTML** (`<!doctype html>`) | **The k6-front web UI URL was given.** It looks like success but is not JSON | Explain that the k6-agent API URL is needed (agent default port 3000) |
| Other 5xx | Agent internal error | Show the response body and suggest checking agent logs |

On a connection failure, stop. Do not retry other endpoints or guess other ports.

## 1. Hard rules

1. **Scripts must belong to a folder.** The only create endpoint is `POST $BASE/v1/folders/:folderId/scripts`.
   `POST /v1/scripts` **does not exist** (404).
2. **Always fill both `script` and `config`.** They are stored separately; the UI reads `config`
   to display and re-run settings. The code's `options` and `config` **must match**.
3. **`scriptId` is globally unique.** An existing ID in the same folder is silently overwritten;
   an existing ID in another folder returns 400. When generating IDs, use a slug plus `-2`, `-3` suffixes.
4. Always show the folder list and **let the user choose** the folder. Never create one on your own.

## 2. Script format (house style)

```javascript
import http from 'k6/http';
import { check, group } from 'k6';

export const options = { /* section 3 template */ };

export default function () {
  group('Scenario name', () => {
    const res = http.post(
      'https://api.example.com/v1/pay',
      JSON.stringify({ amount: 1000 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    check(res, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });
  });
}
```

- Wrap the body in `group(...)` and validate with `check(...)` inside it.
- Pass JSON bodies with **`JSON.stringify(...)`**, not string literals.
- For GET/HEAD/OPTIONS/DELETE without a body, use `http.get(url, params)`.
- Do not add `sleep()` by default. Only add `import { sleep } from 'k6'` when the user asks for think time.

## 3. options templates

Append this common tail to every template (`THRESHOLD` is `failureThreshold`, default `0.05`):

```javascript
  setupTimeout: '60s',
  teardownTimeout: '60s',
  noConnectionReuse: false,
  batch: 20,
  batchPerHost: 20,
  thresholds: {
    http_req_failed: [
      { threshold: "rate<THRESHOLD", abortOnFail: true },
    ],
  },
```

### 3-1. `constant-vus` — fixed VUs (default)

```javascript
export const options = {
  scenarios: {
    test: { executor: 'constant-vus', vus: 10, duration: '30s' },
  },
  /* common tail */
};
```
config: `{ template: 'constant-vus', vusers: 10, duration: 30 }`

### 3-2. `constant-tps` — fixed TPS

```javascript
export const options = {
  scenarios: {
    test: {
      executor: 'constant-arrival-rate',
      rate: 50, timeUnit: '1s', duration: '60s',
      preAllocatedVUs: 20, maxVUs: 50,
    },
  },
  /* common tail */
};
```
config: `{ template: 'constant-tps', targetTps: 50, duration: 60, preAllocatedVUs: 20, maxVUs: 50 }`
- Ensure `maxVUs >= preAllocatedVUs >= 1` and `rate >= 1`.

### 3-3. `ramp-up` — staged load

```javascript
export const options = {
  scenarios: {
    test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '1s', target: 100 },
        { duration: '60s', target: 100 },
      ],
    },
  },
  /* common tail */
};
```
config: `{ template: 'ramp-up', stages: [{duration:30,target:50},{duration:60,target:100}] }`

**Important — 1-second transitions:** whenever the target differs from the previous stage,
insert `{ duration: '1s', target: <new target> }` before the hold stage. If the target is unchanged,
add only the hold stage. The target before the first stage is 0.
`config.stages` contains **only hold stages**, in seconds, without the transitions.

## 4. K6TestConfig fields

| Field | Type | Purpose |
|---|---|---|
| `template` | `'constant-vus' \| 'constant-tps' \| 'ramp-up'` | Execution mode |
| `url` / `method` / `headers` / `body` | string / object | Target request (UI display) |
| `vusers` | number | VU count |
| `duration` | number | Seconds |
| `rampUp` | number | Seconds |
| `stages` | `{duration,target}[]` | Seconds, hold stages only |
| `targetTps` | number | Target TPS |
| `preAllocatedVUs` / `maxVUs` | number | arrival-rate only |
| `failureThreshold` | number | Default 0.05 |

`duration`, `stages[].duration`, and `rampUp` are **numbers in seconds**. Do not confuse them with `'30s'` in code.

## 5. API calls

Build payloads with `jq` to avoid shell quoting issues. Write the script body to a file and read it with `--rawfile`.
Put temporary files in the session scratch directory (or `mktemp -d`) and clean them up afterwards.

### Folder list
```bash
curl -s -m 10 "$BASE/v1/folders?sortBy=updatedAt&sortOrder=desc" | jq .
```

### Folder detail (script list, for ID collision checks)
```bash
curl -s -m 10 "$BASE/v1/folders/<folderId>" | jq '{name:.folder.name, scriptCount, scripts:[.scripts[]|{scriptId,description}]}'
```

### Get a script
```bash
curl -s -m 10 "$BASE/v1/scripts/<scriptId>" | jq .
```
The response includes `folderId`; updates must go through that folder's path.

### Create a script
```bash
jq -n --arg id "$SCRIPT_ID" --rawfile src "$TMP/script.js" \
      --arg desc "$DESC" --argjson cfg "$CONFIG_JSON" --argjson tags "$TAGS_JSON" \
  '{scriptId:$id, script:$src, description:$desc, config:$cfg, tags:$tags}' \
  > "$TMP/payload.json"

curl -s -m 10 -X POST "$BASE/v1/folders/$FOLDER_ID/scripts" \
  -H 'Content-Type: application/json' --data @"$TMP/payload.json" | jq .
```
Returns 201 with the `Script` object.

### Update a script
```bash
curl -s -m 10 -X PUT "$BASE/v1/folders/$FOLDER_ID/scripts/$SCRIPT_ID" \
  -H 'Content-Type: application/json' --data @"$TMP/payload.json" | jq .
```
Omitted fields keep their values. Do not put `scriptId` in the body.

### Run a script
```bash
curl -s -m 10 -X POST "$BASE/v1/scripts/$SCRIPT_ID/run" \
  -H 'Content-Type: application/json' -d '{}' | jq .
```
Returns `{testId, status}`. Tests run **one at a time** on an agent; a new test may stay `queued`.
The load is defined by the script's `options`, not by the `config` in the request body —
to change the load, update the script first.

### Test status / result
```bash
curl -s -m 10 "$BASE/v1/tests/$TEST_ID" | jq '{testId, status, startTime, endTime, exitCode}'
```
Statuses: `scheduled`, `queued`, `running` (in progress); `completed`, `failed`, `stopped`, `cancelled` (terminal).
While running, the response contains logs; always filter it with `jq`.

### Stop a test
```bash
curl -s -m 10 -X PUT "$BASE/v1/tests/$TEST_ID/stop" | jq .
```
Stops a running test or cancels a queued one.

## 6. Error handling

| Response | Meaning | Action |
|---|---|---|
| 400 `Script content is required` | Empty script | Check the body |
| 400 `Maximum number of scripts per folder (N) reached` | Folder limit | Ask the user to choose another folder |
| 400 `Script with ID '...' already exists` | Same ID in another folder | Retry with a suffix |
| 400 `Script does not belong to this folder` | Wrong folderId | Re-check the folder |
| 404 `Folder not found: ...` | Folder missing | Reload the list |
| 404 `Script not found` | Wrong scriptId | Point the user to the `folders` skill |
| 404 `Test not found` | Wrong testId | Check the testId |
| Connection failure | Agent unreachable | See section 0-1 |

## 7. Do not

- Create folders without the user's confirmation.
- **Delete folders or scripts.** Deleting a folder deletes all of its scripts unconditionally.
- Start a test without the user's explicit confirmation. A load test sends real traffic to the target.
- Put auth tokens or passwords in scripts that the user did not provide.
  Use environment references such as `__ENV.TOKEN` and tell the user.

## 8. Run history and metric interpretation

`GET $BASE/v1/scripts/<scriptId>/history?limit=<N>` returns `{scriptId, tests: TestResult[], count}`,
newest first. `count` is **the number returned**, not the total. At most 50 runs per script are kept.

Each `tests[]` entry includes the full `script` and `timeSeriesSnapshot` (up to 100 points), so the
response is large. **Always extract only the needed fields with jq.** `GET /v1/tests/:testId`
returns the same `TestResult` shape for a single finished run.

### Key fields

| Path | Meaning |
|---|---|
| `status` | `completed` / `failed` / `stopped` |
| `startTime`, `endTime` | epoch ms |
| `duration` | Run time (ms) |
| `exitCode` | k6 exit code. Non-zero usually means a threshold abort |
| `config` | Settings at run time (`template`, `vusers`, `duration`) |
| `summary.metrics` | k6 summary metrics |

### Reading `summary.metrics` — pitfalls

| Metric | How to read |
|---|---|
| `http_req_duration` | `avg`/`min`/`med`/`max`/`p(90)`/`p(95)`. **Keys contain parentheses** → `["p(95)"]`. `p(99)` may be missing |
| `http_req_failed.value` | **Failure rate (0–1).** Use this value |
| `http_req_failed.passes` / `.fails` | **Counter-intuitive.** A healthy run shows `passes:0, fails:41`. **Do not use them as counts** |
| `checks.value` | **Pass rate (0–1).** Counts are `passes`/`fails` |
| `http_reqs.rate` | Requests per second (TPS). `count` is the total |
| `iterations` | `count`, `rate` |
| `vus_max.value` | Max VUs |
| `http_req_waiting` | Server time (TTFB). A large gap to `duration` points to network/transfer bottlenecks |

`summary` can be `null` (k6 failed to write a summary). Always guard with `// 0`.
Tagged keys such as `http_req_duration{expected_response:true}` also exist; select exactly `http_req_duration`.

### Metric table query

```bash
jq -r '
  ["Time","Status","VUs","Duration","TPS","p95(ms)","Fail rate","Checks"],
  (.tests[] | [
    (.startTime/1000 | strflocaltime("%m-%d %H:%M")),
    .status,
    (.summary.metrics.vus_max.value // "-" | tostring),
    ((.duration/1000|floor|tostring) + "s"),
    (.summary.metrics.http_reqs.rate // 0 | .*100|round|./100 | tostring),
    (.summary.metrics.http_req_duration["p(95)"] // 0 | .*10|round|./10 | tostring),
    ((.summary.metrics.http_req_failed.value // 0) * 100 | .*100|round|./100 | tostring + "%"),
    ((.summary.metrics.checks.value // 0) * 100 | .*10|round|./10 | tostring + "%")
  ]) | @tsv' | column -t -s$'\t'
```
For a single `GET /v1/tests/:testId` response, wrap it first: `jq '{tests:[.]}' | jq -r '...'`.

### Comparison caveat

If `config.vusers`, `duration`, or `template` differ between runs, do not compare metrics directly.
Different load naturally produces different TPS and latency. State that first.
