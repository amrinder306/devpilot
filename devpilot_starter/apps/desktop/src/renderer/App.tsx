import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Repos from './pages/Repos'
import PatchReview from './pages/PatchReview'
import Reports from './pages/Reports'
import Integrations from './pages/Integrations'
import Workbench from './pages/Workbench'
import FirstRun from './pages/FirstRun'

function Shell(){
  const [ready, setReady] = useState(false)
  const [hasToken, setHasToken] = useState<boolean>(false)
  const nav = useNavigate()
  const loc = useLocation()

  useEffect(() => {
    (async () => {
      try {
        const r = await window.devpilot.hasDeviceToken()
        setHasToken(!!r)
      } finally {
        setReady(true)
      }
    })()
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!hasToken && loc.pathname !== '/first-run') {
      nav('/first-run', { replace: true })
    }
    if (hasToken && loc.pathname === '/first-run') {
      nav('/', { replace: true })
    }
  }, [ready, hasToken, loc.pathname])

  if (!ready) return <div style={{padding:24}}>Loading…</div>

  if (!hasToken) {
    return (
      <Routes>
        <Route path="/first-run" element={<FirstRun/>} />
        <Route path="*" element={<FirstRun/>} />
      </Routes>
    )
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns: '240px 1fr', height:'100vh', fontFamily:'ui-sans-serif, system-ui' }}>
      <aside style={{ padding:16, borderRight:'1px solid #e5e7eb' }}>
        <h2 style={{ marginBottom:16 }}>DevPilot</h2>
        <nav style={{ display:'grid', gap:8 }}>
          <Link to="/">Dashboard</Link>
          <Link to="/repos">Repos</Link>
          <Link to="/patch">Patch Review</Link>
          <Link to="/reports">Reports</Link>
          <Link to="/workbench">Workbench</Link>
          <Link to="/integrations">Integrations</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </aside>
      <main style={{ padding:24, overflow:'auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard/>} />
          <Route path="/repos" element={<Repos/>} />
          <Route path="/patch" element={<PatchReview/>} />
          <Route path="/reports" element={<Reports/>} />
          <Route path="/integrations" element={<Integrations/>} />
          <Route path="/settings" element={<Settings/>} />\n          <Route path="/workbench" element={<Workbench/>} />
          <Route path="/first-run" element={<FirstRun/>} />
        </Routes>
      </main>
    </div>
  )
}

export default function App(){
  return (
    <BrowserRouter>
      <Shell/>
    </BrowserRouter>
  )
}
