import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TYPES_PATH = path.join(ROOT, "src", "integrations", "supabase", "types.ts");
const source = readFileSync(TYPES_PATH, "utf8");

const failures = [];

function requireMatch(pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

function forbidMatch(pattern, message) {
  if (pattern.test(source)) failures.push(message);
}

// Canonical signals generated from Supabase project pdytjhtjlxvbbeuxgnms on 2026-09-16.
// This is deliberately a contract guard, not a hand-maintained replacement for `supabase gen types`.
requireMatch(
  /PostgrestVersion:\s*["']14\.5["']/,
  "Generated Supabase types are stale: expected PostgREST 14.5 from the canonical project",
);
requireMatch(
  /\bpurchase_modes:\s*\{[\s\S]*?Row:\s*\{[\s\S]*?\bmode_key:\s*string[\s\S]*?\bprice_multiplier:\s*number/s,
  "Generated Supabase types are missing the canonical purchase_modes table contract",
);
requireMatch(
  /\bpricing_tiers:\s*\{[\s\S]*?Row:\s*\{[\s\S]*?\bis_default:\s*boolean[\s\S]*?\bprice_brl:\s*number[\s\S]*?\bprice_coins:\s*number/s,
  "Generated Supabase types are missing canonical pricing_tiers fields",
);
requireMatch(
  /\bsubscription_plans:\s*\{[\s\S]*?Row:\s*\{[\s\S]*?\bpricing_tier_id:\s*string\s*\|\s*null/s,
  "Generated Supabase types are missing subscription_plans.pricing_tier_id",
);
requireMatch(
  /\badmin_get_pricing_tiers_snapshot:\s*\{[\s\S]*?Args:\s*\{\s*p_tier_id\?:\s*string\s*\}[\s\S]*?Returns:\s*Json/s,
  "Generated Supabase types are missing admin_get_pricing_tiers_snapshot",
);
requireMatch(
  /\buser_role:\s*["']customer["']\s*\|\s*["']admin["']\s*\|\s*["']super_admin["']/,
  "Generated Supabase types are missing the canonical user_role enum",
);

forbidMatch(
  /\bpricing_tiers_with_plans:\s*\{/,
  "Generated Supabase types still contain removed pricing_tiers_with_plans view",
);
forbidMatch(
  /\bpricing_tier_stats:\s*\{/,
  "Generated Supabase types still contain removed pricing_tier_stats view",
);

if (failures.length > 0) {
  console.error("Supabase generated types SSOT audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "Regenerate src/integrations/supabase/types.ts from canonical Supabase project pdytjhtjlxvbbeuxgnms; do not patch generated types or add schema casts to bypass this gate.",
  );
  process.exit(1);
}

console.log("Supabase generated types SSOT audit passed.");
