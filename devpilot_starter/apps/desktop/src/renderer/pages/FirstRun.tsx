import React, { useEffect, useState } from 'react'

export default function FirstRun(){
  const [coreApi, setCoreApi] = useState('http://localhost:8000')
  const [finger, setFinger] = useState('')
  const [version, setVersion] = useState('0.1.0')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<any>(null)

  useEffect(() => {
    window.devpilot.getConfig().then(c => setCoreApi(c.coreApi ?? 'http://localhost:8000'))
  }, [])

  const register = async () => {
    try {
      setBusy(true); setErr(null)
      await window.devpilot.saveConfig({ coreApi })
      const f = finger || Math.random().toString(36).slice(2)
      const res = await window.devpilot.register(f, version)
      setOk(res)
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1>Welcome to DevPilot</h1>
      <p>Enter your Core API / DPS URL to register this device.</p>
      <div style={{display:'grid', gap:8, maxWidth:520}}>
        <label>Core API URL</label>
        <input value={coreApi} onChange={e=>setCoreApi(e.target.value)} placeholder="https://core.example.com" />
        <label>Fingerprint (optional)</label>
        <input value={finger} onChange={e=>setFinger(e.target.value)} placeholder="auto-generated if blank" />
        <label>App Version</label>
        <input value={version} onChange={e=>setVersion(e.target.value)} />
        <button disabled={busy} onClick={register}>{busy?'Registering…':'Register'}</button>
        {err && <div style={{color:'#b91c1c'}}>⚠️ {err}</div>}
        {ok && (
        <div style={{color:'#065f46'}}>
          ✅ Registered. Restart the app. <button onClick={()=>window.location.reload()}>Continue</button>
        </div>
      )}

      </div>
    </div>
  )
}
