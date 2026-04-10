#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync, spawn } from 'child_process'
import checkbox, { Separator } from '@inquirer/checkbox'
import select from '@inquirer/select'

// Map j/k to ↓/↑ for all inquirer prompts
const origEmit = process.stdin.emit.bind(process.stdin)
process.stdin.emit = function (event, ...args) {
  if (event === 'keypress') {
    const key = args[1]
    if (key && !key.ctrl && !key.meta) {
      if (key.name === 'j') return origEmit('keypress', undefined, { ...key, name: 'down' })
      if (key.name === 'k') return origEmit('keypress', undefined, { ...key, name: 'up' })
    }
  }
  return origEmit(event, ...args)
}

const HOME = process.env.HOME
const PROJECTS_DIR = path.join(HOME, '.claude', 'projects')

// ===== CLI args =====

const args = process.argv.slice(2)
const listOnly = args.includes('--list')
const selectAll = args.includes('--all')
const exportIdx = args.indexOf('--export')
const exportPath = exportIdx !== -1 ? args[exportIdx + 1] : null
const modelIdx = args.indexOf('--model')
const modelArg = modelIdx !== -1 ? args[modelIdx + 1] : null

const MODEL_MAP = {
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-6',
  haiku: 'claude-haiku-4-5-20251001',
}
const modelId = modelArg ? (MODEL_MAP[modelArg] || modelArg) : MODEL_MAP.sonnet

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  memory-sync — Sync Claude Code memories

  Usage:
    memory-sync              Interactive select → format → clipboard
    memory-sync --list       List all memories
    memory-sync --all        Select all → format → clipboard
    memory-sync --export <f> Export to file
    memory-sync --model <m>  Model: sonnet(default), opus, haiku
  `)
  process.exit(0)
}

// ===== Prompt =====

const PROMPT = `You are a memory consolidation assistant. I'll give you a set of Claude Code memories from various projects.

Your task: merge and deduplicate them into a single, clean memory document that can be imported as a Claude.ai project prompt.

## Rules:
1. Preserve the user's original words verbatim where possible
2. Deduplicate — if the same fact appears in multiple memories, keep the most detailed version
3. Group into these sections (skip empty ones):
   - **Instructions**: Rules the user asked Claude to follow (tone, format, "always do X", "never do Y")
   - **Identity**: Name, location, education, languages, personal details
   - **Career**: Roles, companies, skills
   - **Projects**: One entry per project — what it does, status, key decisions
   - **Preferences**: Opinions, tastes, working style
4. Within each section, one entry per line, sorted oldest first
5. Format: \`[YYYY-MM-DD] - content\` (use \`[unknown]\` if no date)
6. Wrap entire output in a code block

---

Here are the memories to process:

`

// ===== Helpers =====

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)/)
  if (!m) return { meta: {}, body: content }
  const meta = {}
  m[1].split('\n').forEach(line => {
    const i = line.indexOf(':')
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  })
  return { meta, body: m[2].trim() }
}

function projectName(dirName) {
  const decoded = dirName.replace(/^-/, '').replace(/-/g, '/')
  const home = HOME.replace(/\//g, '/')
  const rel = decoded.startsWith(home.slice(1))
    ? '~/' + decoded.slice(home.length)
    : decoded
  return rel.split('/').slice(-2).join('/')
}

function scanMemories() {
  if (!fs.existsSync(PROJECTS_DIR)) return []
  const memories = []
  for (const proj of fs.readdirSync(PROJECTS_DIR)) {
    const dir = path.join(PROJECTS_DIR, proj, 'memory')
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md') || f === 'MEMORY.md' || f.startsWith('.')) continue
      const content = fs.readFileSync(path.join(dir, f), 'utf8')
      const { meta, body } = parseFrontmatter(content)
      if (!body) continue
      memories.push({
        project: projectName(proj),
        file: f,
        name: meta.name || f.replace('.md', ''),
        type: meta.type || 'unknown',
        description: meta.description || '',
        body
      })
    }
  }
  return memories
}

