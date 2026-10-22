---
name: run-test
description: "Run a registered k6-web script on k6-agent, wait for it to finish, and summarize the result."
argument-hint: "<scriptId>"
allowed-tools: "Bash(curl:*) Bash(jq:*) Bash(column:*) Bash(sleep:*)"
---

Run a saved script on k6-agent and report the result, following the `k6-script-authoring` skill.
Resolve `$BASE` per its section 0 first, and handle connection failures per section 0-1.

A load test sends real traffic to the target system. **Never start one without the user's
explicit confirmation in this conversation.**

## Input

$ARGUMENTS

(If the text above is the literal `$ARGUMENTS`, use the user's message instead.)

The first token is the scriptId. If there is none, point the user to the `folders` skill and stop.

## Steps

1. **Fetch the script.** `curl -s -m 10 "$BASE/v1/scripts/<scriptId>" | jq '{scriptId, folderId, description, config}'`.
   On 404, ask the user to check the scriptId.

2. **Confirm.** Show the target (`config.url`, `config.method`), the load (`template`, VUs or TPS,
   duration or stages), and the estimated run time, then ask the user to confirm.
   If the user wants a different load, explain that the load comes from the script's `options`
   and offer the `update-script` skill first. Do not pass a `config` override to the run API.

3. **Start.** `curl -s -m 10 -X POST "$BASE/v1/scripts/<scriptId>/run" -H 'Content-Type: application/json' -d '{}'`.
   Report the `testId` and status. If it is `queued`, say another test is running on the agent.

4. **Wait.** Poll in rounds of at most ~90 seconds so a single command never hits a tool timeout,
   and give a short progress note between rounds:
   ```bash
   for i in $(seq 1 9); do
     S=$(curl -s -m 10 "$BASE/v1/tests/$TEST_ID" | jq -r '.status')
     case "$S" in completed|failed|stopped|cancelled) break;; esac
     sleep 10
   done; echo "$S"
   ```
   Repeat until the status is terminal (`completed`, `failed`, `stopped`, `cancelled`).
   If curl fails mid-run, diagnose per section 0-1; the test keeps running on the agent.
   If the user asks to stop, use the `stop-test` skill with this testId.

5. **Summarize.** Fetch `GET $BASE/v1/tests/$TEST_ID` and, using section 8 of the skill, show:
   status, exit code, duration, VUs, TPS, avg / p95 latency, failure rate, and check pass rate.
   Call out problems: non-`completed` status, non-zero `exitCode` (likely `abortOnFail` threshold),
   failure rate > 0, check pass rate < 100%. Add a one-line verdict.
   Mention the `script-summary` skill for comparing with previous runs.

Do not modify or delete scripts. Do not run more than the one requested script.
