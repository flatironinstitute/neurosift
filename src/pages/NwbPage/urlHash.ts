import { useCallback } from "react";
import {
  NavigateOptions,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

// React Router resolves a search-only destination ("?a=b") with an empty hash,
// so every navigation that merely rewrites the search params silently drops the
// URL hash. Several views persist their state there (the PSTH and Event Related
// Signal views) with a raw history.replaceState, which the router never sees, so
// the router's own location.hash is not a usable copy of it either. The live
// value in window.location is, so carry that along on those navigations.
export const currentUrlHash = (): string =>
  typeof window === "undefined" ? "" : window.location.hash;

// A react-router destination for the given search params that keeps the hash.
export const toWithCurrentHash = (params: URLSearchParams | string): string => {
  const search = typeof params === "string" ? params : params.toString();
  return `?${search}${currentUrlHash()}`;
};

type SearchParamsInit = URLSearchParams | string;
type SetSearchParams = (
  nextInit: SearchParamsInit | ((prev: URLSearchParams) => SearchParamsInit),
  navigateOptions?: NavigateOptions,
) => void;

// A drop-in replacement for the setter from useSearchParams that preserves the
// URL hash. Same semantics otherwise: the functional form is given the router's
// current params, and the identity changes with them.
export const useSetSearchParamsKeepingHash = (): SetSearchParams => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  return useCallback(
    (nextInit, navigateOptions) => {
      const next =
        typeof nextInit === "function"
          ? nextInit(new URLSearchParams(searchParams))
          : nextInit;
      navigate(toWithCurrentHash(new URLSearchParams(next)), navigateOptions);
    },
    [navigate, searchParams],
  );
};
