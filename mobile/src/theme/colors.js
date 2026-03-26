export const darkTheme = {
    background: '#000000',
    surface: '#000000', // Flat, relies on borders
    surfaceHighlight: '#111111',

    primary: '#FFFFFF', // High-contrast, sober actions
    primaryMuted: 'rgba(255, 255, 255, 0.1)',
    secondary: '#1A1A1A',

    accent: '#A7CE29', // Padex Green

    text: {
        primary: '#FFFFFF',
        secondary: '#A1A1AA',
        tertiary: '#52525B',
        inverse: '#000000',
    },

    danger: '#EF4444',
    success: '#A7CE29',
    warning: '#F59E0B',
    info: '#3B82F6',

    border: '#27272A',
    borderLight: '#3F3F46',

    overlay: 'rgba(0, 0, 0, 0.8)',
    glassMask: 'rgba(0, 0, 0, 0.6)',
};

export const lightTheme = {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceHighlight: '#F4F4F5',

    primary: '#000000', // Pure black for dominant actions
    primaryMuted: 'rgba(0, 0, 0, 0.05)',
    secondary: '#F4F4F5',

    accent: '#A7CE29', // Padex Green

    text: {
        primary: '#09090B',
        secondary: '#71717A',
        tertiary: '#A1A1AA',
        inverse: '#FFFFFF',
    },

    danger: '#EF4444',
    success: '#A7CE29',
    warning: '#F59E0B',
    info: '#3B82F6',

    border: '#E4E4E7',
    borderLight: '#F4F4F5',

    overlay: 'rgba(0, 0, 0, 0.4)',
    glassMask: 'rgba(255, 255, 255, 0.8)',
};

// Set Light theme as default for a "Clear, clean, and minimalist" vibe.
export const defaultColors = lightTheme;
