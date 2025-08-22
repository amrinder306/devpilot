import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  FolderGit2,
  GitPullRequest,
  Bot,
  Settings,
  BarChart3,
  Play,
  BookOpenText,
  PanelRight,
  Search,
  Save,
  Moon,
  Sun,
  Laptop,
} from "lucide-react";
import Editor, { loader } from "@monaco-editor/react";
import { devpilot } from "../lib/devpilot";
import { diffLines } from "diff";
import * as monaco from 'monaco-editor';
loader.config({ monaco });
// at top with other imports (if not already)
/**
 * Final DevPilot layout with theme switching and Tailwind utility classes.
 * (Matches the design we agreed on.)
 */
loader.init().then(m=> console.log("here is the monaco insatance", m));
type Theme = "light" | "dark" | "system";
const THEME_KEY = "devpilot.theme";

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", t);
  }
}

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) || "system");
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  }, [theme]);
  return [theme, setTheme];
}

function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const Btn = ({
    t,
    title,
    children,
  }: {
    t: Theme;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      title={`Theme: ${title}`}
      className={`px-2 py-1 rounded-md text-xs border hover:bg-accent/50 transition ${
        theme === t ? "bg-accent/20 border-accent" : "border-border"
      }`}
      onClick={() => setTheme(t)}
    >
      {children}
    </button>
  );
  return (
    <div className="flex items-center gap-2">
      <Btn t="light" title="Light"><Sun className="h-4 w-4" /></Btn>
      <Btn t="dark" title="Dark"><Moon className="h-4 w-4" /></Btn>
      <Btn t="system" title="System"><Laptop className="h-4 w-4" /></Btn>
    </div>
  );
}

function Titlebar({ onToggleAIPanel }: { onToggleAIPanel: () => void }) {
  return (
    <div className="h-10 border-b bg-elev flex items-center justify-between px-3 select-none">
      <div className="text-xs font-medium opacity-80">DevPilot — AI Development Assistant</div>
      <div className="flex items-center gap-2">
        <button onClick={onToggleAIPanel} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border hover:bg-accent/40">
          <PanelRight className="h-3.5 w-3.5" /> Panel
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "repos", label: "Repos", icon: FolderGit2 },
  { id: "workbench", label: "Workbench", icon: Play },
  { id: "patch", label: "Patch Review", icon: GitPullRequest },
  { id: "llm", label: "LLM Test", icon: Bot },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "docs", label: "Docs", icon: BookOpenText },
  { id: "settings", label: "Settings", icon: Settings },
] as const;


function Sidebar({ page, setPage }: { page: NavKey; setPage: (p: NavKey) => void }) {
  return (
    <aside className="w-64 border-r bg-subtle h-full flex flex-col">
      <div className="h-10 border-b bg-elev flex items-center px-3 text-xs uppercase tracking-wide opacity-70">
        Navigation
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPage(id as NavKey)}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm border transition ${
              page === id
                ? "bg-accent/20 border-accent text-foreground"
                : "border-transparent hover:bg-accent/10 text-foreground/80"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="p-2 text-[11px] opacity-60">v0.1.0</div>
    </aside>
  );
}

function TopNav() {
  return (
    <div className="h-10 border-b bg-elev flex items-center justify-between px-3">
      <div className="text-xs opacity-70">src / components / App.tsx</div>
      <div className="flex items-center gap-2">
        <button className="px-2 py-1 text-xs rounded-md border hover:bg-accent/40">Format</button>
        <button className="px-2 py-1 text-xs rounded-md border hover:bg-accent/40">Run Tests</button>
        <button className="px-2 py-1 text-xs rounded-md border hover:bg-accent/40">Build</button>
      </div>
    </div>
  );
}

