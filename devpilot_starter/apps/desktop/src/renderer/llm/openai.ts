export async function chatOpenAI(baseUrl: string, apiKey: string, model: string, messages: Array<{role:string, content:string}>) {
  const res = await fetch(baseUrl.replace(/\/$/,'') + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ model, messages })
  })
  if(!res.ok) throw new Error('OpenAI endpoint error')
  const json = await res.json()
  return json
}
