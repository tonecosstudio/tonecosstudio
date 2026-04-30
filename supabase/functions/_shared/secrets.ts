export function requireSharedSecret(req: Request, envName: string, headerName: string) {
  const expected = Deno.env.get(envName);
  const provided = req.headers.get(headerName);

  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}
