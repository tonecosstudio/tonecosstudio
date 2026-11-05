// Prevent a public catalog build that accidentally enables commercial writes.
if (process.env.VITE_PUBLIC_CATALOG_MVP === "true" &&
    process.env.VITE_PREVIEW_READ_ONLY !== "true") {
  console.error("MVP bloqueado: VITE_PREVIEW_READ_ONLY=true é obrigatório.");
  process.exit(1);
}

if (process.env.VITE_TONECOS_COMMERCIAL_MVP === "true" &&
    (process.env.VITE_PUBLIC_CATALOG_MVP === "true" ||
     process.env.VITE_PREVIEW_READ_ONLY !== "false" ||
     process.env.VITE_SUPABASE_URL !== "https://icmtmaakjucmuzxnofkd.supabase.co" ||
     !process.env.VITE_SUPABASE_PUBLISHABLE_KEY)) {
  console.error("MVP comercial bloqueado: configuração explícita Tonecos requerida.");
  process.exit(1);
}

if (process.env.VITE_TONECOS_COINS_ENABLED === "true" &&
    (process.env.VITE_PUBLIC_CATALOG_MVP === "true" ||
     process.env.VITE_TONECOS_COMMERCIAL_MVP !== "true")) {
  console.error("Moedas só podem ser ativadas na versão comercial privada.");
  process.exit(1);
}

if (process.env.VITE_CATALOG_QUOTES_ENABLED === "true" &&
    process.env.VITE_TONECOS_COMMERCIAL_MVP !== "true") {
  console.error("Orçamentos exigem modo comercial privado.");
  process.exit(1);
}
