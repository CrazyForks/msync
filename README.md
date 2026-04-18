# claude-msync

Sync Claude Code memories to Claude clients (claude.ai / Claude App).
将 Claude Code 的记忆同步到 Claude 客户端（claude.ai / Claude App）。

Claude Code stores memories as local markdown files, but these are not accessible from Claude clients. `claude-msync` scans memory files across all projects, generates a structured summary using Claude's official prompt locally, and copies it to your clipboard — ready to paste into a Claude client as a Project Prompt.
Claude Code 将记忆存储为本地 markdown 文件，但这些文件在 Claude 客户端中无法访问。`claude-msync` 会扫描所有项目的记忆文件，使用 Claude 官方 prompt 在本地生成结构化摘要，并复制到剪贴板 —— 可直接粘贴到 Claude 客户端作为 Project Prompt 使用。

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
   扫描所有 Claude Code 自动生成的记忆位置（见下方）
2. Interactive multi-select picker (all selected by default)
   交互式多选器（默认全选）
3. Calls local Claude CLI with Claude's official prompt to deduplicate and categorize
   调用本地 Claude CLI，使用 Claude 官方 prompt 进行去重和分类
4. Copies result to clipboard
   将结果复制到剪贴板
5. Go to [claude.ai/settings/capabilities](https://claude.ai/settings/capabilities), click **Start Import**, paste the result to sync
   打开 [claude.ai/settings/capabilities](https://claude.ai/settings/capabilities)，点击 **Start Import**，粘贴结果完成同步

### Scanned locations

| Source / 来源 | Location / 路径 |
|--------|----------|
| Project auto memory / 项目自动记忆 | `~/.claude/projects/*/memory/*.md` (including `MEMORY.md` index / 包含 `MEMORY.md` 索引) |
| Subagent memory (user scope) / 子代理记忆（用户级） | `~/.claude/agent-memory/*/*.md` |
| Subagent memory (project scope) / 子代理记忆（项目级） | `<project>/.claude/agent-memory/*/*.md` |
| Subagent memory (local scope) / 子代理记忆（本地级） | `<project>/.claude/agent-memory-local/*/*.md` |
| Custom memory directory / 自定义记忆目录 | Via `autoMemoryDirectory` in `~/.claude/settings.json` / 通过 `~/.claude/settings.json` 中的 `autoMemoryDirectory` 配置 |

Only auto-generated memory is included. User-authored files (`CLAUDE.md`, `AGENTS.md`, etc.) are never scanned.
仅包含自动生成的记忆。用户编写的文件（`CLAUDE.md`、`AGENTS.md` 等）不会被扫描。

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
