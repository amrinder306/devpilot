import axios from 'axios'

export async function chat({ baseUrl, apiKey, model, messages }:{ baseUrl:string, apiKey:string, model:string, messages:Array<{role:string, content:string}> }){
  const res = await axios.post(baseUrl.replace(/\/$/,'') + '/v1/chat/completions', {
    model, messages, temperature: 0.2
  }, {
    headers: { 'Authorization': 'Bearer ' + apiKey }
  })
  const choice = res.data.choices?.[0]?.message?.content ?? ''
  const usage = res.data.usage ?? {}
  return { text: choice, raw: res.data, tokens_in: usage.prompt_tokens ?? 0, tokens_out: usage.completion_tokens ?? 0 }
}
