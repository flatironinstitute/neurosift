import { useCallback } from "react";
import {
  NavigateOptions,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

// React Router resolves a search-only destination ("?a=b") with an empty hash;
// these keep whatever hash the address has when only the search params change.
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
