import React, { useMemo, useState } from 'react'
import { diffLines, createTwoFilesPatch, applyPatch } from 'diff'

export default function PatchReview(){
  const [repoRoot, setRepoRoot] = useState('')
  const [path, setPath] = useState('src/example.ts')
  const [original, setOriginal] = useState('// original\n')
  const [modified, setModified] = useState('// modified\n')
  const [selected, setSelected] = useState<Record<number, boolean>>({})

  const hunks = useMemo(() => diffLines(original, modified), [original, modified])

  const toggle = (i:number) => setSelected(s => ({...s, [i]: !s[i]}))

  const applySelected = async () => {
    // Build a synthetic "partial modified" keeping only selected hunks
    let partial = original
    // naive approach: start from original and apply hunks in order
    const unified = createTwoFilesPatch(path, path, original, modified)
    const selectedIndexes = Object.entries(selected).filter(([,v])=>v).map(([k])=>parseInt(k,10))
    if (!selectedIndexes.length){
      alert('Select at least one hunk.')
      return
    }
    // applyPatch doesn't support selecting hunks directly, so for now we apply full modified when any hunk selected.
    // (Next patch: generate minimal partial by reconstructing only selected blocks.)
    partial = modified
    await window.devpilot.applyWithBackup(repoRoot, path, partial)
    alert('Applied with backup. You can rollback.')
  }

  const rollback = async () => {
    await window.devpilot.rollbackFile(repoRoot, path)
    alert('Rollback attempted.')
  }

  return (
    <div>
      <h1>Patch Review</h1>
      <div style={{display:'grid', gap:8, maxWidth:800}}>
        <input placeholder="Repo root" value={repoRoot} onChange={e=>setRepoRoot(e.target.value)} />
        <input placeholder="Relative path" value={path} onChange={e=>setPath(e.target.value)} />
        <textarea placeholder="Original" value={original} onChange={e=>setOriginal(e.target.value)} />
        <textarea placeholder="Modified" value={modified} onChange={e=>setModified(e.target.value)} />
      </div>
      <div style={{margin:'12px 0'}}>
        <h3>Hunks</h3>
        <ul>
          {hunks.map((h,i)=>(
            <li key={i} style={{marginBottom:6}}>
              <label>
                <input type="checkbox" checked={!!selected[i]} onChange={()=>toggle(i)} /> {h.added?'ADD':h.removed?'DEL':'EQ'} — {String(h.count || 0)} lines
              </label>
            </li>
          ))}
        </ul>
      </div>
      <button onClick={applySelected}>Apply Selected</button>
      <button onClick={rollback} style={{marginLeft:8}}>Rollback</button>
    </div>
  )
}
