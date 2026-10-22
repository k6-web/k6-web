---
name: stop-test
description: "Stop a running k6-web test or cancel a queued/scheduled one."
argument-hint: "[testId]"
allowed-tools: "Bash(curl:*) Bash(jq:*)"
---

Stop a test on k6-agent, following the `k6-script-authoring` skill.
Resolve `$BASE` per its section 0 first, and handle connection failures per section 0-1.

## Input

Optional testId: $ARGUMENTS

(If the text above is the literal `$ARGUMENTS`, take the testId from the user's message instead.
If a test was started earlier in this conversation, its testId is the default candidate.)

## Steps

1. **Find the test.** Without a testId, list active tests and let the user choose:
   ```bash
   curl -s -m 10 "$BASE/v1/tests?limit=50" \
     | jq '[.tests[] | select(.status=="running" or .status=="queued" or .status=="scheduled")
           | {testId, scriptId, name, status, startTime}]'
   ```
   If none are active, say so and stop.

2. **Confirm** the testId, its script, and its status with the user.

3. **Stop.** `curl -s -m 10 -X PUT "$BASE/v1/tests/<testId>/stop"`.
   A running test is stopped; a queued or scheduled test is cancelled.
   On 404 `Test not found or not running`, the test has already finished — say so.

4. **Report** the final status from `GET $BASE/v1/tests/<testId>` (filter with jq).
   A stopped run is saved as `stopped`; its partial metrics can be read with the `script-summary` skill.
