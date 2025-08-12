import React, { useState } from 'react'

export default function Reports(){
  const [fromISO, setFromISO] = useState(new Date(Date.now() - 7*24*3600*1000).toISOString())
  const [toISO, setToISO] = useState(new Date().toISOString())
  const [rows, setRows] = useState<any[]>([])

  const run = async () => {
    const r = await window.devpilot.tokensByProject(fromISO, toISO)
    setRows(r)
  }

  const exportCsv = () => {
    const lines = ['Project,Tokens', ...rows.map(r => `${JSON.stringify(r.project)},${r.tokens}`)]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'tokens_by_project.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <h1>Reports</h1>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <label>From</label><input value={fromISO} onChange={e=>setFromISO(e.target.value)} style={{width:280}} />
        <label>To</label><input value={toISO} onChange={e=>setToISO(e.target.value)} style={{width:280}} />
        <button onClick={run}>Run</button>
        <button disabled={!rows.length} onClick={exportCsv}>Export CSV</button>
      </div>
      <table style={{marginTop:12, borderCollapse:'collapse'}}>
        <thead><tr><th style={{borderBottom:'1px solid #ddd', padding:8}}>Project</th><th style={{borderBottom:'1px solid #ddd', padding:8}}>Tokens</th></tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td style={{borderBottom:'1px solid #f0f0f0', padding:8}}>{r.project}</td>
              <td style={{borderBottom:'1px solid #f0f0f0', padding:8}}>{r.tokens}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
