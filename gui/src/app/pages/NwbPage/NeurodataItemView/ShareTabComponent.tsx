import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { ContentCopy } from "@mui/icons-material";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GiPaperClip } from "react-icons/gi";
import {
  useTimeRange,
  useTimeseriesSelection,
} from "neurosift-lib/contexts/context-timeseries-selection";

type Props = {
  tabName?: string;
  stateString?: string;
  defaultIncludeState?: boolean;
};

const ShareTabComponent: FunctionComponent<Props> = ({
  tabName,
  stateString,
  defaultIncludeState,
}) => {
  const [clicked, setClicked] = useState(false);
  const [includeTimeSelection, setIncludeTimeSelection] = useState(false);
  const [includeState, setIncludeState] = useState(false);
  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();
  const { currentTime } = useTimeseriesSelection();

  useEffect(() => {
    if (defaultIncludeState) {
      setIncludeState(true);
    }
  }, [defaultIncludeState]);

  const tabTimeString = useMemo(() => {
    if (!includeTimeSelection) return "";
    return `${visibleStartTimeSec},${visibleEndTimeSec},${currentTime}`;
  }, [
    includeTimeSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
    currentTime,
  ]);

  const url = useMemo(() => {
    if (!tabName) return null;
    let url = window.location.href;
    // remove tab and tab-time and tab-state query parameters from url
    url = url.replace(/&tab=[^&]*/g, "");
    url = url.replace(/&tab-time=[^&]*/g, "");
    url = url.replace(/&tab-state=[^&]*/g, "");
    url += `&tab=${tabName}`;
    if (includeTimeSelection) {
      url += `&tab-time=${tabTimeString}`;
    }
    if (includeState) {
      url += `&tab-state=${stateString}`;
    }
    return url;
  }, [tabName, tabTimeString, includeTimeSelection, includeState, stateString]);

  if (!tabName) return <div />;

  if (clicked && url) {
    return (
      <div>
        <CopyableText
          text={url}
          onCopyToAddressBar={() => {
            window.history.replaceState(null, "", url);
            alert("Shareable URL has been set to address bar");
          }}
        />
        <Checkbox
          value={includeTimeSelection}
          setValue={setIncludeTimeSelection}
          label="Include time selection"
        />
        {stateString && (
          <Checkbox
            value={includeState}
            setValue={setIncludeState}
            label="Include state"
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <Hyperlink onClick={() => setClicked(true)}>Share this tab</Hyperlink>
    </div>
  );
};

const Checkbox: FunctionComponent<{
  value: boolean;
  setValue: (val: boolean) => void;
  label: string;
}> = ({ value, setValue, label }) => {
  return (
    <div>
      <input
        type="checkbox"
        checked={value}
        onChange={(evt) => setValue(evt.target.checked)}
      />
      <span>{label}</span>
    </div>
  );
};

const CopyableText: FunctionComponent<{
  text: string;
  onCopyToAddressBar?: (txt: string) => void;
}> = ({ text, onCopyToAddressBar }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasBeenCopied, setHasBeenCopied] = useState(false);
  useEffect(() => {
    setHasBeenCopied(false);
  }, [text]);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setHasBeenCopied(true);
  }, [text]);
  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        value={text}
        readOnly={true}
        onClick={() => {
          inputRef.current?.select();
        }}
      />
      <SmallIconButton
        icon={<ContentCopy />}
        onClick={handleCopy}
        title="Copy URL to clipboard"
      />
      {hasBeenCopied && (
        <span title="Copied to clipboard" style={{ color: "green" }}>
          Copied!
        </span>
      )}
      {onCopyToAddressBar && (
        <SmallIconButton
          icon={<GiPaperClip />}
          onClick={() => onCopyToAddressBar(text)}
          title="Set URL to address bar"
        />
      )}
    </div>
  );
};

export default ShareTabComponent;
