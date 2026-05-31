<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Agent Constraints
- NEVER run `git checkout`, `git reset`, `git restore`, or `git clean` to revert workspace changes.
- NEVER rename, copy over, or overwrite active source files using `.backup` or fallback files.
- If compile, lint, or type errors arise, troubleshoot and fix them inline inside the active files. Do not revert to previous states to resolve build issues.
