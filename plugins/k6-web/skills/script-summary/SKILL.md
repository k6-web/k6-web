---
name: script-summary
description: "Summarize recent run history of a k6-web script and highlight performance changes."
argument-hint: "<scriptId> [count]"
allowed-tools: "Bash(curl:*) Bash(jq:*) Bash(column:*)"
---

Summarize a script's recent runs, following the `k6-script-authoring` skill (section 8).
Resolve `$BASE` per its section 0 first, and handle connection failures per section 0-1.
Read-only: do not run tests or modify scripts.

## Input

$ARGUMENTS

(If the text above is the literal `$ARGUMENTS`, use the user's message instead.)
The first token is the scriptId; the second (a number) is how many runs to fetch, default `10`.
If there is no scriptId, point the user to the `folders` skill and stop.

## Steps

1. **Fetch history.** `GET $BASE/v1/scripts/<scriptId>/history?limit=<N>`.
   - On 404, ask the user to check the scriptId.
   - If `tests` is empty, say there are no runs yet and stop.
   - The response is very large. **Never print it raw**; extract fields with jq.

2. **Table**, newest first, with the section 8 query:

   | Time | Status | VUs | Duration | TPS | p95(ms) | Fail rate | Checks |

   To see the run conditions:
   ```bash
   curl -s -m 10 "$BASE/v1/scripts/<scriptId>/history?limit=10" \
     | jq '[.tests[] | {testId, status, startTime, exitCode,
         cfg:{template:.config.template, vusers:.config.vusers, duration:.config.duration}}]'
   ```

3. **Trend.** With 2+ runs, compare **the latest with the previous run**:
   - Change in p95, TPS, and failure rate, as absolute values and %.
   - Regression thresholds: p95 up ≥ 10%, TPS down ≥ 10%, any failure-rate increase.
   - With 3+ runs, describe the overall direction (improving / regressing / fluctuating) in one line.
   - If `config.vusers`, `duration`, or `template` differ, **state that a direct comparison is not meaningful**.

4. **Anomalies** (only those that apply): `failed` / `stopped` runs, failure rate > 0,
   check pass rate < 100%, non-zero `exitCode`.

5. **Wrap up** in the order table → trend → anomalies, then 2–3 lines with a judgment on
   **what is wrong or whether it is stable**, not just a list of numbers.
