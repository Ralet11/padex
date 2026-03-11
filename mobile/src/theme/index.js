export const colors = {
  // Fondos
  bg: '#0A0E1A',
  surface: '#111827',
  card: '#1A2234',
  cardBorder: '#1F2D45',

  // Primario — verde esmeralda (canchas de padel)
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#34D399',
  primaryBg: 'rgba(16,185,129,0.12)',

  // Acento — ámbar/dorado
  accent: '#F59E0B',
  accentDark: '#D97706',
  accentBg: 'rgba(245,158,11,0.12)',

  // Secundario — índigo
  secondary: '#6366F1',
  secondaryBg: 'rgba(99,102,241,0.12)',

  // Texto
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#475569',

  // Estado
  success: '#10B981',
  error: '#EF4444',
  errorBg: 'rgba(239,68,68,0.12)',
  warning: '#F59E0B',
  info: '#3B82F6',

  // UI
  border: '#1E293B',
  borderLight: '#334155',
  divider: '#1E293B',
  tabBar: '#0D1424',
  header: '#0A0E1A',
  overlay: 'rgba(0,0,0,0.7)',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '800', color: colors.text },
  h2: { fontSize: 22, fontWeight: '700', color: colors.text },
  h3: { fontSize: 18, fontWeight: '700', color: colors.text },
  h4: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, fontWeight: '400', color: colors.text },
  bodySmall: { fontSize: 13, fontWeight: '400', color: colors.textSecondary },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  caption: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
};
