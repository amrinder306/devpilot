import React, { useEffect, useState } from 'react'

export default function Dashboard(){
  const [ent, setEnt] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const api = (window as any).devpilot
    if (!api?.entitlements) {
      setErr('Preload not available. Restart the app after build completes.')
      return
    }
    api.entitlements()
      .then(setEnt)
      .catch((e: any) => setErr(String(e?.message || e)))
  }, [])

  return (
    <div>
      <h1>Dashboard</h1>
      {err && <div style={{color:'#b91c1c', marginBottom:12}}>⚠️ {err}</div>}
      <p>License plan: <b>{ent?.plan ?? '...'}</b></p>
      <pre style={{ background:'#f8fafc', padding:12, borderRadius:8 }}>{JSON.stringify(ent, null, 2)}</pre>
    </div>
  )
}
