import { Platform } from 'react-native';

const FONTS = {
    heading: 'Outfit',
    body: 'Inter',
};

// Map font weights to specific font family strings (requires loading these specific fonts)
const FONT_FAMILIES = {
    h: {
        regular: 'Outfit_400Regular',
        medium: 'Outfit_500Medium',
        semiBold: 'Outfit_600SemiBold',
        bold: 'Outfit_700Bold',
    },
    b: {
        regular: 'Inter_400Regular',
        medium: 'Inter_500Medium',
        semiBold: 'Inter_600SemiBold',
        bold: 'Inter_700Bold',
    }
};

export const typography = {
    fonts: FONTS,
    families: FONT_FAMILIES,

    // Pre-defined text styles
    h1: {
        fontFamily: FONT_FAMILIES.h.bold,
        fontSize: 32,
        lineHeight: 40,
        letterSpacing: -0.5,
    },
    h2: {
        fontFamily: FONT_FAMILIES.h.bold,
        fontSize: 24,
        lineHeight: 32,
        letterSpacing: -0.3,
    },
    h3: {
        fontFamily: FONT_FAMILIES.h.semiBold,
        fontSize: 20,
        lineHeight: 28,
    },
    subtitle: {
        fontFamily: FONT_FAMILIES.h.medium,
        fontSize: 18,
        lineHeight: 24,
    },
    bodyLarge: {
        fontFamily: FONT_FAMILIES.b.regular,
        fontSize: 16,
        lineHeight: 24,
    },
    body: {
        fontFamily: FONT_FAMILIES.b.regular,
        fontSize: 14,
        lineHeight: 20,
    },
    bodyMedium: {
        fontFamily: FONT_FAMILIES.b.medium,
        fontSize: 14,
        lineHeight: 20,
    },
    bodyBold: {
        fontFamily: FONT_FAMILIES.b.bold,
        fontSize: 14,
        lineHeight: 20,
    },
    caption: {
        fontFamily: FONT_FAMILIES.b.regular,
        fontSize: 12,
        lineHeight: 16,
    },
    captionMedium: {
        fontFamily: FONT_FAMILIES.b.medium,
        fontSize: 12,
        lineHeight: 16,
    },
    label: {
        fontFamily: FONT_FAMILIES.b.semiBold,
        fontSize: 10,
        lineHeight: 14,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
};
