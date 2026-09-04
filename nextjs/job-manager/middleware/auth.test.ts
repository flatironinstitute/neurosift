import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const users: { [apiKey: string]: { userId: string } } = {};
vi.mock("../lib/db", () => ({
  default: async () => {},
  User: {
    findOne: async ({ apiKey }: { apiKey: string }) => users[apiKey] ?? null,
  },
}));

const { validateApiKey, validateJobState } = await import("./auth");

describe("validateJobState", () => {
  const job = (status: string) => ({ status }) as never;

  it("accepts the transitions a runner needs", async () => {
    expect(await validateJobState(job("pending"), "running")).toBeNull();
    expect(await validateJobState(job("pending"), "failed")).toBeNull();
    expect(await validateJobState(job("running"), "completed")).toBeNull();
    expect(await validateJobState(job("running"), "failed")).toBeNull();
  });

  it("rejects transitions out of a finished job", async () => {
    for (const from of ["completed", "failed"]) {
      for (const to of ["pending", "running", "completed", "failed"]) {
        const r = await validateJobState(job(from), to);
        expect(r).toBeInstanceOf(NextResponse);
        expect((r as NextResponse).status).toBe(400);
      }
    }
  });

  it("rejects going backwards", async () => {
    const r = await validateJobState(job("running"), "pending");
    expect((r as NextResponse).status).toBe(400);
  });

  it("returns 404 for a missing job", async () => {
    const r = await validateJobState(null as never, "running");
    expect((r as NextResponse).status).toBe(404);
  });

  it("allows an update that does not change status", async () => {
    expect(await validateJobState(job("running"))).toBeNull();
  });
});

describe("validateApiKey", () => {
  beforeEach(() => {
    for (const k of Object.keys(users)) delete users[k];
    users["key-1"] = { userId: "user-1" };
  });

  const req = (auth?: string) =>
    new NextRequest("http://localhost/api/jobs/search", {
      method: "POST",
      headers: auth ? { Authorization: auth } : {},
    });

  it("returns the user for a valid bearer key", async () => {
    expect(await validateApiKey(req("Bearer key-1"))).toEqual({
      userId: "user-1",
      authorized: true,
    });
  });

  it("returns 401 for a missing, malformed, or unknown key", async () => {
    for (const h of [undefined, "key-1", "Bearer nope", "Basic key-1"]) {
      const r = await validateApiKey(req(h));
      expect(r).toBeInstanceOf(NextResponse);
      expect((r as NextResponse).status).toBe(401);
    }
  });
});
