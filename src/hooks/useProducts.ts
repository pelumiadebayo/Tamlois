import { useCallback, useEffect, useState } from "react";
import { commerceProvider } from "../commerce/provider";
import type { TamloisProduct } from "../types";

export function useProducts() {
  const [products, setProducts] = useState<TamloisProduct[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async () => {
    setState("loading");
    try {
      setProducts(await commerceProvider.listPublicProducts());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => void load(), [load]);
  return { products, state, retry: load, isDemo: commerceProvider.isDemo };
}
