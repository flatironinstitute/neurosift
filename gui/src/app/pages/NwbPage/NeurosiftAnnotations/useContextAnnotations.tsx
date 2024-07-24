/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FunctionComponent,
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import useNeurosiftAnnotations from "../../../NeurosiftAnnotations/useNeurosiftAnnotations";
import { useDandiAssetContext } from "../DandiAssetContext";
import {
  AddAnnotationRequest,
  DeleteAnnotationRequest,
  GetAnnotationsRequest,
  NeurosiftAnnotation,
  isGetAnnotationsResponse,
} from "./types";

type ContextAnnotationsContextType = {
  contextAnnotations?: NeurosiftAnnotation[];
  refreshContextAnnotations: () => void;
  addContextAnnotation: (
    annotationType: string,
    annotation: any,
  ) => Promise<void>;
  removeContextAnnotation: (id: string) => Promise<void>;
};

const defaultContextAnnotationsContext: ContextAnnotationsContextType = {
  contextAnnotations: undefined,
  refreshContextAnnotations: () => {
    throw new Error("refreshContextAnnotations not implemented");
  },
  addContextAnnotation: (annotationType: string, annotation: any) => {
    throw new Error("addContextAnnotation not implemented");
  },
  removeContextAnnotation: (id: string) => {
    throw new Error("removeContextAnnotation not implemented");
  },
};

const ContextAnnotationsContext = createContext<ContextAnnotationsContextType>(
  defaultContextAnnotationsContext,
);

export const useContextAnnotations = () => {
  const cc = useContext(ContextAnnotationsContext);
  return {
    contextAnnotations: cc.contextAnnotations,
    refreshContextAnnotations: cc.refreshContextAnnotations,
    addContextAnnotation: cc.addContextAnnotation,
    removeContextAnnotation: cc.removeContextAnnotation,
  };
};

export const neurosiftAnnotationsApiUrl =
  "https://neurosift-annotations.vercel.app";
// const neurosiftAnnotationsApiUrl = 'http://localhost:3000'

type SetupContextAnnotationsProviderProps = {
  //
};

export const SetupContextAnnotationsProvider: FunctionComponent<
  PropsWithChildren<SetupContextAnnotationsProviderProps>
> = ({ children }) => {
  const [contextAnnotations, setContextAnnotations] = useState<
    NeurosiftAnnotation[] | undefined
  >(undefined);
  const { neurosiftAnnotationsAccessToken, neurosiftAnnotationsUserId } =
    useNeurosiftAnnotations();
  const { dandisetId, dandisetVersion, assetId, assetPath } =
    useDandiAssetContext();

  const fetchContextAnnotations = useMemo(
    () => async (): Promise<NeurosiftAnnotation[]> => {
      const url = `${neurosiftAnnotationsApiUrl}/api/getAnnotations`;
      const req: GetAnnotationsRequest = {
        dandiInstanceName: "dandi",
        dandisetId,
        assetId: assetId ? assetId : "<undefined>", // query for those that are not associated with any asset
      };
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
      });
      if (r.status !== 200) {
        console.error("Error fetching annotations", r);
        return [];
      }
      const data = await r.json();
      if (!isGetAnnotationsResponse(data)) {
        console.warn(data);
        console.error("Unexpected response");
        return [];
      }
      const annotations: NeurosiftAnnotation[] = data.annotations;
      return annotations.sort(
        (a, b) => a.timestampCreated - b.timestampCreated,
      );
    },
    [assetId, dandisetId],
  );

  const refreshContextAnnotations = useCallback(async () => {
    // don't flicker
    // setContextAnnotations(undefined)
    const a = await fetchContextAnnotations();
    setContextAnnotations(a);
  }, [fetchContextAnnotations]);

  const addContextAnnotation = useCallback(
    async (annotationType: string, annotation: any) => {
      if (!neurosiftAnnotationsAccessToken) {
        console.warn(
          "Cannot setContextAnnotations because neurosiftAnnotationsAccessToken is not set",
        );
        return;
      }
      if (!neurosiftAnnotationsUserId) {
        console.warn(
          "Cannot setContextAnnotations because neurosiftAnnotationsUserId is not set",
        );
        return;
      }
      if (!dandisetId) {
        console.warn(
          "Cannot setContextAnnotations because dandisetId is not set",
        );
        return;
      }
      const url = `${neurosiftAnnotationsApiUrl}/api/addAnnotation`;
      const req: AddAnnotationRequest = {
        userId: neurosiftAnnotationsUserId,
        annotationType,
        dandiInstanceName: "dandi",
        dandisetId,
        dandisetVersion,
        assetPath,
        assetId,
        annotation,
      };
      const rr = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${neurosiftAnnotationsAccessToken}`,
        },
        body: JSON.stringify(req),
      });
      if (rr.status !== 200) {
        console.warn("Error setting annotation", rr);
        throw Error("Error setting annotation");
      }
      const data = await rr.json();
      console.log(data);
      refreshContextAnnotations();
    },
    [
      neurosiftAnnotationsAccessToken,
      dandisetId,
      assetId,
      assetPath,
      neurosiftAnnotationsUserId,
      refreshContextAnnotations,
      dandisetVersion,
    ],
  );

  const removeContextAnnotation = useCallback(
    async (id: string) => {
      if (!neurosiftAnnotationsAccessToken) {
        console.warn(
          "Cannot setContextAnnotations because neurosiftAnnotationsAccessToken is not set",
        );
        return;
      }
      const url = `${neurosiftAnnotationsApiUrl}/api/deleteAnnotation`;
      const req: DeleteAnnotationRequest = {
        annotationId: id,
      };
      const rr = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${neurosiftAnnotationsAccessToken}`,
        },
        body: JSON.stringify(req),
      });
      if (rr.status !== 200) {
        console.warn("Error setting annotation", rr);
        throw Error("Error setting annotation");
      }
      const data = await rr.json();
      console.log(data);
      refreshContextAnnotations();
    },
    [neurosiftAnnotationsAccessToken, refreshContextAnnotations],
  );

  useEffect(() => {
    refreshContextAnnotations();
  }, [refreshContextAnnotations]);
  return (
    <ContextAnnotationsContext.Provider
      value={{
        contextAnnotations: contextAnnotations,
        refreshContextAnnotations: refreshContextAnnotations,
        addContextAnnotation: addContextAnnotation,
        removeContextAnnotation: removeContextAnnotation,
      }}
    >
      {children}
    </ContextAnnotationsContext.Provider>
  );
};

export default useContextAnnotations;
