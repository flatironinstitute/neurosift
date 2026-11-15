import { createContext, useContext } from "react";

/** Switches the file to one of its fixed tabs, such as "python-usage"; undefined outside a file workspace. */
export const OpenFixedTabContext = createContext<
  ((id: string) => void) | undefined
>(undefined);

export const useOpenFixedTab = () => useContext(OpenFixedTabContext);
