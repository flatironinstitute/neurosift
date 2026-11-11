export const fieldMessageId = (id: string) => `${id}-message`;

/** The aria props that tie a control to its field's message, after any description the caller links. */
export const fieldAria = (
  id: string,
  helper?: string,
  error?: string,
  describedBy?: string,
) => ({
  "aria-invalid": error ? true : undefined,
  "aria-describedby":
    [describedBy, (error ?? helper) ? fieldMessageId(id) : undefined]
      .filter(Boolean)
      .join(" ") || undefined,
});
