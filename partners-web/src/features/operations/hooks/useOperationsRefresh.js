import { useCallback, useState } from 'react';

export function useOperationsRefresh(action) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async (...args) => {
    setIsRefreshing(true);
    try {
      return await action?.(...args);
    } finally {
      setIsRefreshing(false);
    }
  }, [action]);

  return { isRefreshing, refresh };
}
