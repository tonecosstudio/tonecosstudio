export function getPublicBaseUrl(envNames: string[] = ["BASE_URL", "SITE_URL"]): string {
  const configuredUrl = envNames
    .map((name) => Deno.env.get(name))
    .find((value): value is string => Boolean(value));

  if (!configuredUrl) {
    throw new Error(`${envNames.join(" or ")} must be configured`);
  }

  const url = new URL(configuredUrl);
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  if (url.protocol !== "https:" && !isLocalhost) {
    throw new Error(`${envNames.join("/")} must use HTTPS outside local development`);
  }

  return url.origin;
}
