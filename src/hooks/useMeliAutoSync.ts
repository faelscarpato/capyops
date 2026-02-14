import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { meliProcessWorker, meliSyncOrders } from '../lib/meliApi';
import { queryKeys } from '../lib/queryKeys';

export function useMeliAutoSync() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const syncEnabled = window.localStorage.getItem('meli_auto_sync') !== 'false';
    setEnabled(syncEnabled);

    function onStorage(event: StorageEvent) {
      if (event.key !== 'meli_auto_sync') return;
      setEnabled(event.newValue !== 'false');
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return useQuery({
    queryKey: queryKeys.meli.autoSync(),
    enabled,
    queryFn: async () => {
      await meliSyncOrders();
      await meliProcessWorker();
      return true;
    },
    staleTime: 0,
    refetchInterval: enabled ? 12 * 60 * 1000 : false,
    refetchOnWindowFocus: false
  });
}
