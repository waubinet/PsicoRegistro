import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { Entity } from "./api";

export function useEntities(table: string, filters?: [string, string][]) {
  const [items, setItems] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(filters ?? []);

  const reload = useCallback(() => {
    setLoading(true);
    api
      .list(table, filters)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, key]);

  useEffect(reload, [reload]);
  return { items, loading, reload };
}
