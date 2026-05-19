import { describe, it, expect } from "vitest";
import { fullName } from "@/src/utils/formatName";

describe("fullName", () => {
  it("combines first and last name with a space", () => {
    expect(fullName("Ada", "Lovelace")).toBe("Ada Lovelace");
  });

  it("returns only the last name when first is null", () => {
    expect(fullName(null, "Lovelace")).toBe("Lovelace");
  });

  it("returns only the last name when first is undefined", () => {
    expect(fullName(undefined, "Lovelace")).toBe("Lovelace");
  });

  it("returns only the first name when last is null", () => {
    expect(fullName("Ada", null)).toBe("Ada");
  });

  it("returns only the first name when last is undefined", () => {
    expect(fullName("Ada", undefined)).toBe("Ada");
  });

  it("returns empty string when both are null and no fallback is given", () => {
    expect(fullName(null, null)).toBe("");
  });

  it("returns the fallback when both are null", () => {
    expect(fullName(null, null, "Anonymous")).toBe("Anonymous");
  });

  it("returns the fallback when both are empty strings", () => {
    expect(fullName("", "", "Anonymous")).toBe("Anonymous");
  });

  it("returns the fallback when both are whitespace only", () => {
    expect(fullName("  ", "  ", "Anonymous")).toBe("Anonymous");
  });

  it("trims leading and trailing whitespace from the result", () => {
    // The implementation trims after joining, so extra spaces in names don't leak
    expect(fullName("Ada", "Lovelace")).not.toMatch(/^\s|\s$/);
  });

  it("uses first-last order (not last-first)", () => {
    const result = fullName("Ada", "Lovelace");
    expect(result.indexOf("Ada")).toBeLessThan(result.indexOf("Lovelace"));
  });

  it("handles a single-word name (first only, last empty)", () => {
    expect(fullName("Cher", "")).toBe("Cher");
  });

  it("default fallback is empty string", () => {
    expect(fullName(null, null)).toBe("");
  });
});
