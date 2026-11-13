import type { ReactNode } from "react";
import "./Page.css";

interface PageProps {
  title: string;
  children: ReactNode;
}

/** A page in the main area: page margins, a text-width column and the page's one h1. Scrolls inside the main area. */
export function Page({ title, children }: PageProps) {
  return (
    <div className="ns-page">
      <div className="ns-page-column">
        <h1 className="ns-page-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}
