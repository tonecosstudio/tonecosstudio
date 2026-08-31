import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("character choice deadline architecture", () => {
  it("creates the pre-choice window from system_settings on production_queue", () => {
    const source = read(
      "supabase/migrations/20260831061000_canonical_character_choice_window.sql",
    );

    expect(source).toContain("WHERE key = 'character_choice_days'");
    expect(source).toContain("NEW.choice_deadline := now() + make_interval(days => v_days)");
    expect(source).toContain("NEW.choice_status := 'pending'");
    expect(source).toContain("NEW.current_stage::text IS DISTINCT FROM 'awaiting_choice'");
    expect(source).not.toContain("DEFAULT 7");
  });

  it("stores reminder state on production_queue instead of requiring a fake pending choice", () => {
    const source = read(
      "supabase/migrations/20260831062000_choice_request_reminder_state.sql",
    );

    expect(source).toContain("choice_reminders_sent integer NOT NULL DEFAULT 0");
    expect(source).toContain("choice_last_reminder_at timestamptz");
    expect(source).toContain("NEW.choice_reminders_sent := 0");
  });

  it("sends reminders from pending production choice requests", () => {
    const source = read(
      "supabase/functions/cron-send-character-choice-reminders/index.ts",
    );

    expect(source).toContain('.from("production_queue")');
    expect(source).toContain('.eq("current_stage", "awaiting_choice")');
    expect(source).toContain('.eq("choice_status", "pending")');
    expect(source).toContain("choice_reminders_sent");
    expect(source).not.toContain('.from("character_choices")');
  });

  it("expires the canonical production request without hardcoding a seven-day promise", () => {
    const source = read(
      "supabase/functions/cron-expire-character-choices/index.ts",
    );

    expect(source).toContain('.from("production_queue")');
    expect(source).toContain('choice_status: "expired"');
    expect(source).toContain('"choice_expired"');
    expect(source).not.toContain("prazo de 7 dias");
    expect(source).not.toContain("7-day deadline");
  });
});
