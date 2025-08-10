const baseUrl = window.DevPilot.getBaseUrl();

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json();
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : "{}",
  });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return res.json();
}
