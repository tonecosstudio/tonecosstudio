import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function source(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("delivery choice integrity", () => {
  const migration = source(
    "supabase/migrations/20260916154052_reconcile_delivery_choice_integrity.sql",
  );
  const cycleService = source("src/services/delivery/cycle-service.ts");
  const mutations = source(
    "src/services/delivery/delivery-cycle-mutations-service.ts",
  );

  it("keeps delivery-character choices inside the active delivery collection", () => {
    expect(migration).toContain("CHARACTER_NOT_AVAILABLE_IN_DELIVERY_COLLECTION");
    expect(migration).toContain("c.is_active IS TRUE");
    expect(migration).toMatch(/cc\.collection_id\s*=\s*v_delivery\.collection_id/i);
    expect(migration).toMatch(/cc\.character_id\s*=\s*p_character_id/i);
    expect(migration).toContain("collection_character_id = v_collection_character_id");
  });

  it("clears stale character references when the collection changes", () => {
    expect(migration).toMatch(/character_id\s*=\s*CASE/i);
    expect(migration).toMatch(/collection_character_id\s*=\s*CASE/i);
    expect(migration).toContain("v_previous_collection_id IS DISTINCT FROM p_new_collection_id");
  });

  it("keeps automatic maintenance fail-closed and clears stale character choices", () => {
    expect(migration).toMatch(/c\.is_active\s+IS\s+TRUE/i);
    expect(migration).toMatch(/c\.status::text\s*=\s*'active'/i);
    expect(migration).toMatch(/character_id\s*=\s*NULL/i);
    expect(migration).toMatch(/collection_character_id\s*=\s*NULL/i);
    expect(migration).not.toMatch(/COALESCE\(c\.is_active,\s*true\)/i);
  });

  it("does not expose service-role-only capacity RPCs through the browser cycle service", () => {
    expect(cycleService).not.toContain("CycleCapacityRpcClient");
    expect(cycleService).not.toContain('rpc("reserve_capacity"');
    expect(cycleService).not.toContain('rpc("release_capacity"');
    expect(cycleService).not.toContain("incrementCapacity(");
    expect(cycleService).not.toContain("decrementCapacity(");
    expect(cycleService).toContain('"cancelled"');
  });

  it("uses generated Supabase RPC types for customer delivery-choice mutations", () => {
    expect(mutations).toContain('supabase.rpc(\n    "change_delivery_character_for_current_user"');
    expect(mutations).toContain('supabase.rpc(\n    "change_delivery_collection_choice_for_current_user"');
    expect(mutations).not.toContain("DeliveryChoiceRpcClient");
    expect(mutations).not.toMatch(/supabase\s+as\s+unknown\s+as/i);
  });
});
