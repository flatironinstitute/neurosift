// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Icon, type IconName } from "../Icon/Icon";
import { InlineMessage, type InlineMessageStatus } from "./InlineMessage";

afterEach(cleanup);

const STATUS_ICONS: [InlineMessageStatus, IconName][] = [
  ["info", "information"],
  ["warning", "warning--alt"],
  ["error", "error"],
];

describe("InlineMessage", () => {
  it.each(STATUS_ICONS)(
    "shows the %s status with its own 16px icon and the message",
    (status, icon) => {
      const expected = render(<Icon name={icon} />).container.innerHTML;
      cleanup();
      const { container } = render(
        <InlineMessage status={status}>
          Window start must be before the end.
        </InlineMessage>,
      );
      expect(container.querySelector("svg")?.outerHTML).toBe(expected);
      expect(container.textContent).toBe(
        "Window start must be before the end.",
      );
    },
  );

  it("announces errors at once and notes politely", () => {
    render(<InlineMessage status="error">Failed</InlineMessage>);
    expect(screen.getByRole("alert")).toBeTruthy();
    cleanup();
    render(<InlineMessage status="info">Note</InlineMessage>);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
