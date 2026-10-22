---
name: folders
description: "List k6-web folders and the scripts inside them."
argument-hint: "[folderId]"
allowed-tools: "Bash(curl:*) Bash(jq:*)"
---

List folders on k6-agent and show them to the user. Read-only: never create, update, or delete anything.

Follow the `k6-script-authoring` skill. Resolve `$BASE` per its section 0 first, and handle
connection failures per section 0-1.

## Input

Optional folderId: $ARGUMENTS

(If the text above is the literal `$ARGUMENTS`, take the folderId from the user's message instead.)

## Steps

1. `curl -s -m 10 "$BASE/v1/folders?sortBy=updatedAt&sortOrder=desc"` to list folders.
2. If a folderId was given, also `curl -s -m 10 "$BASE/v1/folders/<folderId>"` for its scripts.
3. Show a table. Folders: `folderId`, `name`, `description`.
   Folder detail: `scriptId`, `description`, `tags`, `config.template`.
