# claude-msync

Sync Claude Code memories to Claude clients (claude.ai / Claude App).

Claude Code stores memories as local markdown files, but these are not accessible from Claude clients. `claude-msync` scans memory files across all projects, generates a structured summary via Claude's memory migration prompt locally, and copies it to your clipboard — ready to paste into a Claude client as a Project Prompt.

## Install

```bash
npx claude-msync             # run directly
npm install -g claude-msync  # or install globally as `msync`
```

## Usage

```bash
msync                    # Interactive select → choose model → stream summary → clipboard
msync --list             # List all memories
msync --all              # Select all, skip picker
msync --export out.md    # Export to file
msync --model opus       # Specify model (sonnet/opus/haiku)
```

## How it works

1. Scans all Claude Code auto-generated memory locations (see below)
2. Interactive multi-select picker (all selected by default)
3. Calls local Claude CLI with a memory migration prompt to deduplicate and categorize
4. Copies result to clipboard
5. Go to [claude.ai/settings/capabilities](https://claude.ai/settings/capabilities), click **Start Import**, paste the result to sync

### Scanned locations

| Source | Location |
|--------|----------|
| Project auto memory | `~/.claude/projects/*/memory/*.md` (including `MEMORY.md` index) |
| Subagent memory (user scope) | `~/.claude/agent-memory/*/*.md` |
| Subagent memory (project scope) | `<project>/.claude/agent-memory/*/*.md` |
| Subagent memory (local scope) | `<project>/.claude/agent-memory-local/*/*.md` |
| Custom memory directory | Via `autoMemoryDirectory` in `~/.claude/settings.json` |

Only auto-generated memory is included. User-authored files (`CLAUDE.md`, `AGENTS.md`, etc.) are never scanned.

## Example output

```
**Instructions**

[2026-04-01] - When encountering model ID issues, check proxy config and connectivity first
[2026-04-07] - Apply code changes directly instead of describing what to change

**Identity**

[unknown] - Username: johndoe
[unknown] - Platform: macOS Apple Silicon, using Homebrew

**Career**

[unknown] - Full-stack indie developer, building a React Native social app

**Projects**

[2026-04-01] - proxy-config (~/.config/myproxy): routes API requests through
  a local proxy at 127.0.0.1:8317; config at /opt/homebrew/etc/proxy.conf;
  auth_unavailable error means OAuth token expired — delete stale credential
  JSON and restart

[2026-04-08] - my-app voice call feature (branch: feat/voice-call): core paid
  feature with real-time AI conversation + quota billing + IAP; includes
  audio controls, AI state machine (Listening→Thinking→Speaking→Interrupted→
  Finished), subtitle sync, auto-recharge prompt on quota exhaustion, silence
  detection (10s threshold)

**Preferences**

[unknown] - Uses RTK (Rust Token Killer) to optimize CLI token consumption via hooks
```
