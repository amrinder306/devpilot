import fs from 'node:fs'
import path from 'node:path'

export function backupPath(repoRoot:string, relPath:string){
  const p = path.join(repoRoot, relPath)
  return p + '.bak.devpilot'
}

export function applyFile(repoRoot:string, relPath:string, content:string){
  const abs = path.join(repoRoot, relPath)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  if (fs.existsSync(abs)) {
    fs.copyFileSync(abs, backupPath(repoRoot, relPath))
  }
  fs.writeFileSync(abs, content, 'utf-8')
  return { ok: true }
}

export function rollbackFile(repoRoot:string, relPath:string){
  const abs = path.join(repoRoot, relPath)
  const bak = backupPath(repoRoot, relPath)
  if (fs.existsSync(bak)) {
    fs.copyFileSync(bak, abs)
    fs.unlinkSync(bak)
    return { ok: true, restored: true }
  }
  return { ok: false, restored: false }
}