// ===== Main =====

async function main() {
  const memories = scanMemories()

  if (memories.length === 0) {
    console.log('No memories found.')
    process.exit(0)
  }

  if (listOnly) {
    console.log(`Found ${memories.length} memories:\n`)
    let lastProj = ''
    memories.forEach((m, i) => {
      if (m.project !== lastProj) { lastProj = m.project; console.log(`  \x1B[36m${lastProj}\x1B[0m`) }
      console.log(`  ${String(i + 1).padStart(3)}. [${m.type}]  ${m.name}`)
    })
    return
  }

  let selected
  if (selectAll) {
    selected = memories
    console.log(`Selected all ${memories.length} memories.`)
  } else {
    // Build choices with project separators
    const choices = []
    let lastProj = ''
    for (const m of memories) {
      if (m.project !== lastProj) {
        lastProj = m.project
        choices.push(new Separator(`\x1B[1m\x1B[36m${lastProj}\x1B[0m`))
      }
      choices.push({
        name: `[${m.type}]  ${m.name}`,
        value: m,
        checked: true,
        description: m.body
      })
    }

    selected = await checkbox({
      message: `Select memories to export (${memories.length} found)`,
      choices,
      pageSize: 20,
      theme: {
        icon: {
          cursor: '❯',
          checked: `  \x1B[32m◉\x1B[0m`,
          unchecked: '  ◯',
        },
        style: {
          answer: v => '\n' + v.split(', ').map(s => `  · ${s}`).join('\n'),
          helpTip: v => '\n' + v
        }
      }
    })

    if (selected.length === 0) {
      console.log('Nothing selected.')
      return
    }
  }

  // Select summary model
  let model = modelId
  if (!modelArg) {
    model = await select({
      message: 'Select summary model',
      choices: [
        { name: 'Sonnet 4.6', value: 'claude-sonnet-4-6' },
        { name: 'Opus 4.6',   value: 'claude-opus-4-6' },
        { name: 'Haiku 4.5',  value: 'claude-haiku-4-5-20251001' },
      ]
    })
  }

  const body = selected.map((m, i) =>
    `### Memory ${i + 1}: ${m.name} (${m.type}, project: ${m.project})\n\n${m.body}`
  ).join('\n\n---\n\n')

  // Spinner while waiting for first output
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let frame = 0
  const spinner = setInterval(() => {
    process.stdout.write(`\r\x1B[2m${frames[frame++ % frames.length]} Formatting ${selected.length} memories with ${model}...\x1B[0m`)
  }, 80)

  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn('claude', [
        '-p', '--no-session-persistence',
        '--model', model,
      ], { stdio: ['pipe', 'pipe', 'pipe'] })

      let output = ''
      let started = false

      child.stdout.on('data', chunk => {
        if (!started) {
          clearInterval(spinner)
          process.stdout.write('\r\x1B[2K\n')
          started = true
        }
        const text = chunk.toString()
        output += text
        process.stdout.write(text)
      })

      let stderr = ''
      child.stderr.on('data', chunk => { stderr += chunk.toString() })

      child.on('close', code => {
        if (code !== 0) reject(new Error(stderr || `claude exited with code ${code}`))
        else resolve(output)
      })

      child.on('error', reject)
      child.stdin.write(PROMPT + body)
      child.stdin.end()
    })

    if (exportPath) {
      const resolved = path.resolve(exportPath)
      fs.writeFileSync(resolved, result)
      console.log(`\nExported to ${resolved}`)
    } else {
      try {
        execSync('pbcopy', { input: result })
        console.log('\n\n✓ Copied to clipboard.')
      } catch {
        // non-macOS, skip
      }
    }
  } catch (err) {
    clearInterval(spinner)
    process.stdout.write('\r\x1B[2K')
    console.error('Claude error:', err.message)
    process.exit(1)
  }
}

main().catch(err => {
  if (err.name === 'ExitPromptError') process.exit(0)
  console.error(err)
  process.exit(1)
})
