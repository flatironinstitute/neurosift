import { SmallIconButton } from "@fi-sci/misc";
import { useCssVars } from "@components/useCssVars";
import { FunctionComponent } from "react";
import { ToolbarItem } from "./Toolbars";
import "./ToolbarStyles.css";

interface Props {
  width: number;
  height: number;
  top?: number;
  actions: ToolbarItem[];
  /** Keeps the toolbar's space but leaves out its buttons. */
  hidden?: boolean;
}

/** The narrow column of zoom and pan buttons beside a time scroll view. */
const ViewToolbar: FunctionComponent<Props> = ({
  width,
  height,
  top = 0,
  actions,
  hidden,
}) => {
  const ref = useCssVars<HTMLDivElement>({
    "--toolbar-width": width,
    "--toolbar-height": height - top,
    "--toolbar-top": top,
  });
  return (
    <div ref={ref} className="time-scroll-toolbar">
      {!hidden &&
        actions.map((action) => (
          <span title={action.title} key={action.title}>
            <SmallIconButton
              title={action.title}
              onClick={action.callback}
              disabled={!!action.disabled}
              icon={action.icon}
            />
          </span>
        ))}
    </div>
  );
};

export default ViewToolbar;
