const GATEWAY_URL = "https://api.openai.com/v1/chat/completions";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getModelCandidates() {
  // Use OpenAI models directly
  const env = (Deno.env.get("AI_CLASSIFY_MODELS") || "").trim();
  if (env) {
    return env
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ["gpt-4o-mini", "gpt-4o"]; // fallback list
}

async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch(input, init);

      // Hard fail (no retry): auth/payment/bad request.
      if ([400, 401, 402, 403].includes(resp.status)) return resp;

      // Retry on rate limit / transient server errors.
      if (resp.status === 429 || (resp.status >= 500 && resp.status <= 599)) {
        const body = await resp.text();
        if (attempt < maxAttempts) {
          await sleep(250 * Math.pow(2, attempt - 1));
          continue;
        }
        throw new Error(`AI gateway failed [${resp.status}]: ${body}`);
      }

      return resp;
    } catch (e) {
      if (attempt < maxAttempts) {
        await sleep(250 * Math.pow(2, attempt - 1));
        continue;
      }
      throw e;
    }
  }
  throw new Error("AI gateway failed");
}

export type Classification = {
  franchise: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[];
};

type CanonicalCategory = "animes" | "filmes" | "series" | "jogos" | "quadrinhos" | "outros";

function normalizeCategoryPTBR(rawCategory: string | null): CanonicalCategory | null {
  if (!rawCategory) return null;
  const c = rawCategory.toLowerCase();

  // Bloqueia classificações totalmente fora do domínio (força revisão)
  if (
    c.includes("escolar") ||
    c.includes("papelaria") ||
    c.includes("escrit") ||
    c.includes("office") ||
    c.includes("stationery")
  ) {
    return null;
  }

  // Mapeamento estritamente PT-BR (o prompt já induz as canônicas)
  if (c.includes("anime") || c.includes("mang")) return "animes";
  if (c.includes("filme") || c.includes("cinema")) return "filmes";
  if (c.includes("série") || c.includes("serie")) return "series";
  if (c.includes("jogo")) return "jogos";
  if (c.includes("quadrinho") || c.includes("hq")) return "quadrinhos";

  // Qualquer outra coisa vira "outros" (canônica) — não é inválido, só genérico.
  return "outros";
}

export async function classifyNameWithAI(name: string): Promise<Classification> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

  const tool = {
    type: "function",
    function: {
      name: "classify",
      description: "Classifica um produto com base no nome.",
      parameters: {
        type: "object",
        properties: {
          franchise: { type: ["string", "null"], description: "Franquia/canon (se não souber, null)." },
          category: { type: ["string", "null"], description: "Categoria principal" },
          subcategory: { type: ["string", "null"], description: "Subcategoria" },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Lista curta de tags (máx 12)" ,
          },
        },
        required: ["franchise", "category", "subcategory", "tags"],
        additionalProperties: false,
      },
    },
  };

  const models = getModelCandidates();

  let lastText = "";
  let lastStatus = 0;

  for (const model of models) {
    const resp = await fetchWithRetry(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
              content:
                "Você é um classificador especializado em estátuas, figuras de ação, bustos e colecionáveis relacionados a ANIMES, FILMES, SERIES, JOGOS e QUADRINHOS.\n\nContexto do projeto:\n- TODO produto é um COLECIONÁVEL (estátua, figura, busto, funko, etc.)\n- NUNCA é material escolar, papelaria, escritório ou itens genéricos.\n- A categoria deve ser o TIPO DE MÍDIA / UNIVERSO principal, usando SOMENTE: 'animes', 'filmes', 'series', 'jogos', 'quadrinhos', 'outros'.\n- A subcategoria deve ser a FRANQUIA/PROJETO, por exemplo: 'Naruto', 'Dragon Ball', 'Senhor dos Anéis', 'Star Wars'.\n\nRegras importantes:\n- Jamais classificar como 'material escolar', 'papelaria', 'escritório' ou similares. Se tiver dúvida, use 'outros'.\n- Se o nome não parecer familiar, compare mentalmente com personagens e franquias conhecidas (animes, filmes, series, jogos).\n- Responda SOMENTE via tool calling. Seja consistente. Não invente detalhes. Use tags curtas, úteis e relacionadas a COLECIONÁVEIS.",
          },
          {
            role: "user",
              content: `Nome do produto: ${name}\n\nContexto: Este é SEMPRE um colecionável (estátua, figura de ação, busto, funko, etc.) ligado a animes, filmes, series, jogos ou quadrinhos.\n\nCampos esperados:\n- franchise: nome da franquia/universo canônico (ex.: 'DC Comics', 'Marvel', 'Star Wars', 'Naruto'). Use null se não souber.\n- category: tipo de mídia principal (use SOMENTE: 'animes', 'filmes', 'series', 'jogos', 'quadrinhos', 'outros').\n- subcategory: franquia/projeto específico (ex.: 'Naruto', 'Dragon Ball', 'Senhor dos Anéis').\n- tags: palavras-chave úteis sobre o COLECIONÁVEL (personagem, tipo de peça, escala, etc.).\n\nNunca classifique como material escolar, papelaria ou escritório. Se estiver inseguro sobre a categoria, use 'outros' e deixe franchise/subcategory em null quando necessário.`,
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "classify" } },
      }),
    });

    lastStatus = resp.status;
    lastText = await resp.text();

    if (!resp.ok) {
      // Try next model unless it's a hard failure.
      if ([401, 402, 403].includes(resp.status)) {
        throw new Error(`AI gateway failed [${resp.status}]: ${lastText}`);
      }
      continue;
    }

    const json = JSON.parse(lastText);
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) throw new Error("AI: missing tool call arguments");

    let parsed: any;
    try {
      parsed = typeof args === "string" ? JSON.parse(args) : args;
    } catch {
      throw new Error("AI: invalid JSON arguments");
    }

    const rawFranchise = parsed.franchise === null ? null : parsed.franchise ? String(parsed.franchise) : null;
    const rawCategory = parsed.category === null ? null : parsed.category ? String(parsed.category) : null;
    const rawSubcategory = parsed.subcategory === null ? null : parsed.subcategory ? String(parsed.subcategory) : null;

    const normalizedCategory = normalizeCategoryPTBR(rawCategory);

    const subcategory = (() => {
      if (rawSubcategory) return rawSubcategory;
      // Se não houver subcategoria mas existir franquia, usamos a franquia
      if (rawFranchise) return rawFranchise;
      return null;
    })();

    const tags = Array.isArray(parsed.tags) ? parsed.tags.map((t: any) => String(t)).slice(0, 12) : [];

    const out: Classification = {
      franchise: rawFranchise,
      category: normalizedCategory,
      subcategory,
      tags,
    };

    return out;
  }

  throw new Error(`AI gateway failed [${lastStatus || 500}]: ${lastText || "No response"}`);
}
