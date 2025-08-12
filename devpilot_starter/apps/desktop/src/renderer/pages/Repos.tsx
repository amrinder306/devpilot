import React, { useState } from 'react'

export default function Repos(){
  const [folder, setFolder] = useState<string>('')
  const [snapshot, setSnapshot] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  const pick = async () => {
    const p = await window.devpilot?.pickFolder?.()
    if (p) { setFolder(p) }
  }

  const openFolder = async () => {
    try {
      if (!folder) { setErr('Pick or type a folder first.'); return }
      const res = await window.devpilot.buildSnapshot(folder)
      setSnapshot(res)
      setErr(null)
    } catch (e: any) {
      setErr(String(e?.message || e))
    }
  }

  return (
    <div>
      <h1>Repos</h1>
      <p>Pick a repo folder:</p>
      <div style={{display:'flex', gap:8}}>
        <input placeholder="/path/to/repo" value={folder} onChange={e=>setFolder(e.target.value)} style={{width:480, padding:8, border:'1px solid #ddd'}}/>
        <button onClick={pick}>Browse…</button>
        <button onClick={openFolder}>Scan</button>
      </div>
      {err && <div style={{color:'#b91c1c', marginTop:8}}>⚠️ {err}</div>}
      {snapshot && (
        <div style={{marginTop:16}}>
          <p>Files: {snapshot.tree.length}</p>
          <pre style={{maxHeight:320, overflow:'auto', background:'#f8fafc', padding:12, borderRadius:8}}>{JSON.stringify(snapshot, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