function CodeEditorMock(){
  const [code, setCode] = React.useState(`// Monaco is live
function hello(){
  return 'world'
}`)
  return (
    <div className="h-full">
      <Editor
        height="100%"
        defaultLanguage="typescript"
        value={code}
        onChange={(v)=>setCode(v||'')}
        options={{ fontSize: 13, minimap: { enabled: false }, theme: (document.documentElement.getAttribute('data-theme')==='light'?'vs':'vs-dark') as any }}
      />
    </div>
  )
}

function DiffPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.25 }}
          className="w-[44%] border-l bg-subtle h-full absolute right-0 top-0 flex flex-col"
        >
          <div className="h-10 border-b bg-elev flex items-center justify-between px-3">
            <div className="text-xs font-medium">AI Suggested Changes</div>
            <button onClick={onClose} className="text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
          <div className="flex-1 overflow-auto font-mono text-[12px] leading-6 p-4">
            <div className="mb-2">- remove old header</div>
            <div className="mb-2">+ add ErrorBoundary</div>
            <div className="mb-2">+ add unit test skeleton</div>
          </div>
          <div className="border-t bg-elev h-12 flex items-center justify-end gap-2 px-3">
            <button className="px-2 py-1 text-xs rounded-md border hover:bg-accent/40">Apply</button>
            <button className="px-2 py-1 text-xs rounded-md border hover:bg-accent/40">Discard</button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// put this near your other imports if not already present

// Optional: a tiny helper to safely pull text out of different LLM adapters
const getLLMText = (r: any) =>
  r?.text ??
  r?.choices?.[0]?.message?.content ??
  r?.message ??
  (typeof r === "string" ? r : JSON.stringify(r))

type ChatMsg = { id: string; role: "user" | "ai"; text: string; meta?: { model?: string } }

