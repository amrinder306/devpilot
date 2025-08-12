import { logEvent } from './metrics.js'
import { spawn } from 'node:child_process'
import path from 'node:path'
import stripAnsi from 'strip-ansi'

type Step = { name:string, cmd:string, args:string[] }
const PROC = new Map<string, any>()

function detectPkgManager(repoRoot:string){
  // naive detection
  return 'npm'
}

function stepsForNode(repoRoot:string): Step[] {
  const pm = detectPkgManager(repoRoot)
  return [
    { name: 'lint', cmd: pm, args: ['run','lint'] },
    { name: 'test', cmd: pm, args: ['test','--','--watch=false'] },
    { name: 'build', cmd: pm, args: ['run','build'] }
  ]
}

export function startValidation(jobId:string, repoRoot:string, webSend: (channel:string, ...args:any[])=>void){
  const steps = stepsForNode(repoRoot)
  runSteps(jobId, repoRoot, steps, webSend)
}

export function stopValidation(jobId:string){
  const p = PROC.get(jobId)
  if (p) {
    p.kill('SIGTERM')
    PROC.delete(jobId)
  }
}

function runSteps(jobId:string, repoRoot:string, steps:Step[], webSend: (channel:string, ...args:any[])=>void){
  const chan = (ev:string) => `validation:event:${jobId}:${ev}`
  ;(async () => {
    webSend(chan('start'), { jobId })
    for (const s of steps) {
      webSend(chan('step_start'), { step: s.name })
      const ok = await runOne(repoRoot, s, (line) => webSend(chan('log'), { step: s.name, line }))
      webSend(chan('step_end'), { step: s.name, ok })
      if (!ok) { webSend(chan('end'), { ok: false }); try { await logEvent({ ts:new Date().toISOString(), user_id:'local', repo_id:repoRoot, project:'', job_id:jobId, source:'validation', task:s.name, endpoint:'', model:'', tokens_in:0, tokens_out:0, latency_ms:0, iterations:0, files_changed:0, loc_delta:0, tests_passed:0, tests_failed:1, coverage:null, result:'fail', extra:null }) } catch {}; return }
    }
    webSend(chan('end'), { ok: true })
    try { await logEvent({ ts:new Date().toISOString(), user_id:'local', repo_id:repoRoot, project:'', job_id:jobId, source:'validation', task:'pipeline', endpoint:'', model:'', tokens_in:0, tokens_out:0, latency_ms:0, iterations:0, files_changed:0, loc_delta:0, tests_passed:0, tests_failed:0, coverage:null, result:'pass', extra:null }) } catch {}
  })().catch(err => {
    webSend(chan('error'), { message: String(err?.message || err) })
    webSend(chan('end'), { ok: false })
  })
}

function runOne(cwd:string, s:Step, onLine:(l:string)=>void): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(s.cmd, s.args, { cwd, shell: process.platform === 'win32' })
    let ok = true
    PROC.set(`${cwd}:${s.name}`, child)
    child.stdout.on('data', (b) => onLine(stripAnsi(String(b))))
    child.stderr.on('data', (b) => onLine(stripAnsi(String(b))))
    child.on('close', (code) => {
      PROC.delete(`${cwd}:${s.name}`)
      ok = code === 0
      resolve(ok)
    })
  })
}
