import path from 'node:path'
import { app } from 'electron'
import sqlite3 from 'sqlite3'
sqlite3.verbose()

const dbPath = path.join(app.getPath('userData'), 'metrics.db')
const db = new sqlite3.Database(dbPath)

const schema = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  user_id TEXT NOT NULL,
  repo_id TEXT NOT NULL,
  project TEXT,
  job_id TEXT,
  source TEXT,
  task TEXT,
  endpoint TEXT,
  model TEXT,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  iterations INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  loc_delta INTEGER DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,
  tests_failed INTEGER DEFAULT 0,
  coverage REAL,
  result TEXT,
  extra TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_repo ON events(repo_id);
`

db.serialize(() => {
  for (const stmt of schema.split(';')) {
    const s = stmt.trim()
    if (s) db.run(s + ';')
  }
})

export function logEvent(ev: any): Promise<number> {
  return new Promise((resolve, reject) => {
    const cols = Object.keys(ev)
    const placeholders = cols.map(_ => '?').join(',')
    const values = cols.map(k => ev[k])
    const sql = `INSERT INTO events (${cols.join(',')}) VALUES (${placeholders})`
    db.run(sql, values, function (this: sqlite3.RunResult, err: Error | null) {
      if (err) reject(err)
      else resolve(this.lastID)
    })
  })
}

export function tokensByProject(fromISO: string, toISO: string): Promise<Array<{project:string, tokens:number}>> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT COALESCE(project,'') as project, SUM(tokens_in + tokens_out) as tokens
       FROM events WHERE ts BETWEEN ? AND ? GROUP BY project ORDER BY tokens DESC`,
      [fromISO, toISO],
      (err, rows) => err ? reject(err) : resolve(rows as any)
    )
  })
}
