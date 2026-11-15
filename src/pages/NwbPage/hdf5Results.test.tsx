// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getHdf5Group = vi.fn();
const getHdf5Dataset = vi.fn();
vi.mock("./hdf5Interface", () => ({ getHdf5Group, getHdf5Dataset }));
const { useHdf5GroupResult, useHdf5DatasetResult } =
  await import("./hdf5Results");

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("useHdf5GroupResult", () => {
  it("is loading, then has the group", async () => {
    getHdf5Group.mockResolvedValue({ path: "/units" });
    const { result } = renderHook(() => useHdf5GroupResult("f", "/units"));
    expect(result.current).toEqual({ value: undefined, error: undefined });
    await waitFor(() =>
      expect(result.current.value).toEqual({ path: "/units" }),
    );
  });

  it("reports a group the file doesn't have as an error, not as loading", async () => {
    getHdf5Group.mockResolvedValue(undefined);
    const { result } = renderHook(() => useHdf5GroupResult("f", "/nope"));
    await waitFor(() =>
      expect(result.current.error).toBe("This file has no group at /nope."),
    );
  });

  it("reports a failed request with its message", async () => {
    getHdf5Group.mockRejectedValue(new Error("404 Not Found"));
    const { result } = renderHook(() => useHdf5GroupResult("f", "/units"));
    await waitFor(() => expect(result.current.error).toBe("404 Not Found"));
  });
});

describe("useHdf5DatasetResult", () => {
  it("reports a dataset the file doesn't have", async () => {
    getHdf5Dataset.mockResolvedValue(undefined);
    const { result } = renderHook(() => useHdf5DatasetResult("f", "/units/id"));
    await waitFor(() =>
      expect(result.current.error).toBe(
        "This file has no dataset at /units/id.",
      ),
    );
  });
});
