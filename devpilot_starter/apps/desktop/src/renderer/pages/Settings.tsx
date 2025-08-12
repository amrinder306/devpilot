import React, { useEffect, useState } from 'react'

type Endpoint = { id: string; name: string; adapter: 'openai'|'ollama'; base_url: string; default_model?: string; }

export default function Settings(){
  const [cfg, setCfg] = useState<any>({ coreApi:'http://localhost:8000', endpoints: [] as Endpoint[] })
  const [ep, setEp] = useState<Endpoint>({ id:'', name:'', adapter:'openai', base_url:'' })
  const [apiKey, setApiKey] = useState<string>('')

  useEffect(() => {
    window.devpilot.getConfig().then(c => setCfg({ coreApi: c.coreApi ?? 'http://localhost:8000', endpoints: c.endpoints ?? [] }))
  }, [])

  const add = async () => {
    if(!ep.id) ep.id = ep.name.toLowerCase().replace(/\s+/g,'-')
    const next = { ...cfg, endpoints: [...cfg.endpoints, ep] }
    setCfg(next)
    await window.devpilot.saveConfig(next)
    if (apiKey) await window.devpilot.setEndpointSecret(ep.id, apiKey)
    setEp({ id:'', name:'', adapter:'openai', base_url:'' })
    setApiKey('')
  }

  return (
    <div>
      <h1>Settings</h1>
      <h3>Core API</h3>
      <input value={cfg.coreApi} onChange={e=>setCfg({...cfg, coreApi:e.target.value})} style={{width:400, padding:8, border:'1px solid #ddd'}}/>
      <button onClick={()=>window.devpilot.saveConfig(cfg)} style={{marginLeft:8}}>Save</button>

      <h3 style={{marginTop:24}}>BYO-LLM Endpoints</h3>
      <div style={{display:'grid', gap:8, maxWidth:600}}>
        <input placeholder="Name" value={ep.name} onChange={e=>setEp({...ep, name:e.target.value})}/>
        <select value={ep.adapter} onChange={e=>setEp({...ep, adapter:e.target.value as any})}>
          <option value="openai">OpenAI-compatible</option>
          <option value="ollama">Ollama</option>
        </select>
        <input placeholder="Base URL" value={ep.base_url} onChange={e=>setEp({...ep, base_url:e.target.value})}/>
        <input placeholder="API Key (stored in keychain)" value={apiKey} onChange={e=>setApiKey(e.target.value)}/>
        <input placeholder="Default Model (optional)" value={ep.default_model ?? ''} onChange={e=>setEp({...ep, default_model:e.target.value})}/>
        <button onClick={add}>Add Endpoint</button>
      </div>

      <pre style={{ background:'#f8fafc', padding:12, borderRadius:8, marginTop:16 }}>{JSON.stringify(cfg, null, 2)}</pre>
    </div>
  )
}
