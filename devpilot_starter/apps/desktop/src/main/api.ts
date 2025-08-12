import axios from 'axios'
import { loadConfig } from './config.js'

export async function registerClient(fingerprint: string, version: string) {
  const cfg = loadConfig()
  const base = cfg.coreApi || 'http://localhost:8000'
  const res = await axios.post(base + '/client/register', { fingerprint, version })
  return res.data
}

export async function entitlements() {
  const cfg = loadConfig()
  const base = cfg.coreApi || 'http://localhost:8000'
  const res = await axios.get(base + '/entitlements')
  return res.data
}
