import { FunctionComponent, useEffect, useMemo } from "react";
import { NeurosiftAnnotationsLoginView } from "../../../ApiKeysWindow/ApiKeysWindow";
import useNeurosiftAnnotations from "../../../NeurosiftAnnotations/useNeurosiftAnnotations";
import { NeurosiftAnnotation } from "../NeurosiftAnnotations/types";
import useContextAnnotations from "../NeurosiftAnnotations/useContextAnnotations";

type NeurosiftAnnotationsViewProps = {
  width: number;
  height: number;
};

const NeurosiftAnnotationsView: FunctionComponent<
  NeurosiftAnnotationsViewProps
> = ({ width, height }) => {
  const { neurosiftAnnotationsUserId } = useNeurosiftAnnotations();
  const { contextAnnotations, refreshContextAnnotations } =
    useContextAnnotations();
  useEffect(() => {
    refreshContextAnnotations();
  }, [refreshContextAnnotations]);
  const itemPathsWithAnnotations = useMemo(() => {
    if (!contextAnnotations) return [];
    const paths: string[] = contextAnnotations.map(
      (a: NeurosiftAnnotation) => a.annotation.path,
    );
    return [...new Set(paths)].sort();
  }, [contextAnnotations]);
  const padding = 10;
  const dividingCharacter = "•";
  return (
    <div
      style={{
        position: "absolute",
        width: width - padding * 2,
        height: height - padding * 2,
        backgroundColor: "#eee",
        padding,
        overflowY: "auto",
      }}
    >
      <div>
        <p>Use neurosift-annotations to annotate this NWB file.</p>
      </div>
      <NeurosiftAnnotationsLoginView
        onClose={undefined}
        onLoggedIn={undefined}
      />
      <hr />
      {neurosiftAnnotationsUserId && (
        <div>
          <p>
            You can add a top-level note for this file (see icon on left panel),
            or add notes to individual neurodata objects.
          </p>
        </div>
      )}
      {
        <span>
          {contextAnnotations && (
            <div>
              <p>
                This file has {contextAnnotations.length}{" "}
                {contextAnnotations.length === 1 ? "annotation" : "annotations"}
                .
              </p>
            </div>
          )}
          {itemPathsWithAnnotations.length > 0 && (
            <div>
              The following neurodata objects have
              annotations:&nbsp;&nbsp;&nbsp;
              {itemPathsWithAnnotations.map((p, i) => (
                <span key={p}>
                  <span style={{ color: "darkblue", fontFamily: "monospace" }}>
                    {p !== "/" ? p : "top-level"}
                  </span>
                  &nbsp;
                  {i < itemPathsWithAnnotations.length - 1
                    ? dividingCharacter
                    : ""}
                  &nbsp;
                </span>
              ))}
            </div>
          )}
        </span>
      }
    </div>
  );
};

export default NeurosiftAnnotationsView;
