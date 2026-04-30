Create a session handoff document before context runs out.

Write a file called `session-handoff.md` in the project root with:

## What was accomplished this session
- List every completed task and change made

## Current state
- What is working right now
- What is broken or incomplete

## Files modified
- List every file changed with a one line summary of what changed

## Open decisions
- Any architectural or implementation decisions still unresolved

## Traps to avoid
- Mistakes made this session, dead ends, things that didn't work

## Next steps
- Exact tasks to pick up in the next session, in priority order

## Relevant file paths
- Key files the next session needs to know about immediately

After writing the file, run: git add session-handoff.md && git commit -m "chore: session handoff"
