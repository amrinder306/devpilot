export async function chatOllama(baseUrl: string, model: string, prompt: string) {
  const res = await fetch(baseUrl.replace(/\/$/,'') + '/api/generate', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ model, prompt, stream: false })
  })
  if(!res.ok) throw new Error('Ollama endpoint error')
  const json = await res.json()
  return json
}
