# msync

Scan Claude Code memories across all projects, select and export them as a consolidated prompt for Claude.ai.

## Install

```bash
npm install -g .
```

## Usage

```bash
msync                # Interactive: select memories → choose model → stream formatted output → clipboard
msync --list         # List all memories
msync --all          # Select all, skip interactive picker
msync --export out.md  # Save to file instead of clipboard
msync --model opus   # Skip model picker (sonnet/opus/haiku)
```

## How it works

1. Scans `~/.claude/projects/*/memory/*.md` for all stored memories
2. Interactive checkbox to pick which memories to include
3. Sends selected memories to Claude for deduplication and formatting
4. Copies result to clipboard (or exports to file)
