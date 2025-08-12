import React, { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'

type Props = { original: string, modified: string, language?: string, height?: number }
export default function MonacoDiff({ original, modified, language='typescript', height=500 }: Props){
  const ref = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null)

  useEffect(() => {
    if(!ref.current) return
    editorRef.current = monaco.editor.createDiffEditor(ref.current, { readOnly: false, automaticLayout: true })
    const orig = monaco.editor.createModel(original, language)
    const mod = monaco.editor.createModel(modified, language)
    editorRef.current.setModel({ original: orig, modified: mod })
    return () => {
      editorRef.current?.dispose()
      orig.dispose()
      mod.dispose()
    }
  }, [])

  useEffect(() => {
    const m = editorRef.current?.getModel()?.modified
    if (m) m.setValue(modified)
    const o = editorRef.current?.getModel()?.original
    if (o) o.setValue(original)
  }, [original, modified])

  return <div style={{ height }} ref={ref} />
}
