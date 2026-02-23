/**
 * Build vision prompt for classification
 */
function buildVisionPrompt(currentName?: string): string {
  const context = currentName
    ? `Current name: "${currentName}". Use this as a hint but verify if it's accurate.`
    : "";
  
  return `Analyze this collectible figurine/statue image and classify it.

You are an expert at identifying collectible figurines, statues, action figures, busts and similar products from ANIME, MOVIES, SERIES, GAMES and COMICS.

${context}

Provide:
1. **name**: The character or object name (be specific, e.g., "Batman Dark Knight")
2. **franchise**: The franchise/universe it belongs to (e.g., "DC Comics", "Marvel", "Star Wars"). Use null if uncertain.
 3. **category**: Main MEDIA category, such as "animes", "filmes", "series", "jogos", "quadrinhos", or "outros".
4. **subcategory**: The specific FRANCHISE/PROJECT name (e.g., "Naruto", "Dragon Ball", "Senhor dos Anéis").
5. **tags**: Descriptive keywords (max 12, lowercase, comma-separated)
6. **confidence**: How confident you are in this classification (0-100)

Rules:
- This platform is ONLY for collectible products (statues, figures, busts, etc.), never for school supplies, office items or generic products.
- Be specific and accurate.
- Use canonical franchise names (e.g., "Marvel" not "Marvel Comics Universe").
- Category must be related to the MEDIA TYPE (anime/filme/série/jogo/quadrinhos/outros), not to office/school products.
- Include character name in the model name.
- Tags should be descriptive and useful for search, always related to COLLECTIBLES.
- If uncertain about franchise, use null.
- Confidence should reflect your certainty.

Return ONLY valid JSON in this exact format:
{
  "name": "string",
  "franchise": "string or null",
  "category": "string or null",
  "subcategory": "string or null",
  "tags": ["string"],
  "confidence": number
}`;
}
