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

/**
 * Final DevPilot layout with theme switching and Tailwind utility classes.
 * (Matches the design we agreed on.)
 */

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

function CodeEditorMock() {
  return (
    <div className="font-mono text-[13px] leading-6 p-4 select-text whitespace-pre overflow-auto">
{`import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Welcome to DevPilot</h1>
      <p>AI-powered development assistant</p>
    </div>
  );
}

export default App;`}
    </div>
  );
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

function AIPanel({ open }: { open: boolean }) {
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
            <div className="w-2 h-2 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            <div className="rounded-lg bg-elev p-2 text-xs">
              I notice you're working on a React component. Want suggestions?
            </div>
            <div className="rounded-lg bg-accent/10 border border-accent text-xs p-2 ml-8">
              Yes, please review the TypeScript types.
            </div>
            <div className="rounded-lg bg-elev p-2 text-xs">
              Great! Consider adding an ErrorBoundary and prop validation.
            </div>
          </div>
          <div className="h-14 border-t bg-elev p-2 flex items-center gap-2">
            <input
              className="flex-1 text-sm px-3 py-2 rounded-md bg-subtle border outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="Ask anything…"
            />
            <button className="px-3 py-2 text-xs rounded-md border hover:bg-accent/40">Send</button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
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
function PageWorkbench(){ return <div className="p-4">Workbench</div> }
function PagePatch(){ return <div className="p-4">Patch Review</div> }
function PageLLM(){ return <div className="p-4">LLM Test</div> }
function PageReports(){ return <div className="p-4">Reports</div> }
function PageSettings(){ return <div className="p-4">Settings</div> }

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
