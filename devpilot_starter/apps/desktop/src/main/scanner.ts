import fg from 'fast-glob'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export type FileEntry = { p: string, h: string, t: 'f'|'d' }
export type Snapshot = { root: string, tree: FileEntry[] }

export async function buildSnapshot(root: string): Promise<Snapshot> {
  const patterns = ['**/*']
  const ignore = ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/dist/**', '**/build/**']
  const files = await fg(patterns, { cwd: root, dot: false, ignore, onlyFiles: true })
  const tree: FileEntry[] = []
  for (const rel of files) {
    const p = path.join(root, rel)
    const buf = fs.readFileSync(p)
    const hash = crypto.createHash('sha1').update(buf).digest('hex')
    tree.push({ p: rel.replaceAll('\\','/'), h: hash, t: 'f' })
  }
  return { root, tree }
}
