import JobsView from "neurosift-lib/misc/dendro/JobsView";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ComputePageProps = {
  width: number;
  height: number;
};

const ComputePage: FunctionComponent<ComputePageProps> = ({
  width,
  height,
}) => {
  const [dandisetId, setDandisetId] = useState<string | undefined>(
    localStorage.getItem("compute-page-dandiset-id") || undefined,
  );
  const onSetDandisetId = useCallback((dandisetId: string) => {
    localStorage.setItem("compute-page-dandiset-id", dandisetId);
    setDandisetId(dandisetId);
  }, []);
  const tags = useMemo(() => {
    const ret = ["neurosift"];
    if (dandisetId) {
      ret.push(`dandiset:${dandisetId}`);
    }
    return ret;
  }, [dandisetId]);

  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  return (
    <div
      style={{
        position: "absolute",
        left: 10,
        top: 10,
        width: width - 20,
        height: height - 20,
        overflowY: "auto",
      }}
    >
      <p>
        <a
          href="https://magland.github.io/neurosift-blog/doc/contributing_neurosift_compute"
          target="_blank"
          rel="noreferrer"
        >
          How to contribute compute resources to Neurosift
        </a>
      </p>
      <SelectDandisetComponent
        dandisetId={dandisetId}
        setDandisetId={onSetDandisetId}
      />
      <JobsView
        serviceName="neurosift"
        tags={tags}
        allowDeleteJobs={false}
        onSelectedJobIdsChanged={setSelectedJobIds}
      />
    </div>
  );
};

type SelectDandisetComponentProps = {
  dandisetId: string | undefined;
  setDandisetId: (dandisetId: string) => void;
};

const SelectDandisetComponent: FunctionComponent<
  SelectDandisetComponentProps
> = ({ dandisetId, setDandisetId }) => {
  const [internalDandisetId, setInternalDandisetId] = useState<string>("");
  useEffect(() => {
    setInternalDandisetId(dandisetId || "");
  }, [dandisetId]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      setDandisetId(internalDandisetId);
    }
  };

  return (
    <div>
      <input
        value={internalDandisetId}
        onChange={(e) => setInternalDandisetId(e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <button onClick={() => setDandisetId(internalDandisetId)}>
        Select Dandiset
      </button>
    </div>
  );
};

export default ComputePage;
