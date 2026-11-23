// Passwords are forwarded only to Supabase Auth and are never logged or stored.
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  try {
    const { email, password } = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || email.length > 320 || password.length > 1024) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 400, headers });
    }
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
    const key = keys.default || Deno.env.get('SUPABASE_ANON_KEY');
    const url = Deno.env.get('SUPABASE_URL');
    if (!key || !url) return new Response(JSON.stringify({ error: 'Service unavailable' }), { status: 503, headers });
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify({ email, password }),
    });
    const session = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: '登入失敗，請確認帳號和密碼。' }), { status: response.status, headers });
    return new Response(JSON.stringify({ key, access_token: session.access_token, refresh_token: session.refresh_token }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: '登入服務暫時無法使用。' }), { status: 500, headers });
  }
});
