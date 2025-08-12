import React, { useState, useEffect } from 'react'

export default function Workbench(){
  const [repoRoot, setRepoRoot] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState<string>('idle')

  useEffect(() => {
    if (!jobId) return
    const on = (ev:string) => (data:any) => {
      if (ev === 'log') setLogs(prev => [...prev, data.line])
      if (ev === 'start') setStatus('running')
      if (ev === 'end') setStatus(data.ok ? 'passed' : 'failed')
    }
    window.devpilot.onValidationEvent(jobId, 'start', on('start'))
    window.devpilot.onValidationEvent(jobId, 'log', on('log'))
    window.devpilot.onValidationEvent(jobId, 'end', on('end'))
  }, [jobId])

  const go = async () => {
    const { jobId } = await window.devpilot.validationStart(repoRoot)
    setJobId(jobId)
    setLogs([])
    setStatus('running')
  }
  const stop = async () => {
    if (jobId) await window.devpilot.validationStop(jobId)
  }

  return (
    <div>
      <h1>Workbench — Validation</h1>
      <input placeholder="Repo root" value={repoRoot} onChange={e=>setRepoRoot(e.target.value)} style={{width:480}}/>
      <button onClick={go}>Run</button>
      <button onClick={stop} disabled={!jobId}>Stop</button>
      <div style={{marginTop:12}}>Status: <b>{status}</b></div>
      <pre style={{whiteSpace:'pre-wrap', background:'#f8fafc', padding:12, borderRadius:8, height:300, overflow:'auto'}}>{logs.join('\n')}</pre>
    </div>
  )
}
