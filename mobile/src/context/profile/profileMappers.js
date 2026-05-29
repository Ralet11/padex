import { getRankByTier } from '../../utils/rankings';
import {
  getCompetitiveLosses,
  getCompetitiveTier,
  getCompetitiveWins,
  getProgressionPoints,
  getReputationRatingsCount,
  getReputationScore,
  getMatchState,
} from '../../utils/domain';

const FEED_PREVIEW_LIMIT = 3;
const HIGHLIGHTS_LIMIT = 5;
const HISTORY_TAB_LIMIT = 3;
const DEFAULT_TABS = [
  { key: 'feed', label: 'Feed', icon: 'grid' },
  { key: 'activity', label: 'Actividad', icon: 'activity' },
  { key: 'history', label: 'Historial', icon: 'clock' },
];

function asText(value) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value).trim();
}

function buildDateLabel(match) {
  if (!match?.date) return '';

  const dateTime = new Date(match.time ? `${match.date}T${match.time}` : match.date);
  if (Number.isNaN(dateTime.getTime())) return asText(match.date);

  return dateTime.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildDateTimestamp(match) {
  const value = new Date(match?.time ? `${match?.date}T${match?.time}` : match?.date || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function getFeedTitle(match) {
  const title = asText(match?.title);
  if (title) return title;

  const courtName = asText(match?.court_name);
  if (courtName) return `Partido en ${courtName}`;

  return 'Partido';
}

function formatCompactNumber(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '0';

  return new Intl.NumberFormat('es-AR', {
    notation: 'compact',
    maximumFractionDigits: amount >= 100 ? 0 : 1,
  }).format(amount);
}

function formatScore(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '0';
  return amount.toFixed(amount >= 10 ? 0 : 1);
}

function buildMatchOutcome(match) {
  const explicit = asText(match?.competitive_result || match?.result || match?.outcome).toLowerCase();
  if (explicit === 'win' || explicit === 'won' || explicit === 'victory') {
    return { key: 'win', label: 'Victoria', tone: 'success', icon: 'trending-up' };
  }

  if (explicit === 'loss' || explicit === 'lost' || explicit === 'defeat') {
    return { key: 'loss', label: 'Derrota', tone: 'muted', icon: 'trending-down' };
  }

  const state = getMatchState(match);
  if (state === 'completed') {
    return { key: 'completed', label: 'Resultado cargado', tone: 'default', icon: 'check-circle' };
  }

  if (state === 'cancelled') {
    return { key: 'cancelled', label: 'Cancelado', tone: 'danger', icon: 'slash' };
  }

  if (state === 'in_progress') {
    return { key: 'live', label: 'En juego', tone: 'accent', icon: 'activity' };
  }

  return { key: state || 'scheduled', label: 'Próximo partido', tone: 'accent', icon: 'calendar' };
}

function buildHistoryItem(match, index = 0) {
  const outcome = buildMatchOutcome(match);

  return {
    id: String(match?.id ?? `history-${index}`),
    matchId: match?.id ?? null,
    title: getFeedTitle(match),
    dateLabel: buildDateLabel(match),
    status: outcome.label,
    summary: asText(match?.opponent_name || match?.court_name) || 'Cancha a confirmar',
    outcome,
    match,
  };
}

function buildFeedItem(match, index = 0) {
  const outcome = buildMatchOutcome(match);

  return {
    id: String(match?.id ?? `feed-${index}`),
    kind: 'match_result',
    title: getFeedTitle(match),
    subtitle: asText(match?.opponent_name || match?.court_name) || 'Cancha a confirmar',
    meta: [buildDateLabel(match), outcome.label].filter(Boolean),
    dateLabel: buildDateLabel(match),
    status: getMatchState(match),
    outcome,
    matchId: match?.id ?? null,
    match,
  };
}

function getHandle(identity) {
  const explicit = asText(
    identity?.handle || identity?.username || identity?.alias || identity?.nick || identity?.nickname
  );
  if (explicit) return explicit.startsWith('@') ? explicit : `@${explicit}`;

  const name = asText(identity?.name).toLowerCase().replace(/\s+/g, '');
  return name ? `@${name}` : null;
}

function getSocialLinkCandidates(identity) {
  return [
    { key: 'instagram', label: 'Instagram', value: identity?.instagram || identity?.instagram_url || identity?.ig },
    { key: 'x', label: 'X', value: identity?.x || identity?.x_url || identity?.twitter || identity?.twitter_url },
    { key: 'tiktok', label: 'TikTok', value: identity?.tiktok || identity?.tiktok_url },
    { key: 'website', label: 'Sitio', value: identity?.website || identity?.site_url },
    { key: 'whatsapp', label: 'WhatsApp', value: identity?.whatsapp || identity?.phone || identity?.phone_number },
  ];
}

function normalizeSocialLink(rawLink) {
  const link = asText(rawLink);
  if (!link) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(link)) return link;

  if (link.startsWith('@')) {
    return `https://instagram.com/${link.slice(1)}`;
  }

  return `https://${link}`;
}

function sortMatchesDesc(matches = []) {
  return [...matches].sort((left, right) => {
    const leftDate = buildDateTimestamp(left);
    const rightDate = buildDateTimestamp(right);
    return rightDate - leftDate;
  });
}

export function toHeroVM({ identity, ratings, matches }) {
  const tier = getCompetitiveTier(identity);
  const rank = getRankByTier(tier);

  return {
    avatar: identity?.avatar || null,
    avatarSeed: identity?.avatar_seed || null,
    name: asText(identity?.name) || 'Jugador',
    handle: getHandle(identity),
    tier,
    rankName: rank?.name || 'Sin categoría',
    rankColor: rank?.starColor || '#94A3B8',
    progressionPoints: getProgressionPoints(identity),
    ratingAverage: Number(ratings?.avg_score ?? getReputationScore(identity) ?? 0),
    ratingTotal: Number(ratings?.total ?? getReputationRatingsCount(identity) ?? 0),
    wins: getCompetitiveWins(identity),
    losses: getCompetitiveLosses(identity),
    matchesTotal: Number(matches?.length || 0),
  };
}

export function toProfileShellVM({ identity, ratings, matches }) {
  const hero = toHeroVM({ identity, ratings, matches });
  const info = toInfoVM(identity);
  const tier = getCompetitiveTier(identity);
  const rank = getRankByTier(tier);

  const meta = [
    { key: 'rank', label: 'Categoría', value: rank?.name || 'Sin categoría', icon: 'award' },
    { key: 'city', label: 'Ciudad', value: asText(identity?.city), icon: 'map-pin' },
    { key: 'club', label: 'Club', value: asText(identity?.club), icon: 'home' },
    { key: 'position', label: 'Posición', value: asText(identity?.position), icon: 'target' },
  ].filter((item) => item.value);

  const stats = [
    {
      key: 'ranking',
      label: 'Ranking',
      value: hero.rankName,
      tone: 'accent',
      helper: `${formatCompactNumber(hero.progressionPoints)} pts`,
    },
    {
      key: 'reputation',
      label: 'Reputación',
      value: formatScore(hero.ratingAverage),
      tone: hero.ratingTotal > 0 ? 'default' : 'muted',
      helper: hero.ratingTotal > 0 ? `${formatCompactNumber(hero.ratingTotal)} calif.` : 'Sin calificaciones',
    },
    {
      key: 'matches',
      label: 'Partidos',
      value: formatCompactNumber(hero.matchesTotal),
      tone: hero.matchesTotal > 0 ? 'default' : 'muted',
      helper: `${formatCompactNumber(hero.wins)}V · ${formatCompactNumber(hero.losses)}D`,
    },
  ].filter((item) => item.value);

  if (hero.progressionPoints > 0 || stats.length < 4) {
    stats.push({
      key: 'progression',
      label: 'Progresión',
      value: formatCompactNumber(hero.progressionPoints),
      tone: hero.progressionPoints > 0 ? 'success' : 'muted',
      helper: hero.progressionPoints > 0 ? 'Puntos competitivos' : 'Todavía sin puntos',
    });
  }

  return {
    avatar: hero.avatar,
    avatarSeed: hero.avatarSeed,
    name: hero.name,
    handle: hero.handle,
    bio: info.bio,
    meta,
    hasMeta: meta.length > 0,
    hasBio: Boolean(info.bio),
    stats: stats.slice(0, 4),
    actions: [
      {
        key: 'edit',
        label: 'Editar',
        icon: 'edit-2',
        actionType: 'navigate',
        route: 'EditProfile',
      },
      {
        key: 'share',
        label: 'Compartir',
        icon: 'share-2',
        actionType: 'placeholder',
        availability: 'native-share-pending',
      },
      {
        key: 'history',
        label: 'Historial',
        icon: 'clock',
        actionType: 'navigate',
        route: 'ProfileHistory',
      },
    ],
    tabs: DEFAULT_TABS,
    accent: rank?.starColor || hero.rankColor,
    rankName: hero.rankName,
    tier,
  };
}

export function toInfoVM(identity) {
  const bio = asText(identity?.bio);
  const rows = [
    { key: 'position', label: 'Posición', value: asText(identity?.position) },
    { key: 'paddle_brand', label: 'Paleta', value: asText(identity?.paddle_brand) },
    { key: 'preferred_partner', label: 'Compañero', value: asText(identity?.preferred_partner) },
    { key: 'city', label: 'Ciudad', value: asText(identity?.city) },
    { key: 'club', label: 'Club', value: asText(identity?.club) },
  ].filter((item) => item.value);

  return {
    bio: bio || null,
    rows,
    hasContent: Boolean(bio || rows.length),
  };
}

export function toSocialVM(identity) {
  const links = getSocialLinkCandidates(identity)
    .map((item) => ({
      ...item,
      value: asText(item.value),
      href: normalizeSocialLink(item.value),
    }))
    .filter((item) => item.value && item.href);

  return {
    links,
    hasLinks: links.length > 0,
    emptyState: {
      title: 'Sin redes por ahora',
      message: 'Podés sumar tus redes más adelante desde editar perfil.',
      actionLabel: 'Editar perfil',
    },
  };
}

export function toHighlightsVM({ identity, ratings, matches }) {
  const sortedMatches = sortMatchesDesc(matches);
  const latestMatch = sortedMatches[0];
  const tier = getCompetitiveTier(identity);
  const rank = getRankByTier(tier);
  const socialItems = toSocialVM(identity).links.map((item) => ({
    id: `social-${item.key}`,
    kind: 'social_link',
    title: item.label,
    subtitle: item.value,
    icon: item.key === 'website' ? 'globe' : item.key === 'whatsapp' ? 'message-circle' : 'at-sign',
    accent: 'surface',
    pressAction: {
      type: 'link',
      href: item.href,
      label: item.label,
    },
  }));

  const derivedItems = [
    latestMatch
      ? {
          id: `match-${latestMatch.id || 'latest'}`,
          kind: 'latest_result',
          title: buildMatchOutcome(latestMatch).label,
          subtitle: `${getFeedTitle(latestMatch)}${buildDateLabel(latestMatch) ? ` · ${buildDateLabel(latestMatch)}` : ''}`,
          icon: buildMatchOutcome(latestMatch).icon,
          accent: buildMatchOutcome(latestMatch).tone,
          pressAction: {
            type: 'match',
            matchId: latestMatch.id ?? null,
          },
        }
      : null,
    Number(ratings?.total ?? getReputationRatingsCount(identity) ?? 0) > 0
      ? {
          id: 'rating-milestone',
          kind: 'rating_milestone',
          title: `${formatScore(ratings?.avg_score ?? getReputationScore(identity))}★ reputación`,
          subtitle: `${formatCompactNumber(ratings?.total ?? getReputationRatingsCount(identity))} calificaciones`,
          icon: 'star',
          accent: 'accent',
          pressAction: null,
        }
      : null,
    rank?.name
      ? {
          id: 'rank-snapshot',
          kind: 'rank_snapshot',
          title: rank.name,
          subtitle: `${formatCompactNumber(getProgressionPoints(identity))} pts de progresión`,
          icon: 'award',
          accent: 'success',
          pressAction: null,
        }
      : null,
  ].filter(Boolean);

  const items = [...socialItems, ...derivedItems].slice(0, HIGHLIGHTS_LIMIT);

  return {
    items,
    hasItems: items.length > 0,
    emptyState: {
      title: 'Todavía no hay highlights',
      message: 'Completá tu perfil o jugá algunos partidos para desbloquear accesos rápidos.',
    },
  };
}

export function toFeedPreviewVM(matches = [], options = {}) {
  const limit = Number(options.limit || FEED_PREVIEW_LIMIT);
  const sortedMatches = sortMatchesDesc(matches);
  const items = sortedMatches.slice(0, limit).map((match) => ({
    id: String(match?.id ?? `${match?.date || 'match'}-${match?.time || '0'}`),
    title: getFeedTitle(match),
    dateLabel: buildDateLabel(match),
    status: getMatchState(match),
    opponentOrCourt: asText(match?.opponent_name || match?.court_name) || 'Cancha a confirmar',
    match,
  }));

  return {
    items,
    hasItems: items.length > 0,
    totalMatches: sortedMatches.length,
    previewLimit: limit,
  };
}

export function toFeedVM({ identity, ratings, matches, highlights }) {
  const sortedMatches = sortMatchesDesc(matches);
  const items = sortedMatches.map((match, index) => buildFeedItem(match, index));

  return {
    items,
    hasItems: items.length > 0,
    totalItems: items.length,
    hero: {
      name: asText(identity?.name) || 'Jugador',
      handle: getHandle(identity),
      reputation: formatScore(ratings?.avg_score ?? getReputationScore(identity)),
      highlightsCount: Number(highlights?.items?.length || 0),
    },
    emptyState: {
      title: 'Tu feed todavía está arrancando',
      message: 'Jugá un partido o completá tus datos para empezar a mostrar movimiento en tu perfil.',
      actionLabel: 'Ver historial',
    },
    errorState: {
      title: 'No pudimos armar tu feed',
      message: 'Probá actualizar para volver a cargar tus partidos y actividad.',
      retryLabel: 'Reintentar',
    },
  };
}

export function toActivityVM({ identity, ratings, matches }) {
  const sortedMatches = sortMatchesDesc(matches);
  const rank = getRankByTier(getCompetitiveTier(identity));
  const events = [
    rank?.name
      ? {
          id: 'activity-rank-snapshot',
          kind: 'rating_snapshot',
          dateTs: sortedMatches[0] ? buildDateTimestamp(sortedMatches[0]) : 0,
          dateLabel: sortedMatches[0] ? buildDateLabel(sortedMatches[0]) : 'Estado actual',
          title: `Estás en ${rank.name}`,
          outcome: 'progress',
          payload: {
            points: getProgressionPoints(identity),
            tier: getCompetitiveTier(identity),
          },
        }
      : null,
    Number(ratings?.total ?? getReputationRatingsCount(identity) ?? 0) > 0
      ? {
          id: 'activity-reputation',
          kind: 'milestone',
          dateTs: sortedMatches[0] ? buildDateTimestamp(sortedMatches[0]) - 1 : 0,
          dateLabel: 'Reputación actual',
          title: `${formatScore(ratings?.avg_score ?? getReputationScore(identity))}★ de reputación`,
          outcome: 'positive',
          payload: {
            ratings: Number(ratings?.total ?? getReputationRatingsCount(identity)),
          },
        }
      : null,
    ...sortedMatches.map((match, index) => {
      const outcome = buildMatchOutcome(match);

      return {
        id: `activity-match-${match?.id ?? index}`,
        kind: 'match_result',
        dateTs: buildDateTimestamp(match),
        dateLabel: buildDateLabel(match),
        title: getFeedTitle(match),
        outcome: outcome.key,
        payload: {
          status: outcome.label,
          subtitle: asText(match?.opponent_name || match?.court_name) || 'Cancha a confirmar',
          matchId: match?.id ?? null,
        },
      };
    }),
  ]
    .filter(Boolean)
    .sort((left, right) => right.dateTs - left.dateTs);

  return {
    items: events,
    hasItems: events.length > 0,
    emptyState: {
      title: 'Sin actividad por ahora',
      message: 'Cuando empieces a jugar o recibas calificaciones, tu línea de tiempo se va a mover acá.',
    },
    errorState: {
      title: 'No pudimos cargar tu actividad',
      message: 'Reintentá para recuperar tu timeline sin cerrar el perfil.',
      retryLabel: 'Reintentar',
    },
  };
}

export function toHistoryTabVM(matches = []) {
  const sortedMatches = sortMatchesDesc(matches);
  const items = sortedMatches.slice(0, HISTORY_TAB_LIMIT).map((match, index) => buildHistoryItem(match, index));

  return {
    summary: {
      totalMatches: sortedMatches.length,
      latestMatchDateLabel: sortedMatches[0] ? buildDateLabel(sortedMatches[0]) : null,
      ctaLabel: 'Ver historial completo',
    },
    items,
    hasItems: items.length > 0,
    emptyState: {
      title: 'Todavía no tenés historial',
      message: 'Apenas juegues tus primeros partidos, vas a ver el resumen acá.',
      ctaLabel: 'Explorar partidos',
    },
    errorState: {
      title: 'No pudimos resumir tu historial',
      message: 'Reintentá para volver a cargar tus partidos sin salir del perfil.',
      retryLabel: 'Reintentar',
    },
  };
}

export function toHistoryVM(matches = []) {
  const historyTab = toHistoryTabVM(matches);

  return {
    totalMatches: historyTab.summary.totalMatches,
    latestMatchDateLabel: historyTab.summary.latestMatchDateLabel,
    ctaLabel: historyTab.summary.ctaLabel,
  };
}
