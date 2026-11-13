import { useEffect, useState } from "react";
import { Button, InlineMessage, Spinner } from "@ui";
import { DETAIL_COUNT, detailText, fullText, listSize } from "./ragged";

type Props = {
  title: string;
  summary: string;
  /** The row's values; undefined while they load. */
  values?: unknown[];
  nested: boolean;
  shape: number[];
  error?: string;
};

type CopyState = "idle" | "copied" | "failed";
const CONFIRM_TIME = 2000;

const longest = (values: unknown[], nested: boolean) =>
  nested
    ? Math.max(values.length - 1, ...values.map((l) => (l as unknown[]).length))
    : values.length;

/** One ragged cell opened: the first values, Show all, and Copy values for the whole list. */
const RaggedDetail = ({
  title,
  summary,
  values,
  nested,
  shape,
  error,
}: Props) => {
  const [all, setAll] = useState(false);
  const [copy, setCopy] = useState<CopyState>("idle");
  useEffect(() => {
    if (copy === "idle") return;
    const timer = setTimeout(() => setCopy("idle"), CONFIRM_TIME);
    return () => clearTimeout(timer);
  }, [copy]);

  const limit = all ? Infinity : DETAIL_COUNT;
  const onCopy = () =>
    navigator.clipboard.writeText(fullText(values ?? [])).then(
      () => setCopy("copied"),
      () => setCopy("failed"),
    );
  const count = values ? longest(values, nested) : 0;

  return (
    <div className="ragged-detail">
      <div className="ragged-detail-head">
        <p className="ragged-detail-title">
          {title} · {summary}
        </p>
        <Button
          size="sm"
          icon={copy === "copied" ? "checkmark" : "copy"}
          disabled={!values}
          onClick={onCopy}
        >
          {copy === "copied" ? "Copied" : "Copy values"}
        </Button>
        <span role="status" className="ns-visually-hidden">
          {copy === "copied"
            ? "Copied"
            : copy === "failed"
              ? "Couldn’t copy. Select the values and copy them."
              : ""}
        </span>
      </div>
      {error ? (
        <InlineMessage status="error">{error}</InlineMessage>
      ) : !values ? (
        <p className="ragged-detail-reading">
          <Spinner />
          Reading the values…
        </p>
      ) : nested ? (
        <ol className="ragged-detail-lists">
          {values.slice(0, limit).map((list, i) => (
            <li key={i}>
              <span className="ragged-detail-list-name">
                {values.length > 1 && `List ${i + 1} · `}
                {listSize((list as unknown[]).length, shape)}
              </span>
              <p className="ragged-detail-values">
                {detailText(list as unknown[], limit)}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="ragged-detail-values">{detailText(values, limit)}</p>
      )}
      {count > DETAIL_COUNT + 1 && (
        <div>
          <Button size="sm" variant="ghost" onClick={() => setAll((a) => !a)}>
            {all ? "Show fewer" : `Show all ${count.toLocaleString("en-US")}`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default RaggedDetail;
