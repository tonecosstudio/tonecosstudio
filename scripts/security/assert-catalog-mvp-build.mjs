// Prevent a public catalog build that accidentally enables commercial writes.
if (process.env.VITE_PUBLIC_CATALOG_MVP === "true" &&
    process.env.VITE_PREVIEW_READ_ONLY !== "true") {
  console.error("MVP bloqueado: VITE_PREVIEW_READ_ONLY=true é obrigatório.");
  process.exit(1);
}
