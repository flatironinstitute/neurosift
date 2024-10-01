import { FunctionComponent, useEffect, useState } from "react";
import { useDandisetVersionInfo, useQueryDandiset } from "./DandisetView";
import useRoute from "app/useRoute";
import { DandisetSearchResultItem } from "./types";
import { Hyperlink } from "@fi-sci/misc";
import {
  applicationBarColorDarkened,
  formatTime,
} from "app/pages/DandiPage/DandiBrowser/SearchResults";
import formatByteCount from "./formatByteCount";
import { EmbeddingClient } from "NwbchatClient/NwbchatClient";

type SimilarDandisetsViewProps = {
  dandisetId: string;
};

let globalEmbeddings:
  | {
      [dandisetId: string]: {
        [modelName: string]: number[];
      };
    }
  | null
  | undefined = undefined;
let loadingEmbeddings = false;

export const loadEmbeddings = async () => {
  while (loadingEmbeddings) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (globalEmbeddings) {
    return globalEmbeddings;
  }
  if (globalEmbeddings === null) {
    return null;
  }
  loadingEmbeddings = true;
  try {
    const url =
      "https://raw.githubusercontent.com/magland/ai_generated_dandiset_summaries/refs/heads/main/embeddings.json";
    const response = await fetch(url);
    globalEmbeddings = await response.json();
  } catch (err) {
    console.error("Problem loading embeddings");
    console.error(err);
    globalEmbeddings = null;
  }
  loadingEmbeddings = false;
  return globalEmbeddings;
};

const modelName = "text-embedding-3-large";

const SimilarDandisetsView: FunctionComponent<SimilarDandisetsViewProps> = ({
  dandisetId,
}) => {
  const [orderedDandisets, setOrderedDandisets] = useState<
    string[] | undefined | null
  >(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    let canceled = false;
    (async () => {
      setOrderedDandisets(undefined);
      setErrorMessage(null);
      const embeddings = await loadEmbeddings();
      if (canceled) return;
      if (embeddings === null) {
        setOrderedDandisets(null);
        return;
      }
      if (embeddings === undefined) {
        setOrderedDandisets(undefined);
        return;
      }
      const thisEmbedding = (embeddings[dandisetId] || {})[modelName];
      if (!thisEmbedding) {
        setErrorMessage("Embedding not found for this dandiset");
        setOrderedDandisets(null);
        return;
      }
      const dandisetIds = findSimilarDandisetIds(
        embeddings,
        thisEmbedding,
        modelName,
      );
      setOrderedDandisets(dandisetIds);
    })();
    return () => {
      canceled = true;
    };
  }, [dandisetId]);

  return (
    <div>
      <h3>Similar dandisets</h3>
      {orderedDandisets === undefined ? (
        <div>Loading...</div>
      ) : orderedDandisets === null ? (
        <div>Problem loading embeddings: {errorMessage}</div>
      ) : (
        <div>
          {orderedDandisets.slice(0, 6).map((dandisetId2) => (
            <SimilarDandisetView key={dandisetId2} dandisetId={dandisetId2} />
          ))}
        </div>
      )}
    </div>
  );
};

export const computeEmbeddingForAbstractText = async (
  abstractText: string,
  modelName: string,
): Promise<number[]> => {
  const client = new EmbeddingClient({ verbose: true });
  const embedding = await client.embedding(abstractText, modelName);
  return embedding.embedding;
};

export const findSimilarDandisetIds = (
  embeddings: { [dandisetId: string]: { [modelName: string]: number[] } },
  embedding: number[],
  modelName: string,
) => {
  const similarities: { dandisetId: string; similarity: number }[] = [];
  for (const dandisetId in embeddings) {
    const embedding2 = embeddings[dandisetId][modelName];
    if (!embedding2) continue;
    const similarity = cosineSimilarity(embedding, embedding2);
    similarities.push({ dandisetId, similarity });
  }
  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.map((s) => s.dandisetId);
};

const cosineSimilarity = (a: number[], b: number[]) => {
  let sum = 0;
  let sum_a = 0;
  let sum_b = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
    sum_a += a[i] * a[i];
    sum_b += b[i] * b[i];
  }
  return sum / Math.sqrt(sum_a) / Math.sqrt(sum_b);
};

type SimilarDandisetViewProps = {
  dandisetId: string;
};

export const SimilarDandisetView: FunctionComponent<
  SimilarDandisetViewProps
> = ({ dandisetId }) => {
  const { route, setRoute } = useRoute();
  if (route.page !== "dandiset" && route.page !== "dandi-query")
    throw Error("Unexpected page: " + route.page);
  const { staging } = route;
  const dandisetResponse: DandisetSearchResultItem | null = useQueryDandiset(
    dandisetId,
    staging,
  );
  const X = useDandisetVersionInfo(dandisetId, "", staging, dandisetResponse);
  if (!X) return <div>Loading {dandisetId}</div>;
  return (
    <div style={{ padding: 10, borderBottom: "solid 1px #ccc" }}>
      <div style={{ fontSize: 18, fontWeight: "bold" }}>
        <Hyperlink
          color={applicationBarColorDarkened}
          onClick={() => {
            setRoute({ page: "dandiset", dandisetId, staging });
          }}
        >
          {/* {identifier} ({X.version}): {X.name} */}
          {dandisetId}: {X.name}
        </Hyperlink>
      </div>
      <div style={{ fontSize: 14, color: "#666" }}>
        Contact: {X.contact_person}
      </div>
      <div style={{ fontSize: 14, color: "#666" }}>
        Created {formatTime(X.created)} | Modified {formatTime(X.modified)}
      </div>
      {X && (
        <div style={{ fontSize: 14, color: "#666" }}>
          {X.asset_count} assets, {formatByteCount(X.size)}, status: {X.status}
        </div>
      )}
    </div>
  );
};

export default SimilarDandisetsView;
