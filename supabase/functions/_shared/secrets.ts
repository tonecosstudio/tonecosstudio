export function requireSharedSecret(req: Request, envName: string, headerName: string) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Allow": "POST",
      },
    });
  }

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
