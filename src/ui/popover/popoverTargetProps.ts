import { version } from "react";

const camelCase = Number(version.split(".")[0]) >= 19;

/** The attribute that opens popover `id`: React 19 knows popoverTarget, React 18 passes only lowercase through. */
export const popoverTargetProps = (id: string) =>
  camelCase ? { popoverTarget: id } : { popovertarget: id };
