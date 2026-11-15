import { Button, ToastProvider, useToast } from "@ui";
import { useEffect, useRef } from "react";

const PREPARE_TIME = 2000;

function Triggers() {
  const toast = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const prepare = () => {
    toast.show({ message: "Preparing units.csv", busy: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => toast.show({ status: "success", message: "units.csv is ready" }),
      PREPARE_TIME,
    );
  };
  const run = (show: () => void) => () => {
    clearTimeout(timer.current);
    show();
  };

  return (
    <div className="demo-row">
      <Button
        size="sm"
        onClick={run(() =>
          toast.show({ status: "success", message: "Link copied" }),
        )}
      >
        Copy link
      </Button>
      <Button size="sm" onClick={prepare}>
        Download units.csv
      </Button>
      <Button
        size="sm"
        onClick={run(() =>
          toast.show({
            message: "Tab closed",
            action: { label: "Undo", onClick: () => {} },
          }),
        )}
      >
        Close tab
      </Button>
      <Button
        size="sm"
        onClick={run(() =>
          toast.show({
            status: "error",
            message: "Couldn’t copy the link. Copy it from the address bar.",
          }),
        )}
      >
        Fail to copy
      </Button>
    </div>
  );
}

/** Live toasts for the docs, with the page's own toast region. */
export default function ToastDemo() {
  return (
    <ToastProvider>
      <Triggers />
    </ToastProvider>
  );
}
