---
name: new-script
description: "Generate a k6 load test script from a natural-language request and register it in a k6-web folder."
argument-hint: "<test requirements>"
allowed-tools: "Bash(curl:*) Bash(jq:*) Write Read"
---

Create a k6 script following the `k6-script-authoring` skill and register it in k6-web.
Resolve `$BASE` per its section 0 first, and handle connection failures per section 0-1.

## Requirements

$ARGUMENTS

(If the text above is the literal `$ARGUMENTS`, use the user's message instead.)

## Steps

1. **Parse the request.** Extract the target URL, HTTP method, headers, body, load shape
   (fixed VUs / fixed TPS / ramp-up), and VUs, TPS, or duration.
   Ask only for information **without which no script can be written**, such as the target URL.
   If no load is specified, use `constant-vus` with 10 VUs for 30 seconds and say so.

2. **Choose a folder.** List folders with
   `curl -s -m 10 "$BASE/v1/folders?sortBy=updatedAt&sortOrder=desc"` and **let the user choose**.
   If there are none, ask whether to create one, and call `POST /v1/folders` only after approval.

3. **Pick a scriptId.** Slugify the scenario name (lowercase, non-alphanumerics → `-`, max 60 chars).
   Compare against the chosen folder's scripts and append `-2`, `-3` on collision.

4. **Generate the script** with the skill's house style and templates.
   Keep `options` and `config` consistent.

5. **Confirm before registering.** Show the script, the folder, the scriptId, and the config,
   and wait for approval.

6. **Register.** Write the script to a temp file, build the payload with `jq --rawfile`, and call
   `POST $BASE/v1/folders/<folderId>/scripts`. On success, report the scriptId and folder name and
   mention that the `run-test` skill can run it. On failure, follow the skill's section 6.

Do not run the test. This skill ends at registration.
