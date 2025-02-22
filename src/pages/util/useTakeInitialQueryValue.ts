import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

const useTakeInitialQueryParameter = (key: string) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialValue = useRef<string | null>(null);
  useEffect(() => {
    const t = searchParams.get(key);
    // after we get the initial tab, we clear it from the URL
    if (t) {
      initialValue.current = t;
      const p = new URLSearchParams(searchParams);
      p.delete(key);
      setSearchParams(p.toString());
    }
  }, [key, searchParams, setSearchParams]);
  return initialValue.current;
};

export default useTakeInitialQueryParameter;
