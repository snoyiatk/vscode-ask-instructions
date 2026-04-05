# Webhook Simulation Review Debugging

Use this helper when validating issue-comment automation events such as:

`/devagent:review debug webhook simulation`

## Run

```bash
npm run review:webhook-simulation -- examples/issue-comment-webhook-debug.json
```

## What it checks

- Detects `/devagent:review ...` command payloads
- Extracts trigger source object ID from:
  1. `issue.id` (preferred)
  2. `issue.number`
  3. `object_attributes.issue_id`
  4. delivery suffix fallback
  5. `hookId` fallback
- Suggests branch name in required format: `ai/fix-issue-{trigger-source-object-id}`
- Reports warnings when expected fields are missing

## Why this exists

Some simulated payloads omit `issue.id`. This utility gives deterministic fallback behavior and explicit warnings so pipeline runs remain debuggable.
