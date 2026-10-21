import { describe, expect, it } from "vitest";
import { isTaskStatus, parseTaskListQuery } from "@/lib/devTasks";

describe("parseTaskListQuery", () => {
  it("accepts valid filters", () => {
    expect(parseTaskListQuery(new URLSearchParams("status=open&severity=high&page=3"))).toEqual({
      status: "open", severity: "high", page: 3,
    });
  });
  it("ignores unknown values (never reaches SQL)", () => {
    const q = parseTaskListQuery(new URLSearchParams("status=x'; DROP TABLE ai_tasks;--&severity=urgent&page=abc"));
    expect(q).toEqual({ status: null, severity: null, page: 1 });
  });
  it("clamps page", () => {
    expect(parseTaskListQuery(new URLSearchParams("page=-5")).page).toBe(1);
    expect(parseTaskListQuery(new URLSearchParams("page=999999")).page).toBe(1000);
    expect(parseTaskListQuery(new URLSearchParams("page=1.5")).page).toBe(1);
  });
  it("status guard", () => {
    expect(isTaskStatus("resolved")).toBe(true);
    expect(isTaskStatus("deleted")).toBe(false);
    expect(isTaskStatus(1)).toBe(false);
  });
});
