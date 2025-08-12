import React, { useState } from 'react'

export default function LLMTest(){
  const [task, setTask] = useState<'plan'|'codegen'|'doc'|'debug'|'test_fix'>('plan')
  const [instruction, setInstruction] = useState('Summarize this repository.')
  const [resp, setResp] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = async () => {
    try {
      setErr(null)
      const r = await window.devpilot.llmRun({ task, slices: [], promptMeta: { instruction } })
      setResp(r)
    } catch (e: any) {
      setErr(String(e?.message || e))
    }
  }

  return (
    <div>
      <h1>LLM Test</h1>
      <div style={{display:'grid', gap:8, maxWidth:720}}>
        <select value={task} onChange={e=>setTask(e.target.value as any)}>
          <option value="plan">plan</option>
          <option value="codegen">codegen</option>
          <option value="doc">doc</option>
          <option value="debug">debug</option>
          <option value="test_fix">test_fix</option>
        </select>
        <textarea rows={5} value={instruction} onChange={e=>setInstruction(e.target.value)} />
        <button onClick={run}>Run</button>
      </div>
      {err && <div style={{color:'#b91c1c', marginTop:8}}>⚠️ {err}</div>}
      {resp && <pre style={{marginTop:12, background:'#f8fafc', padding:12, borderRadius:8}}>{JSON.stringify(resp, null, 2)}</pre>}
    </div>
  )
}
