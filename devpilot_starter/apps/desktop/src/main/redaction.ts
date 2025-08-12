const SECRET_PATTERNS = [
  /BEGIN RSA PRIVATE KEY[\s\S]+END RSA PRIVATE KEY/g,
  /AKIA[0-9A-Z]{16}/g,                          // AWS Access Key ID
  /[\w-]{24}\.[\w-]{6}\.[\w-]{27}/g,       // JWT-ish
  /[A-Za-z0-9_]{32,}/g                          // high-entropy catch-all (simple)
]

export function redactSlices(slices: Array<{path:string, content:string}>){
  const redacted = [] as Array<{path:string, content:string}>
  const hits = [] as Array<{path:string, match:string}>
  for (const s of slices || []) {
    let c = s.content
    for (const re of SECRET_PATTERNS) {
      c = c.replace(re, (m) => {
        hits.push({ path: s.path, match: m.slice(0,8) + '…' })
        return '[REDACTED]'
      })
    }
    if (/\.env/i.test(s.path) || /cert|key|pem|pfx/i.test(s.path)) {
      hits.push({ path: s.path, match: 'blocked-file' })
      continue  // block entirely
    }
    redacted.push({ path: s.path, content: c })
  }
  return { slices: redacted, hits }
}
