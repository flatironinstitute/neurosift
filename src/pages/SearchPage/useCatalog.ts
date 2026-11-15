import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchNeurodataTypesIndex,
  type NeurodataTypesIndex,
} from "../DandiPage/fetchNeurodataTypesIndex";
import {
  dandiSearch,
  exactId,
  openNeuroSearch,
  PAGE,
  semanticSearch,
  typesSearch,
} from "./archiveSources";
import {
  CatalogFeed,
  type Archive,
  type CatalogItem,
  type Order,
  type Source,
} from "./catalogFeed";

export type Mode = "basic" | "semantic" | "types";

export type CatalogQuery = {
  query: string;
  archives: Archive[];
  mode: Mode;
  types: string[];
  order: Order;
};

export type CatalogState = {
  items: CatalogItem[];
  totals: Partial<Record<Archive, number>>;
  loading: boolean;
  /** Reading the next 25, with the earlier ones still shown. */
  loadingMore: boolean;
  exhausted: boolean;
  failed: Archive[];
  /** Search by meaning didn't answer. */
  semanticError?: string;
};

const EMPTY: CatalogState = {
  items: [],
  totals: {},
  loading: false,
  loadingMore: false,
  exhausted: true,
  failed: [],
};

function sourcesFor(q: CatalogQuery, index?: NeurodataTypesIndex): Source[] {
  if (q.mode === "semantic") return q.query ? [semanticSearch(q.query)] : [];
  if (q.mode === "types")
    return index && q.types.length > 0 ? [typesSearch(index, q.types)] : [];
  return q.archives.flatMap((archive): Source[] => {
    if (archive === "OpenNeuro") return [openNeuroSearch(q.query, q.order)];
    const exact = exactId(archive, q.query);
    return [...(exact ? [exact] : []), dandiSearch(archive, q.query, q.order)];
  });
}

/** The neurodata types index, read once it's needed. */
export function useTypesIndex(enabled: boolean) {
  const [index, setIndex] = useState<NeurodataTypesIndex>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled || index) return;
    fetchNeurodataTypesIndex().then(
      (data) => {
        if (data) setIndex(data);
        else setFailed(true);
      },
      () => setFailed(true),
    );
  }, [enabled, index]);
  return { index, failed };
}

/** Searches the picked archives and merges their results, 25 at a time. */
export function useCatalog(q: CatalogQuery, index?: NeurodataTypesIndex) {
  const [state, setState] = useState<CatalogState>(EMPTY);
  const feed = useRef<CatalogFeed>();
  const run = useRef(0);
  const key = JSON.stringify(q);

  const snapshot = (f: CatalogFeed, items: CatalogItem[]): CatalogState => ({
    items,
    totals: f.totals(),
    loading: false,
    loadingMore: false,
    exhausted: f.exhausted(),
    failed: f.failed(),
  });

  const search = useCallback(async () => {
    const id = ++run.current;
    const sources = sourcesFor(q, index);
    const f = new CatalogFeed(sources, q.order);
    feed.current = f;
    setState((s) => ({
      ...EMPTY,
      totals: s.totals,
      loading: sources.length > 0,
    }));
    try {
      const items = await f.more(PAGE);
      if (id === run.current) setState(snapshot(f, items));
    } catch (error) {
      if (id === run.current)
        setState({ ...EMPTY, semanticError: String(error) });
    }
    // q is compared through its key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, index]);

  useEffect(() => {
    search();
  }, [search]);

  const more = async () => {
    const f = feed.current;
    if (!f) return;
    const id = run.current;
    setState((s) => ({ ...s, loadingMore: true }));
    const next = await f.more(PAGE);
    if (id === run.current) setState((s) => snapshot(f, [...s.items, ...next]));
  };

  return { ...state, more, retry: search };
}
