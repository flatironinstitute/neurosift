// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendLog = vi.fn();
vi.mock("../util/sendLog", () => ({ sendLog }));

const { default: ErrorBoundary } = await import("./ErrorBoundary");
const { resetReportedErrors } = await import("../util/reportError");

const preventDefault = (event: Event) => event.preventDefault();

let shouldThrow = true;
const Broken = () => {
  if (shouldThrow) throw new Error("cannot read data of /units");
  return <div>recovered view</div>;
};

beforeEach(() => {
  shouldThrow = true;
  sendLog.mockClear();
  resetReportedErrors();
  // React logs every error a boundary catches, and in development also
  // rethrows it as a window error event, which jsdom prints.
  vi.spyOn(console, "error").mockImplementation(() => {});
  window.addEventListener("error", preventDefault);
  window.history.replaceState(
    null,
    "",
    "/nwb?url=https://api.dandiarchive.org/api/assets/abc/download/&tab=/units",
  );
});

afterEach(() => {
  window.removeEventListener("error", preventDefault);
  cleanup();
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("replaces only its own children when they throw", () => {
    render(
      <div>
        <div>app bar</div>
        <ErrorBoundary what="the Raster view of /units">
          <Broken />
        </ErrorBoundary>
        <ErrorBoundary what="the default view of /units">
          <div>neighboring view</div>
        </ErrorBoundary>
      </div>,
    );

    expect(screen.getByText("app bar")).toBeTruthy();
    expect(screen.getByText("neighboring view")).toBeTruthy();
    expect(
      screen.getByText("Something went wrong in the Raster view of /units"),
    ).toBeTruthy();
    expect(screen.getByText("cannot read data of /units")).toBeTruthy();
  });

  it("links to a new issue with the page url and the error filled in", () => {
    render(
      <ErrorBoundary what="the Raster view of /units">
        <Broken />
      </ErrorBoundary>,
    );

    const link = screen.getByText("Report this").closest("a")!;
    const url = new URL(link.href);
    expect(url.origin + url.pathname).toBe(
      "https://github.com/flatironinstitute/neurosift/issues/new",
    );
    expect(url.searchParams.get("title")).toBe(
      "Error in the Raster view of /units: Error: cannot read data of /units",
    );
    const body = url.searchParams.get("body")!;
    expect(body).toContain(
      "/nwb?url=https://api.dandiarchive.org/api/assets/abc/download/&tab=/units",
    );
    expect(body).toContain("Error: cannot read data of /units");
  });

  it("logs the error once, however many times the view re-renders", () => {
    const { rerender } = render(
      <ErrorBoundary what="this view">
        <Broken />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByText("Try again"));
    rerender(
      <ErrorBoundary what="this view">
        <Broken />
      </ErrorBoundary>,
    );

    expect(sendLog).toHaveBeenCalledTimes(1);
    const [payload] = sendLog.mock.calls[0];
    expect(payload.message).toBe("Error: Error: cannot read data of /units");
    expect(payload.metadata.source).toBe("render");
    expect(payload.metadata.url).toContain("tab=/units");
  });

  it("renders the children again after Try again", () => {
    render(
      <ErrorBoundary what="this view">
        <Broken />
      </ErrorBoundary>,
    );
    shouldThrow = false;
    fireEvent.click(screen.getByText("Try again"));
    expect(screen.getByText("recovered view")).toBeTruthy();
  });

  it("clears the error when resetKey changes", () => {
    const { rerender } = render(
      <ErrorBoundary what="this page" resetKey="/nwb">
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong in this page")).toBeTruthy();

    rerender(
      <ErrorBoundary what="this page" resetKey="/dandi">
        <div>another page</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("another page")).toBeTruthy();
  });
});
