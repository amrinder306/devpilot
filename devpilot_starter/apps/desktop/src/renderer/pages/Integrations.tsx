import React, { useState } from 'react'

export default function Integrations(){
  const [jiraKey, setJiraKey] = useState('')
  const [trelloKey, setTrelloKey] = useState('')
  const [teamsKey, setTeamsKey] = useState('')
  const [slackKey, setSlackKey] = useState('')

  const save = async (id: string, key: string) => {
    await window.devpilot.setEndpointSecret('integration:'+id, key)
    alert(id + ' token saved to keychain.')
  }

  return (
    <div>
      <h1>Integrations (stubs)</h1>
      <div style={{display:'grid', gap:12, maxWidth:520}}>
        <div>
          <b>Jira OAuth token</b>
          <input value={jiraKey} onChange={e=>setJiraKey(e.target.value)} placeholder="paste token" />
          <button onClick={()=>save('jira', jiraKey)}>Save</button>
        </div>
        <div>
          <b>Trello token</b>
          <input value={trelloKey} onChange={e=>setTrelloKey(e.target.value)} placeholder="paste token" />
          <button onClick={()=>save('trello', trelloKey)}>Save</button>
        </div>
        <div>
          <b>Microsoft Teams token</b>
          <input value={teamsKey} onChange={e=>setTeamsKey(e.target.value)} placeholder="paste token" />
          <button onClick={()=>save('teams', teamsKey)}>Save</button>
        </div>
        <div>
          <b>Slack token</b>
          <input value={slackKey} onChange={e=>setSlackKey(e.target.value)} placeholder="paste token" />
          <button onClick={()=>save('slack', slackKey)}>Save</button>
        </div>
      </div>
      <p style={{opacity:.7, marginTop:8}}>Proper OAuth/device-code flows will replace this stub; tokens are stored in OS keychain.</p>
    </div>
  )
}
