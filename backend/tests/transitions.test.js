import { describe, it, expect } from "vitest";
import { canTransition } from "../src/transitions.js";

describe("status transitions", () => {
  it("allows New -> In Progress", () => {
    expect(canTransition("New", "In Progress")).toBe(true);
  });
  it("allows In Progress -> Resolved", () => {
    expect(canTransition("In Progress", "Resolved")).toBe(true);
  });
  it("allows reopening Resolved -> In Progress", () => {
    expect(canTransition("Resolved", "In Progress")).toBe(true);
  });
  it("rejects skipping New -> Resolved", () => {
    expect(canTransition("New", "Resolved")).toBe(false);
  });
  it("rejects going back to New", () => {
    expect(canTransition("In Progress", "New")).toBe(false);
    expect(canTransition("Resolved", "New")).toBe(false);
  });
  it("rejects unknown statuses", () => {
    expect(canTransition("Bogus", "Resolved")).toBe(false);
  });
});