import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findCalls: unknown[] = [];
const storedJobs = [
  { _id: "j1", type: "rastermap", status: "completed", userId: "user-1" },
];
vi.mock("../../../../lib/db", () => ({
  default: async () => {},
  Job: {
    find: (query: unknown) => {
      findCalls.push(query);
      return {
        sort: () => ({ limit: async () => storedJobs }),
      };
    },
  },
}));

let authResult: unknown;
vi.mock("../../../../middleware/auth", () => ({
  validateApiKey: async () => authResult,
}));

const { POST } = await import("./route");

const request = (body: unknown) =>
  new NextRequest("http://localhost/api/jobs/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/jobs/search", () => {
  beforeEach(() => {
    findCalls.length = 0;
  });

  it("rejects an unauthenticated search without touching the database", async () => {
    authResult = new NextResponse("Unauthorized", { status: 401 });
    const res = await POST(request({ type: "rastermap" }));
    expect(res.status).toBe(401);
    expect(findCalls).toEqual([]);
  });

  it("returns only the caller's jobs", async () => {
    authResult = { userId: "user-1", authorized: true };
    const res = await POST(
      request({ type: "rastermap", status: "completed", input: { a: 1 } }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(storedJobs);
    expect(findCalls).toEqual([
      {
        userId: "user-1",
        type: "rastermap",
        status: "completed",
        input: JSON.stringify({ a: 1 }),
      },
    ]);
  });

  it("scopes to the caller even with no filters", async () => {
    authResult = { userId: "user-2", authorized: true };
    await POST(request({}));
    expect(findCalls).toEqual([{ userId: "user-2" }]);
  });
});
