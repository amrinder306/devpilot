import keytar from 'keytar'
const SERVICE = 'DevPilot'

export async function saveToken(account: string, token: string) {
  await keytar.setPassword(SERVICE, account, token)
}
export async function getToken(account: string) {
  return keytar.getPassword(SERVICE, account)
}
export async function saveEndpointSecret(endpointId: string, key: string) {
  await keytar.setPassword(SERVICE, `llm:${endpointId}`, key)
}
export async function getEndpointSecret(endpointId: string) {
  return keytar.getPassword(SERVICE, `llm:${endpointId}`)
}
export async function deleteEndpointSecret(endpointId: string) {
  await keytar.deletePassword(SERVICE, `llm:${endpointId}`)
}
export async function deleteToken(account: string){
  try{
    await keytar.deletePassword(SERVICE, account);
    return true;
  }catch{
    return false;
  }
}
