/**
 * Anonymous preview transport. Not a security boundary; RLS remains authoritative.
 * Only public REST table and public object reads may leave the client.
 */
const denied = () => new Response(JSON.stringify({ code: "preview_read_only" }), {
  status: 403,
  headers: { "content-type": "application/json" },
});

const TABLE_READ = /^\/rest\/v1\/(?!rpc(?:\/|$))[a-zA-Z0-9_%-]+\/?$/;
const PUBLIC_OBJECT = /^\/storage\/v1\/object\/public\/[^?#]+$/;

export function createPreviewReadOnlyFetch(
  supabaseUrl: string,
  forward: typeof fetch,
): typeof fetch {
  const origin = new URL(supabaseUrl).origin;

  return (input, init) => {
    let url: URL;
    let method: string;
    try {
      url = new URL(input instanceof Request ? input.url : String(input));
      method = (init?.method ?? (input instanceof Request ? input.method : "GET"))
        .toUpperCase();
    } catch {
      return Promise.resolve(denied());
    }

    if (
      url.origin !== origin ||
      (method !== "GET" && method !== "HEAD") ||
      (!TABLE_READ.test(url.pathname) && !PUBLIC_OBJECT.test(url.pathname))
    ) {
      return Promise.resolve(denied());
    }

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    if (
      headers.has("x-http-method-override") ||
      headers.has("x-http-method") ||
      headers.has("x-method-override")
    ) {
      return Promise.resolve(denied());
    }

    return forward(input, { ...init, redirect: "error" });
  };
}
