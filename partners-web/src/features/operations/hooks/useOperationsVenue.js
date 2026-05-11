import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/runtime';
import { useOperationsRefresh } from './useOperationsRefresh';

export function useOperationsVenue(options = {}) {
  const { venue, error, onRefresh, user } = options;
  const [managedVenue, setManagedVenue] = useState(venue ?? null);
  const [managedError, setManagedError] = useState(error ?? null);
  const [isLoadingVenue, setIsLoadingVenue] = useState(false);

  const hasBootstrapContext = Object.prototype.hasOwnProperty.call(options, 'user');

  const bootstrapVenue = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoadingVenue(true);
    try {
      const response = await api.get('/partners/venue');
      setManagedVenue(response.data.venue);
      setManagedError(null);
      return response.data.venue;
    } catch (err) {
      console.error('No venue found or error', err);
      setManagedVenue((currentVenue) => currentVenue ?? null);
      setManagedError(err);
      return null;
    } finally {
      if (!silent) setIsLoadingVenue(false);
    }
  }, []);

  useEffect(() => {
    if (!hasBootstrapContext) return;

    if (user?.role === 'partner') {
      bootstrapVenue();
      return;
    }

    setManagedVenue(null);
    setManagedError(null);
    setIsLoadingVenue(false);
  }, [bootstrapVenue, hasBootstrapContext, user]);

  useEffect(() => {
    if (hasBootstrapContext) return;
    setManagedVenue(venue ?? null);
    setManagedError(error ?? null);
  }, [error, hasBootstrapContext, venue]);

  const { isRefreshing, refresh } = useOperationsRefresh(onRefresh);

  if (hasBootstrapContext) {
    return {
      venue: managedVenue,
      venueError: managedError,
      isLoadingVenue,
      refreshVenue: bootstrapVenue,
      isRefreshingVenue: false,
      courts: Array.isArray(managedVenue?.Courts) ? managedVenue.Courts : [],
    };
  }

  return {
    venue: managedVenue,
    venueError: managedError,
    isLoadingVenue,
    isRefreshingVenue: isRefreshing,
    refreshVenue: refresh,
    courts: Array.isArray(managedVenue?.Courts) ? managedVenue.Courts : [],
  };
}
