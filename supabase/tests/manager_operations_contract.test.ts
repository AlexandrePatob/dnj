import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260805205306_manager_operations.sql",
  "utf8",
);
const liveRunSql = readFileSync(
  "supabase/migrations/20260805220000_lock_radicality_run_checkin.sql",
  "utf8",
);

describe("Radicalidade persisted scoring contract", () => {
  it("records run participants and makes the final scoring RPC idempotent", () => {
    expect(sql).toContain("activity_run_participants");
    expect(sql).toContain("if v_run.status = 'completed'");
    expect(sql).toContain("on conflict (idempotency_key) do nothing");
    expect(sql).toContain("reason, delta, idempotency_key");
  });

  it("locks dynamic QR codes as soon as check-in ends", () => {
    expect(liveRunSql).toContain("v_status is distinct from 'draft'");
    expect(liveRunSql).toContain("qr_codes_guard_activity_run_checkin");
    expect(liveRunSql).toContain("activity_runs_close_checkin_qrs");
  });
});
