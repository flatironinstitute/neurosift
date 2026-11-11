import { useId, type ReactNode } from "react";
import "./Page.css";

interface SectionProps {
  title: string;
  children: ReactNode;
}

/** A titled panel on a page, named by its h2 so screen readers list it as a region. */
export function Section({ title, children }: SectionProps) {
  const id = useId();
  return (
    <section className="ns-section" aria-labelledby={id}>
      <h2 className="ns-section-title" id={id}>
        {title}
      </h2>
      {children}
    </section>
  );
}
