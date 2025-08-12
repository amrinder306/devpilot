import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

type Config = {
  coreApi?: string
  dpsUrl?: string
  endpoints?: any[]
}

const filePath = path.join(app.getPath('userData'), 'config.json')

export function loadConfig(): Config {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { coreApi: 'http://localhost:8000', endpoints: [] }
  }
}

export function saveConfig(cfg: Config) {
  fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2), 'utf-8')
  return cfg
}
