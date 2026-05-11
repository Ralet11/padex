import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authAPI, matchesAPI, ratingsAPI } from '../services/api';
import {
  toActivityVM,
  toFeedVM,
  toFeedPreviewVM,
  toHighlightsVM,
  toHeroVM,
  toHistoryVM,
  toHistoryTabVM,
  toInfoVM,
  toProfileShellVM,
  toSocialVM,
} from './profile/profileMappers';

const ProfileContext = createContext(null);

const BLOCKS = ['identity', 'ratings', 'matches'];

const EMPTY_LOADING = {
  identity: false,
  ratings: false,
  matches: false,
};

const EMPTY_ERROR = {
  identity: null,
  ratings: null,
  matches: null,
};

function getErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

function setBlockState(setter, block, value) {
  setter((prev) => ({
    ...prev,
    [block]: value,
  }));
}

/**
 * @typedef {'identity'|'ratings'|'matches'} ProfileBlock
 */

/**
 * @typedef {{
 *   identity: boolean,
 *   ratings: boolean,
 *   matches: boolean,
 * }} LoadingByBlock
 */

/**
 * @typedef {{
 *   identity: string | null,
 *   ratings: string | null,
 *   matches: string | null,
 * }} ErrorByBlock
 */

/**
 * @typedef {{
 *   identity: Object | null,
 *   ratings: Object | null,
 *   matches: Array<Object>,
 *   loadingByBlock: LoadingByBlock,
 *   errorByBlock: ErrorByBlock,
 *   heroVM: Object,
 *   shellVM: Object,
 *   infoVM: Object,
 *   socialVM: Object,
 *   highlightsVM: Object,
 *   feedPreviewVM: Object,
 *   feedVM: Object,
 *   activityVM: Object,
 *   historyVM: Object,
 *   historyTabVM: Object,
 *   refreshAll: () => Promise<void>,
 *   retryBlock: (block: ProfileBlock) => Promise<void>,
 * }} ProfileState
 */

export function ProfileProvider({ children }) {
  const [identity, setIdentity] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loadingByBlock, setLoadingByBlock] = useState(EMPTY_LOADING);
  const [errorByBlock, setErrorByBlock] = useState(EMPTY_ERROR);

  const fetchIdentity = useCallback(async () => {
    setBlockState(setLoadingByBlock, 'identity', true);
    setBlockState(setErrorByBlock, 'identity', null);

    try {
      const response = await authAPI.me();
      const user = response?.data?.user || null;
      setIdentity(user);
      return user;
    } catch (error) {
      setBlockState(setErrorByBlock, 'identity', getErrorMessage(error, 'No se pudo cargar tu identidad'));
      return null;
    } finally {
      setBlockState(setLoadingByBlock, 'identity', false);
    }
  }, []);

  const fetchRatings = useCallback(async (userId) => {
    if (!userId) {
      setRatings(null);
      setBlockState(setErrorByBlock, 'ratings', 'No hay usuario para consultar rating');
      setBlockState(setLoadingByBlock, 'ratings', false);
      return null;
    }

    setBlockState(setLoadingByBlock, 'ratings', true);
    setBlockState(setErrorByBlock, 'ratings', null);

    try {
      const response = await ratingsAPI.get(userId);
      const ratingData = {
        avg_score: Number(response?.data?.avg_score ?? 0),
        total: Number(response?.data?.total ?? 0),
      };
      setRatings(ratingData);
      return ratingData;
    } catch (error) {
      setRatings(null);
      setBlockState(setErrorByBlock, 'ratings', getErrorMessage(error, 'No se pudo cargar el rating'));
      return null;
    } finally {
      setBlockState(setLoadingByBlock, 'ratings', false);
    }
  }, []);

  const fetchMatches = useCallback(async () => {
    setBlockState(setLoadingByBlock, 'matches', true);
    setBlockState(setErrorByBlock, 'matches', null);

    try {
      const response = await matchesAPI.my();
      const list = Array.isArray(response?.data?.matches) ? response.data.matches : [];
      setMatches(list);
      return list;
    } catch (error) {
      setMatches([]);
      setBlockState(setErrorByBlock, 'matches', getErrorMessage(error, 'No se pudo cargar la actividad'));
      return [];
    } finally {
      setBlockState(setLoadingByBlock, 'matches', false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    const [identityData] = await Promise.all([fetchIdentity(), fetchMatches()]);

    const userId = identityData?.id;
    await fetchRatings(userId);
  }, [fetchIdentity, fetchMatches, fetchRatings]);

  /**
   * @param {ProfileBlock} block
   */
  const retryBlock = useCallback(async (block) => {
    if (!BLOCKS.includes(block)) return;

    if (block === 'identity') {
      const nextIdentity = await fetchIdentity();
      const userId = nextIdentity?.id || identity?.id;
      if (userId) {
        await fetchRatings(userId);
      }
      return;
    }

    if (block === 'ratings') {
      const userId = identity?.id || (await fetchIdentity())?.id;
      await fetchRatings(userId);
      return;
    }

    await fetchMatches();
  }, [fetchIdentity, fetchMatches, fetchRatings, identity?.id]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const heroVM = useMemo(
    () => toHeroVM({ identity, ratings, matches }),
    [identity, ratings, matches]
  );

  const shellVM = useMemo(
    () => toProfileShellVM({ identity, ratings, matches }),
    [identity, ratings, matches]
  );
  const infoVM = useMemo(() => toInfoVM(identity), [identity]);
  const socialVM = useMemo(() => toSocialVM(identity), [identity]);
  const highlightsVM = useMemo(
    () => toHighlightsVM({ identity, ratings, matches }),
    [identity, ratings, matches]
  );
  const feedPreviewVM = useMemo(() => toFeedPreviewVM(matches), [matches]);
  const feedVM = useMemo(
    () => toFeedVM({ identity, ratings, matches, highlights: highlightsVM }),
    [highlightsVM, identity, matches, ratings]
  );
  const activityVM = useMemo(
    () => toActivityVM({ identity, ratings, matches }),
    [identity, matches, ratings]
  );
  const historyTabVM = useMemo(() => toHistoryTabVM(matches), [matches]);
  const historyVM = useMemo(() => toHistoryVM(matches), [matches]);

  const value = useMemo(
    () => ({
      identity,
      ratings,
      matches,
      loadingByBlock,
      errorByBlock,
      heroVM,
      shellVM,
      infoVM,
      socialVM,
      highlightsVM,
      feedPreviewVM,
      feedVM,
      activityVM,
      historyVM,
      historyTabVM,
      refreshAll,
      retryBlock,
    }),
    [
      activityVM,
      errorByBlock,
      feedVM,
      feedPreviewVM,
      heroVM,
      highlightsVM,
      historyVM,
      historyTabVM,
      identity,
      infoVM,
      loadingByBlock,
      matches,
      ratings,
      refreshAll,
      retryBlock,
      shellVM,
      socialVM,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile debe usarse dentro de ProfileProvider');
  }

  return context;
}
