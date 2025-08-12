import { loadConfig } from '../config.js'
import { getEndpointSecret } from '../secureStore.js'
import { redactSlices } from '../redaction.js'
import { logEvent } from '../metrics.js'
import { chat as openaiChat } from './adapters/openai.js'
import { generate as ollamaGen } from './adapters/ollama.js'

export async function runTask({ task, endpointId, model, slices = [], promptMeta = {} }:
  { task:'plan'|'codegen'|'doc'|'debug'|'test_fix', endpointId?:string, model?:string, slices?:Array<{path:string, content:string}>, promptMeta?:any }){

  const cfg = loadConfig()
  const eps = (cfg.endpoints || []) as Array<any>
  let ep = endpointId ? eps.find(e => e.id === endpointId) : eps[0]
  if (!ep) throw new Error('No LLM endpoint configured')

  // redact
  const { slices: safeSlices, hits } = redactSlices(slices)

  const prompt = buildPrompt(task, promptMeta, safeSlices)
  const t0 = Date.now()
  let result:any = {}
  if (ep.adapter === 'openai') {
    const apiKey = await getEndpointSecret(ep.id) || ''
    const r = await openaiChat({ baseUrl: ep.base_url, apiKey, model: model || ep.default_model || 'gpt-3.5-turbo', messages: [
      { role: 'system', content: 'You are DevPilot. Return concise, actionable outputs.' },
      { role: 'user', content: prompt }
    ]})
    result = { text: r.text, tokens_in: r.tokens_in, tokens_out: r.tokens_out }
  } else if (ep.adapter === 'ollama') {
    const r = await ollamaGen({ baseUrl: ep.base_url, model: model || ep.default_model || 'qwen2.5-coder:7b', prompt })
    result = { text: r.text, tokens_in: r.tokens_in, tokens_out: r.tokens_out }
  } else {
    throw new Error('Unsupported adapter: ' + ep.adapter)
  }

  result.latency_ms = Date.now() - t0
  result.model_id = model || ep.default_model || ep.adapter
  result.redaction_hits = hits
  await logLlm(task, result.model_id, result.tokens_in||0, result.tokens_out||0, result.latency_ms||0)
  return result
}

function buildPrompt(task:string, meta:any, slices:Array<{path:string, content:string}>){
  const head = `Task: ${task}\nRules: Return clear, minimal output. If code edits, specify file and patch.\n`
  const ctx = slices.slice(0, 5).map(s => `# ${s.path}\n${s.content}`).join('\n\n')
  const body = meta?.instruction ? `Instruction:\n${meta.instruction}\n` : ''
  return head + body + (ctx ? `\nContext:\n${ctx}` : '')
}


async function logLlm(task:string, model_id:string, tokens_in:number, tokens_out:number, latency_ms:number){
  try{
    await logEvent({
      ts: new Date().toISOString(),
      user_id: 'local',
      repo_id: '',
      project: '',
      job_id: '',
      source: 'llm',
      task,
      endpoint: model_id,
      model: model_id,
      tokens_in, tokens_out,
      latency_ms,
      iterations: 1,
      files_changed: 0,
      loc_delta: 0,
      tests_passed: 0,
      tests_failed: 0,
      coverage: null,
      result: 'ok',
      extra: null
    })
  }catch{}
}
