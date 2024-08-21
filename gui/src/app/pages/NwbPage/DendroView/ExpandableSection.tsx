import {
  FunctionComponent,
  PropsWithChildren,
  useEffect,
  useState,
} from "react";

type ExpandableSectionProps = {
  title: string;
  defaultExpanded?: boolean;
};

export const ExpandableSection: FunctionComponent<
  PropsWithChildren<ExpandableSectionProps>
> = ({ title, children, defaultExpanded }) => {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);
  return (
    <div>
      <div
        style={{ cursor: "pointer" }}
        onClick={() => {
          setExpanded(!expanded);
        }}
      >
        {expanded ? "▼" : "►"} {title}
      </div>
      {expanded && <div>{children}</div>}
    </div>
  );
};