function AIPanel({ open }: { open: boolean }) {
  const [chat, setChat] = React.useState<ChatMsg[]>([])
  const [input, setInput] = React.useState("Summarize this repository.")
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  // auto-scroll to bottom on new messages
  React.useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat, busy])

  const send = async () => {
    const q = input.trim()
    if (!q || busy) return
    setErr(null)
    setBusy(true)

    const uid = crypto.randomUUID()
    setChat((c) => [...c, { id: uid, role: "user", text: q }])
    setInput("")

    try {
      // minimal request: use 'plan' task; you can switch based on UI later
      const res = await window.devpilot.llmRun({
        task: "plan",
        slices: [], // add repo slices later for context
        promptMeta: { instruction: q },
      })
      const text = getLLMText(res) || "(no text)"
      const model = res?.model_id || res?.model || res?.endpoint || undefined
      setChat((c) => [...c, { id: crypto.randomUUID(), role: "ai", text, meta: { model } }])
    } catch (e: any) {
      setErr(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  // Enter to send, Shift+Enter newline
  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          exit={{ x: 320 }}
          transition={{ type: "tween", duration: 0.25 }}
          className="w-96 border-l bg-subtle h-full flex flex-col"
        >
          <div className="h-10 border-b bg-elev flex items-center justify-between px-3">
            <div className="text-xs font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4" /> AI Assistant
            </div>
            {/* green dot = panel ready (you could toggle on endpoint health) */}
            <div className="w-2 h-2 rounded-full bg-green-500/80" />
          </div>

          {/* transcript */}
          <div ref={listRef} className="flex-1 overflow-auto p-3 space-y-2">
            {chat.map((m) => (
              <div
                key={m.id}
                className={
                  "rounded-lg p-2 text-xs " +
                  (m.role === "ai" ? "bg-elev" : "bg-accent/10 border border-accent ml-8")
                }
              >
                <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                {m.meta?.model && (
                  <div className="mt-1 opacity-60 text-[10px]">model: {m.meta.model}</div>
                )}
              </div>
            ))}
            {!chat.length && (
              <div className="rounded-lg bg-elev p-2 text-xs opacity-70">
                Ask a question about your codebase. Tip: “Plan test coverage for the {`<repo>`} module.”
              </div>
            )}
          </div>

          {/* input */}
          <div className="h-14 border-t bg-elev p-2 flex items-center gap-2">
            <input
              className="flex-1 text-sm px-3 py-2 rounded-md bg-subtle border outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="Ask anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
            />
            <button
              onClick={send}
              disabled={busy}
              className="px-3 py-2 text-xs rounded-md border hover:bg-accent/40 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </div>

          {/* error bar */}
          {err && (
            <div className="border-t bg-elev px-3 py-2 text-[11px] text-red-400">⚠ {err}</div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function AIPanelInput({ onAdd }: { onAdd: (u:{role:'user',text:string}, a:{role:'ai',text:string}) => void }){
  const [input, setInput] = React.useState('Summarize this repository.')
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  const send = async () => {
    try {
      setBusy(true); setErr(null)
      const r = await devpilot.llmRun({ task:'plan', slices: [], promptMeta: { instruction: input } })
      onAdd({role:'user', text: input}, {role:'ai', text: r?.text || '(no text)'} )
    } catch (e:any) {
      setErr(String(e?.message || e))
    } finally { setBusy(false) }
  }

  return (
    <div className="w-full flex items-center gap-2">
      <input className="flex-1 text-sm px-3 py-2 rounded-md bg-subtle border outline-none focus:ring-2 focus:ring-accent/40"
             placeholder="Ask anything…" value={input} onChange={e=>setInput(e.target.value)} />
      <button onClick={send} disabled={busy} className="px-3 py-2 text-xs rounded-md border hover:bg-accent/40">{busy?'Sending…':'Send'}</button>
      {err && <div className="text-xs text-red-400 ml-2">⚠ {err}</div>}
    </div>
  )
}

function QuickFAB() {
  return (
    <div className="fixed bottom-20 right-6 flex flex-col gap-2">
      <button className="w-12 h-12 rounded-full bg-accent text-background shadow hover:scale-105 transition grid place-items-center">
        <Play className="h-5 w-5" />
      </button>
      <button className="w-12 h-12 rounded-full bg-accent/90 text-background shadow hover:scale-105 transition grid place-items-center">
        <Save className="h-5 w-5" />
      </button>
      <button className="w-12 h-12 rounded-full bg-accent/80 text-background shadow hover:scale-105 transition grid place-items-center">
        <Search className="h-5 w-5" />
      </button>
    </div>
  );
}

// Page placeholders
function PageDashboard(){ return <div className="p-4">Dashboard</div> }
function PageRepos(){ return <div className="p-4">Repos</div> }
function PageWorkbench(){
  const [repoRoot, setRepoRoot] = React.useState('')
  const [jobId, setJobId] = React.useState<string | null>(null)
  const [logs, setLogs] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<'idle'|'running'|'passed'|'failed'>('idle')

  const browse = async () => {
    const p = await devpilot.pickFolder()
    if (p) setRepoRoot(p)
  }
  React.useEffect(()=>{
    if (!jobId) return
    const onStart = () => setStatus('running')
    const onLog = (d:any) => setLogs(prev => [...prev, d.line])
    const onEnd = (d:any) => setStatus(d.ok ? 'passed' : 'failed')
    const off1 = window.devpilot.onValidationEvent(jobId, 'start', onStart)
    const off2 = window.devpilot.onValidationEvent(jobId, 'log', onLog)
    const off3 = window.devpilot.onValidationEvent(jobId, 'end', onEnd)
    return () => { off1?.(); off2?.(); off3?.(); }
  }, [jobId])

  const run = async () => {
    setLogs([]); setStatus('running')
    const r = await window.devpilot.validationStart(repoRoot)
    setJobId(r.jobId)
  }
  const stop = async () => { if (jobId) await window.devpilot.validationStop(jobId) }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Workbench</h2>
      <div className="rounded-xl border bg-subtle p-4 space-y-2">
        <div className="flex items-center gap-2">
          <input className="flex-1 px-3 py-2 rounded-md bg-elev border" placeholder="/path/to/repo" value={repoRoot} onChange={e=>setRepoRoot(e.target.value)} />
          <button onClick={browse} className="px-3 py-2 text-xs rounded-md border hover:bg-accent/40">Browse…</button>
          <button onClick={run} className="px-3 py-2 text-xs rounded-md border hover:bg-accent/40">Run</button>
          <button onClick={stop} className="px-3 py-2 text-xs rounded-md border hover:bg-accent/40" disabled={!jobId}>Stop</button>
          <div className="text-xs opacity-70">Status: {status}</div>
        </div>
        <pre className="mt-2 h-64 rounded-md bg-elev border p-2 font-mono text-xs overflow-auto">{logs.join('\\n')}</pre>
      </div>
    </div>
  )
}


function PagePatch(){
  const [repoRoot, setRepoRoot] = React.useState('')
  const [path, setPath] = React.useState('src/example.ts')
  const [original, setOriginal] = React.useState('')
  const [modified, setModified] = React.useState('')
  const [selected, setSelected] = React.useState<Record<number, boolean>>({})

  const load = async () => {
    const r = await window.devpilot.readFile(repoRoot, path)
    setOriginal(r?.content || '')
  }

  const hunks = React.useMemo(() => diffLines(original, modified), [original, modified])

  const applySelected = async () => {
    let out = ''
    hunks.forEach((h, i) => {
      if (h.added) out += (selected[i] ? h.value : '')
      else if (h.removed) out += (selected[i] ? '' : h.value)
      else out += h.value
    })
    await window.devpilot.applyWithBackup(repoRoot, path, out)
    alert('Applied with backup.')
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Patch Review</h2>
      <div className="flex gap-2">
        <input className="flex-1 px-3 py-2 rounded-md bg-elev border" placeholder="/repo/root" value={repoRoot} onChange={e=>setRepoRoot(e.target.value)} />
        <input className="flex-1 px-3 py-2 rounded-md bg-elev border" placeholder="relative/path.ts" value={path} onChange={e=>setPath(e.target.value)} />
        <button onClick={load} className="px-3 py-2 text-xs rounded-md border hover:bg-accent/40">Load Original</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <textarea className="rounded-md bg-elev border p-2 font-mono text-xs h-72" placeholder="Original" value={original} onChange={e=>setOriginal(e.target.value)} />
        <textarea className="rounded-md bg-elev border p-2 font-mono text-xs h-72" placeholder="Modified" value={modified} onChange={e=>setModified(e.target.value)} />
      </div>
      <div className="mt-2">
        <div className="text-xs opacity-70 mb-1">Hunks</div>
        <ul className="space-y-1">
          {hunks.map((h,i)=>(
            <li key={i}>
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={!!selected[i]} onChange={()=>setSelected(s=>({...s, [i]: !s[i]}))} />
                {h.added?'ADD':h.removed?'DEL':'EQ'} — {String(h.count || 0)} lines
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2">
        <button onClick={applySelected} className="px-3 py-2 text-xs rounded-md border hover:bg-accent/40">Apply Selected</button>
        <button onClick={()=>window.devpilot.rollbackFile(repoRoot, path)} className="px-3 py-2 text-xs rounded-md border hover:bg-accent/40">Rollback</button>
      </div>
    </div>
  )
}

function PageLLM(){ return <div className="p-4">LLM Test</div> }
function PageReports(){ return <div className="p-4">Reports</div> }
function PageSettings(){
  const [core, setCore] = React.useState('')
  React.useEffect(()=>{ devpilot.getConfig().then(c => setCore(c?.coreApi || '')) },[])
  const save = async () => { await devpilot.saveConfig({ coreApi: core }); alert('Saved') }
  const reset = async () => { await window.devpilot.resetDeviceToken(); alert('Device token removed. Restart to see First-Run.'); }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Settings</h2>
      <div className="rounded-xl border bg-subtle p-4 space-y-2">
        <div className="text-xs opacity-70">Core API</div>
        <div className="flex gap-2">
          <input className="flex-1 px-3 py-2 rounded-md bg-elev border" placeholder="https://core.example.com" value={core} onChange={e=>setCore(e.target.value)} />
          <button onClick={save} className="px-3 py-2 text-xs rounded-md border hover:bg-accent/40">Save</button>
        </div>
        <div className="mt-4 text-xs opacity-70">Developer</div>
        <button onClick={reset} className="px-3 py-2 text-xs rounded-md border hover:bg-accent/40">Reset Device Token (Dev)</button>
      </div>
    </div>
  )
}


export default function DevPilotLayout(){
  const [page, setPage] = useState<NavKey>("dashboard");
  const [aiOpen, setAiOpen] = useState(true);
  const [diffOpen, setDiffOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-app text-foreground">
      <StyleVariables />
      <div className="grid grid-rows-[40px_1fr] grid-cols-[256px_1fr_384px] h-full">
        <div className="col-span-3"><Titlebar onToggleAIPanel={() => setAiOpen(v=>!v)} /></div>
        <Sidebar page={page} setPage={setPage} />

        <div className="relative h-full flex flex-col border-r bg-base">
          <TopNav />
          <div className="flex-1 relative overflow-hidden">
            <div className={`absolute inset-0 ${diffOpen ? "right-[44%]" : "right-0"} transition-[right] duration-200 border-r bg-elev`}>
              <CodeEditorMock />
            </div>
            <button
              onClick={() => setDiffOpen(v=>!v)}
              className="absolute top-2 right-2 z-10 px-2 py-1 text-xs rounded-md border bg-subtle hover:bg-accent/40"
            >
              {diffOpen ? "Hide Diff" : "Show Diff"}
            </button>
            <DiffPanel open={diffOpen} onClose={() => setDiffOpen(false)} />
          </div>

          <div className="border-t bg-subtle">
            {page === "dashboard" && <PageDashboard />}
            {page === "repos" && <PageRepos />}
            {page === "workbench" && <PageWorkbench />}
            {page === "patch" && <PagePatch />}
            {page === "llm" && <PageLLM />}
            {page === "reports" && <PageReports />}
            {page === "settings" && <PageSettings />}
          </div>
        </div>

        <AIPanel open={aiOpen} />
      </div>
      <QuickFAB />
    </div>
  )
}

// CSS variables for themes
function StyleVariables(){
  return (
    <style>{`
      :root {
        --app: #0b0c0f;
        --base: #101218;
        --subtle: #12141b;
        --elev: #161922;
        --border: #272a35;
        --foreground: #e6e8ee;
        --accent: #4f8cff;
        --background: #0b0c0f;
      }
      :root[data-theme='light'] {
        --app: #f6f7fb;
        --base: #ffffff;
        --subtle: #f3f4f8;
        --elev: #ffffff;
        --border: #e7e9ef;
        --foreground: #0d1220;
        --accent: #3b82f6;
        --background: #ffffff;
      }
      @media (prefers-color-scheme: light) {
        :root:not([data-theme]) {
          --app: #f6f7fb;
          --base: #ffffff;
          --subtle: #f3f4f8;
          --elev: #ffffff;
          --border: #e7e9ef;
          --foreground: #0d1220;
          --accent: #3b82f6;
          --background: #ffffff;
        }
      }
      .bg-app { background: var(--app); }
      .bg-base { background: var(--base); }
      .bg-subtle { background: var(--subtle); }
      .bg-elev { background: var(--elev); }
      .text-foreground { color: var(--foreground); }
      .border { border-color: var(--border) !important; }
      .border-b { border-bottom-color: var(--border) !important; }
      .border-t { border-top-color: var(--border) !important; }
      .border-l { border-left-color: var(--border) !important; }
      .border-r { border-right-color: var(--border) !important; }
      .border-border { border-color: var(--border); }
      .bg-accent { background: var(--accent); }
      .text-background { color: var(--background); }
    `}</style>
  )
}

type NavKey = (typeof NAV)[number]["id"];
