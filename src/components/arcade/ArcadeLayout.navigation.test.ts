import { describe, expect, it } from "vitest";
import { ArcadeNav as CanonicalNav } from "./ArcadeNav";
import { ArcadeNav as BarrelNav } from "./index";
import * as Layout from "./ArcadeLayout";

describe("single owner of Arcade navigation", () => {
  it("exports the dedicated Tonecos navigation and not a legacy copy from ArcadeLayout", () => {
    expect(BarrelNav).toBe(CanonicalNav);
    expect(Object.prototype.hasOwnProperty.call(Layout, "ArcadeNav")).toBe(false);
  });
});
