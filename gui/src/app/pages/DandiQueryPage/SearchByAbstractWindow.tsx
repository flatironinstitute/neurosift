import { VBoxLayout } from "@fi-sci/misc";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  computeEmbeddingForAbstractText,
  findSimilarDandisetIds,
  loadEmbeddings,
  SimilarDandisetView,
} from "../DandisetPage/DandisetViewFromDendro/SimilarDandisetsView";

type SearchByAbstractWindowProps = {
  width: number;
  height: number;
};

type Embeddings = {
  [dandisetId: string]: {
    [modelName: string]: number[];
  };
};

const SearchByAbstractWindow: FunctionComponent<
  SearchByAbstractWindowProps
> = ({ width, height }) => {
  const [abstractText, setAbstractText] = useState<string>("");
  const [similarDandisetIds, setSimilarDandisetIds] = useState<
    string[] | undefined | null
  >(undefined);

  const [searching, setSearching] = useState<boolean>(false);

  const heights = useMemo(() => [height / 2, height / 2], [height]);

  const [embeddings, setEmbeddings] = useState<Embeddings | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let canceled = false;
    (async () => {
      setEmbeddings(undefined);
      const x = await loadEmbeddings();
      if (canceled) return;
      setEmbeddings(x);
    })();
    return () => {
      canceled = true;
    };
  }, []);

  const handleSearch = useCallback(async () => {
    if (!embeddings) return;
    if (searching) return;
    setSearching(true);
    try {
      setSimilarDandisetIds(undefined);
      const modelName = "text-embedding-3-large";
      const embedding = await computeEmbeddingForAbstractText(
        abstractText,
        modelName,
      );
      const dandisetIds = findSimilarDandisetIds(
        embeddings,
        embedding,
        modelName,
      );
      setSimilarDandisetIds(dandisetIds);
    } finally {
      setSearching(false);
    }
  }, [abstractText, embeddings, searching]);

  return (
    <VBoxLayout width={width} heights={heights}>
      <div>
        <div>Paste in abstract or description to find relevant Dandisets</div>
        <textarea
          style={{
            width: width - 20,
            height: heights[0] - 50,
          }}
          value={abstractText}
          onChange={(e) => setAbstractText(e.target.value)}
        />
        <button onClick={handleSearch} disabled={!embeddings || searching}>
          Search
        </button>
        &nbsp;
        {searching && <span>Searching...</span>}
        {embeddings === undefined && <div>Loading embeddings...</div>}
        {embeddings === null && <div>Problem loading embeddings</div>}
      </div>
      <div
        style={{
          width: width - 20,
          height: heights[1] - 20,
          overflowY: "auto",
        }}
      >
        {similarDandisetIds === undefined && <span />}
        {similarDandisetIds === null && (
          <div>Problem finding similar Dandisets</div>
        )}
        {similarDandisetIds && (
          <div>
            {similarDandisetIds.slice(0, 20).map((dandisetId) => (
              <SimilarDandisetView key={dandisetId} dandisetId={dandisetId} />
            ))}
          </div>
        )}
      </div>
    </VBoxLayout>
  );
};

export default SearchByAbstractWindow;
