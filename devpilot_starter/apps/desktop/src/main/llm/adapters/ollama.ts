import axios from 'axios'
export async function generate({ baseUrl, model, prompt }:{ baseUrl:string, model:string, prompt:string }){
  const res = await axios.post(baseUrl.replace(/\/$/,'') + '/api/generate', { model, prompt, stream: false })
  const text = res.data.response ?? res.data ?? ''
  return { text, raw: res.data, tokens_in: 0, tokens_out: 0 }
}
