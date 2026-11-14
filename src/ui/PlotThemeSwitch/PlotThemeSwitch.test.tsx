// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlotThemeSwitch } from "./PlotThemeSwitch";

afterEach(cleanup);

describe("PlotThemeSwitch", () => {
  it("offers the other theme and reports it", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PlotThemeSwitch theme="light" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dark chart" }));
    expect(onChange).toHaveBeenCalledWith("dark");
    rerender(<PlotThemeSwitch theme="dark" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Light chart" }));
    expect(onChange).toHaveBeenLastCalledWith("light");
  });
});
