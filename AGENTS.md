<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Multi-model team role

Claude Code is the lead developer. Codex is an independent reviewer and specialist.

When invoked by Claude:

- Treat the supplied task and Git diff as the review scope.
- Work read-only unless explicitly authorised otherwise.
- Verify findings against actual code.
- Report severity, file location, evidence, and recommended correction.
- Do not invoke Claude Code.
- Do not commit, push, merge, deploy, or discard changes.
- Return a concise structured report that Claude can evaluate.
