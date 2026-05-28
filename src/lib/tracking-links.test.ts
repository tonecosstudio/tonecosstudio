import { describe, expect, it } from "vitest";
import {
  buildTrackingUrl,
  CORREIOS_TRACKING_BASE_URL,
  JADLOG_TRACKING_BASE_URL,
  normalizeTrackingCode,
} from "./tracking-links";

describe("tracking-links", () => {
  it("normalizes valid tracking codes", () => {
    expect(normalizeTrackingCode(" BR123456789BR ")).toBe("BR123456789BR");
  });

  it("rejects empty, control-character, and unsafe tracking codes", () => {
    expect(normalizeTrackingCode("")).toBeNull();
    expect(normalizeTrackingCode("BR123\nBCC")).toBeNull();
    expect(normalizeTrackingCode("javascript:alert(1)")).toBeNull();
  });

  it("builds canonical Correios tracking URLs by default", () => {
    expect(buildTrackingUrl("BR123456789BR")).toBe(
      `${CORREIOS_TRACKING_BASE_URL}?objeto=BR123456789BR`,
    );
  });

  it("uses Correios URL for sedex aliases", () => {
    expect(buildTrackingUrl("AA987654321BR", "sedex")).toBe(
      `${CORREIOS_TRACKING_BASE_URL}?objeto=AA987654321BR`,
    );
  });

  it("builds Jadlog tracking URLs", () => {
    expect(buildTrackingUrl("JDL 123/45", "jadlog")).toBe(
      `${JADLOG_TRACKING_BASE_URL}/JDL%20123%2F45`,
    );
  });

  it("returns null when tracking code is missing", () => {
    expect(buildTrackingUrl(null)).toBeNull();
    expect(buildTrackingUrl(undefined)).toBeNull();
  });
});
