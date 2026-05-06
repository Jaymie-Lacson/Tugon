---
name: commit
description: Analyze chat context and git changes, then commit with conventional commit message. Use when the user asks to commit or when work is complete and ready to commit.
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash, Read, Grep, LSPDiagnostics
---

# Smart Commit

Analyze the current conversation context and git changes to create an intelligent commit.

## Steps

1. **Gather git changes**:
   - Run `git status` to see modified/added/deleted files
   - Run `git diff --staged` and `git diff` to see actual changes
   - Run `git log --oneline -5` to see recent commit style

2. **Analyze chat context**:
   - Review the conversation to understand WHAT was done and WHY
   - Identify the type of change: fix, feat, refactor, chore, style, docs
   - Note any bug numbers or issue references mentioned

3. **Determine commit type**:
   - `fix`: Bug fixes (e.g., "fix sidebar nav flicker")
   - `feat`: New features (e.g., "add user profile page")
   - `refactor`: Code restructuring without behavior change
   - `chore`: Build process, deps, tooling
   - `style`: UI/UX changes, styling
   - `perf`: Performance improvements
   - `test`: Adding or fixing tests

4. **Generate commit message** following Conventional Commits:
   ```
   type(scope): brief description (50 chars or less)
   
   - Detailed point about change 1
   - Detailed point about change 2
   - Fixes #issue-number (if applicable)
   ```
   
   **Scope examples**: citizen, official, superadmin, shared, ui, api, db
   **Keep title under 50 chars, body under 72 chars per line**

5. **Show commit message**:
   - Display the generated commit message

6. **Execute commit** (user already confirmed intent by invoking this skill):
   - Run `git add <changed-files>`
   - Run `git commit -m "<message>"` (use proper quoting for multi-line)
   - Show commit result

## Rules

- **NEVER commit without showing the message first and getting confirmation**
- **NEVER add files that contain secrets** (.env, credentials.json, etc.)
- **NEVER commit if there are no staged or unstaged changes**
- Follow the existing commit style (check `git log`)
- Keep commits atomic: one logical change per commit
- If multiple unrelated changes exist, suggest splitting into multiple commits
- If unsure about scope, use the directory/feature name

## Examples

**Bug fix example**:
```
fix(citizen): fix sidebar nav flicker on route change

- Initialize activeTab from URL params on mount
- Derive currentTab prioritizing URL params for immediate highlighting
- Pass currentTab as activeNavKey to CitizenPageLayout
- Verify other roles (official, superadmin) don't have same issue
```

**Feature example**:
```
feat(map): add heatmap clustering for officials

- Implement threshold-based clustering for incident density
- Add toggle control for heatmap visibility
- Update map legend to show intensity scale
```
