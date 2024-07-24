/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { Add, Delete } from "@mui/icons-material";
import { FunctionComponent, useCallback, useMemo } from "react";
import useNeurosiftAnnotations from "../../../NeurosiftAnnotations/useNeurosiftAnnotations";
import { NeurosiftAnnotation } from "../NeurosiftAnnotations/types";
import useContextAnnotations from "../NeurosiftAnnotations/useContextAnnotations";
import UserIdComponent from "./UserIdComponent";

type ObjectAnalysesViewProps = {
  objectPath?: string;
  onClose: () => void;
};

const ObjectAnalysesView: FunctionComponent<ObjectAnalysesViewProps> = ({
  objectPath,
}) => {
  const { neurosiftAnnotationsUserId } = useNeurosiftAnnotations();
  const { contextAnnotations, addContextAnnotation, removeContextAnnotation } =
    useContextAnnotations();
  const fiddleAnnotationsForThisObject = useMemo(() => {
    if (!contextAnnotations) return undefined;
    const fiddleAnnotations = contextAnnotations.filter(
      (a) =>
        a.annotationType === "jpfiddle" &&
        (!objectPath || a.annotation.objectPath === objectPath),
    );
    return fiddleAnnotations;
  }, [contextAnnotations, objectPath]);

  const fiddleAnnotationsForThisObjectForCurrentUser = useMemo(() => {
    if (!fiddleAnnotationsForThisObject) return undefined;
    const ret: NeurosiftAnnotation[] = fiddleAnnotationsForThisObject.filter(
      (n) => n.userId === neurosiftAnnotationsUserId,
    );
    return ret;
  }, [fiddleAnnotationsForThisObject, neurosiftAnnotationsUserId]);

  const handleAddAnalysis = useCallback(async () => {
    const jpfiddleUrl = prompt("Enter the jpfiddle URL for the analysis");
    if (!jpfiddleUrl) return;
    const { fiddleUri, fiddleTitle } = parseFiddleUrl(jpfiddleUrl);
    if (!fiddleUri) return;
    const annotation = {
      objectPath,
      fiddleUri,
      fiddleTitle,
    };
    await addContextAnnotation("jpfiddle", annotation);
  }, [addContextAnnotation, objectPath]);

  if (!contextAnnotations) return <span />;
  return (
    <div>
      {neurosiftAnnotationsUserId ? (
        <>
          <h3>WARNING: This is an experimental feature.</h3>
          <h3>WARNING: All annotations are public.</h3>
          <h3>
            {!objectPath ? (
              <span>
                Analyses for{" "}
                <UserIdComponent userId={neurosiftAnnotationsUserId} />
              </span>
            ) : objectPath !== "/" ? (
              <span>
                Analyses for {objectPath} for{" "}
                <UserIdComponent userId={neurosiftAnnotationsUserId} />
              </span>
            ) : (
              <span>
                Analyses for{" "}
                <UserIdComponent userId={neurosiftAnnotationsUserId} />
              </span>
            )}
          </h3>
          <div>
            {(fiddleAnnotationsForThisObjectForCurrentUser || []).map(
              (fiddleAnnotation) => (
                <div key={fiddleAnnotation.annotationId}>
                  <UserHeading userId={neurosiftAnnotationsUserId} />
                  <FiddleAnnotationView
                    annotation={fiddleAnnotation.annotation}
                    onRemove={async () => {
                      const ok = confirm(
                        "Are you sure you want to remove this analysis?",
                      );
                      if (!ok) return;
                      await removeContextAnnotation(
                        fiddleAnnotation.annotationId,
                      );
                    }}
                  />
                </div>
              ),
            )}
          </div>
          <div>
            <div>&nbsp;</div>
            <SmallIconButton
              icon={<Add />}
              title="Add analysis"
              onClick={handleAddAnalysis}
              label="Add analysis"
            />
          </div>
        </>
      ) : (
        <div>
          <p>
            To add an analysis, sign in using the ANNOTATIONS tab of an NWB
            view.
          </p>
        </div>
      )}
      <hr />
      <h3>
        {!objectPath ? (
          <span>
            Analyses {neurosiftAnnotationsUserId ? "from other users" : ""}
          </span>
        ) : objectPath !== "/" ? (
          <span>
            Analyses for {objectPath}{" "}
            {neurosiftAnnotationsUserId ? "from other users" : ""}
          </span>
        ) : (
          <span>
            Analyses {neurosiftAnnotationsUserId ? "from other users" : ""}
          </span>
        )}
      </h3>
      {(fiddleAnnotationsForThisObject || [])
        .filter((n) => n.userId !== neurosiftAnnotationsUserId)
        .map((fiddleAnnotation) => (
          <div key={fiddleAnnotation.annotationId}>
            <UserHeading userId={fiddleAnnotation.userId} />
            <FiddleAnnotationView
              annotation={fiddleAnnotation.annotation}
              onRemove={undefined}
            />
            <div>&nbsp;</div>
          </div>
        ))}
    </div>
  );
};

type UserHeadingProps = {
  userId: string;
};

const UserHeading: FunctionComponent<UserHeadingProps> = ({ userId }) => {
  return (
    <span style={{ fontWeight: "bold" }}>
      <UserIdComponent userId={userId} />
    </span>
  );
};

type FiddleAnnotationViewProps = {
  annotation: any;
  onRemove?: () => void;
};

export const FiddleAnnotationView: FunctionComponent<
  FiddleAnnotationViewProps
> = ({ annotation, onRemove }) => {
  const jpfiddleUrl = `https://jpfiddle.vercel.app/?f=${annotation.fiddleUri}&t=${annotation.fiddleTitle}`;
  return (
    <div>
      <Hyperlink
        title={
          annotation.fiddleTitle ||
          "Untitled analysis" + " - " + annotation.fiddleUri
        }
        href={jpfiddleUrl}
        target="_blank"
      >
        {annotation.fiddleTitle || "Untitled analysis"}
      </Hyperlink>
      &nbsp;
      <SmallIconButton
        icon={<Delete />}
        title="Remove analysis"
        onClick={onRemove}
      />
    </div>
  );
};

const parseFiddleUrl = (url: string) => {
  const urlObj = new URL(url);
  const fiddleUri = urlObj.searchParams.get("f") || "";
  const fiddleTitle = urlObj.searchParams.get("t") || "";
  return { fiddleUri, fiddleTitle };
};

export default ObjectAnalysesView;
