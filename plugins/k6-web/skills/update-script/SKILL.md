---
name: update-script
description: "Modify an existing k6-web script (load, target, headers, checks, etc.)."
argument-hint: "<scriptId> <change request>"
allowed-tools: "Bash(curl:*) Bash(jq:*) Write Read"
---

Fetch an existing k6 script and change it as requested, following the `k6-script-authoring` skill.
Resolve `$BASE` per its section 0 first, and handle connection failures per section 0-1.

## Input

$ARGUMENTS

(If the text above is the literal `$ARGUMENTS`, use the user's message instead.)
The first token is the scriptId; the rest is the change request.
If there is no scriptId, point the user to the `folders` skill and stop.

## Steps

1. **Fetch.** `curl -s -m 10 "$BASE/v1/scripts/<scriptId>"`. On 404, ask the user to check the scriptId.
   Remember `folderId` — updates go through the folder path.

2. **Draft the change.** Change only what was requested. When the load changes, update
   `options` and `config` **together**, never just one.

3. **Show the diff** of what changes and wait for approval.

4. **Apply.** `PUT $BASE/v1/folders/<folderId>/scripts/<scriptId>` with only the changed fields
   (no `scriptId` in the body). On `Script does not belong to this folder`, re-check the folderId from step 1.

Do not delete scripts. Do not run the test.
