/**
 * AI Vision Classification Helper
 * 
 * Provides functions to classify images using OpenAI Vision API (GPT-4o, GPT-4o mini)
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// ============================================================================
// Types
// ============================================================================

export type VisionClassification = {
  name: string;
  franchise: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[];
  confidence: number;  // 0-100
  tokensUsed: number;
  costUsd: number;
  processingTimeMs: number;
};

type OpenAIVisionResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// ============================================================================
// Pricing Constants (per 1M tokens)
// ============================================================================

const PRICING = {
  "gpt-4o-mini": {
    input: 0.15,   // $0.15 per 1M input tokens
    output: 0.60,  // $0.60 per 1M output tokens
  },
  "gpt-4o": {
    input: 2.50,   // $2.50 per 1M input tokens
    output: 10.00, // $10.00 per 1M output tokens
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate cost based on tokens used and model
 */
export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  model: "gpt-4o-mini" | "gpt-4o"
): number {
  const pricing = PRICING[model];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Build vision prompt for classification
 */
function buildVisionPrompt(currentName?: string): string {
  const context = currentName ? `Current name: "${currentName}". Use this as a hint but verify if it's accurate.` : "";
  
  return `Analyze this collectible figurine/statue image and classify it.

You are an expert at identifying collectible figurines, statues, action figures, busts and similar products from ANIME, MOVIES, SERIES, GAMES and COMICS.

${context}

Provide:
1. **name**: The character/model name (be specific)
2. **franchise**: The franchise/universe (e.g., "DC Comics", "Marvel", "Star Wars"). Use null if uncertain.
3. **category**: Main MEDIA category: "animes", "filmes", "series", "jogos", "quadrinhos", or "outros".
4. **subcategory**: The specific franchise/project name (e.g., "Naruto", "Dragon Ball", "Senhor dos Anéis"). Use null if uncertain.
5. **tags**: Useful keywords (max 12, lowercase)
6. **confidence**: 0-100

Rules:
- This platform is ONLY for collectible products; NEVER school/office/stationery.
- Category MUST be one of the canonical values above.
- If you are unsure, use category "outros" and franchise/subcategory null.

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

type CanonicalCategory = "animes" | "filmes" | "series" | "jogos" | "quadrinhos" | "outros";

function normalizeCategoryPTBR(rawCategory: string | null): CanonicalCategory | null {
  if (!rawCategory) return null;
  const c = rawCategory.toLowerCase();

  // Fora do domínio => força revisão
  if (
    c.includes("escolar") ||
    c.includes("papelaria") ||
    c.includes("escrit") ||
    c.includes("office") ||
    c.includes("stationery")
  ) {
    return null;
  }

  // Mapeamento estritamente PT-BR
  if (c.includes("anime") || c.includes("mang")) return "animes";
  if (c.includes("filme") || c.includes("cinema")) return "filmes";
  if (c.includes("série") || c.includes("serie")) return "series";
  if (c.includes("jogo")) return "jogos";
  if (c.includes("quadrinho") || c.includes("hq")) return "quadrinhos";
  return "outros";
}

/**
 * Parse and validate AI response
 */
function parseVisionResult(content: string): Omit<VisionClassification, "tokensUsed" | "costUsd" | "processingTimeMs"> {
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonStr);
    
    const rawFranchise = parsed.franchise === null ? null : String(parsed.franchise || "").trim() || null;
    const rawCategory = parsed.category === null ? null : String(parsed.category || "").trim() || null;
    const rawSubcategory = parsed.subcategory === null ? null : String(parsed.subcategory || "").trim() || null;

    const normalizedCategory = normalizeCategoryPTBR(rawCategory);
    const subcategory = rawSubcategory || rawFranchise || null;

    return {
      name: String(parsed.name || "").trim() || "Unknown",
      franchise: rawFranchise,
      category: normalizedCategory,
      subcategory,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.map((t: any) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 12)
        : [],
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 50)),
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    console.error("Content:", content);
    
    // Return fallback
    return {
      name: "Unknown",
      franchise: null,
      category: null,
      subcategory: null,
      tags: [],
      confidence: 0,
    };
  }
}

/**
 * Call OpenAI Vision API with retry logic
 */
async function callOpenAIVision(
  imageUrl: string,
  prompt: string,
  model: "gpt-4o-mini" | "gpt-4o",
  maxRetries = 3
): Promise<OpenAIVisionResponse> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                    detail: "high",  // Use high detail for better accuracy
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0.3,  // Lower temperature for more consistent results
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        
        // Don't retry on auth/payment errors
        if (response.status === 401 || response.status === 402 || response.status === 403) {
          throw new Error(`OpenAI API error [${response.status}]: ${errorText}`);
        }
        
        // Retry on rate limit or server errors
        if (response.status === 429 || (response.status >= 500 && response.status <= 599)) {
          if (attempt < maxRetries) {
            const delay = 1000 * Math.pow(2, attempt - 1);  // Exponential backoff
            console.log(`Retrying after ${delay}ms (attempt ${attempt}/${maxRetries})...`);
            await sleep(delay);
            continue;
          }
        }
        
        throw new Error(`OpenAI API error [${response.status}]: ${errorText}`);
      }
      
      const data = await response.json();
      return data as OpenAIVisionResponse;
      
    } catch (error) {
      if (attempt < maxRetries && !(error instanceof Error && error.message.includes("API error"))) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.log(`Retrying after ${delay}ms (attempt ${attempt}/${maxRetries})...`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  
  throw new Error("OpenAI Vision API failed after all retries");
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Classify an image using OpenAI Vision API
 * 
 * @param imageUrl - Public URL of the image to classify
 * @param model - OpenAI model to use ('gpt-4o-mini' or 'gpt-4o')
 * @returns Classification result with metrics
 */
export async function classifyImageWithVision(
  imageUrl: string,
  model: "gpt-4o-mini" | "gpt-4o" = "gpt-4o-mini",
  currentName?: string
): Promise<VisionClassification> {
  const startTime = Date.now();
  
  // 1. Build prompt with current name as context
  const prompt = buildVisionPrompt(currentName);
  
  // 2. Call OpenAI Vision API
  const response = await callOpenAIVision(imageUrl, prompt, model);
  
  // 3. Parse result
  const content = response.choices[0]?.message?.content || "{}";
  const classification = parseVisionResult(content);
  
  // 4. Calculate metrics
  const processingTimeMs = Date.now() - startTime;
  const tokensUsed = response.usage.total_tokens;
  const costUsd = calculateCost(
    response.usage.prompt_tokens,
    response.usage.completion_tokens,
    model
  );
  
  return {
    ...classification,
    tokensUsed,
    costUsd,
    processingTimeMs,
  };
}

/**
 * Generate SHA-256 hash of image content for caching
 * 
 * @param imageUrl - URL of the image
 * @returns SHA-256 hash as hex string
 */
export async function hashImage(imageUrl: string): Promise<string> {
  try {
    // Fetch image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    // Get image data
    const imageData = await response.arrayBuffer();
    
    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", imageData);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    
    return hashHex;
  } catch (error) {
    console.error("Failed to hash image:", error);
    // Fallback: use URL as hash (not ideal but prevents crashes)
    const encoder = new TextEncoder();
    const data = encoder.encode(imageUrl);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
}
