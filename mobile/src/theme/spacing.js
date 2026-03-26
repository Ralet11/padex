export const spacing = {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16, // Increased base standard padding
    lg: 24,
    xl: 32,
    xxl: 40,
    xxxl: 48,
    huge: 64,
    massive: 80,
};

export const radius = {
    none: 0,
    sm: 6,
    md: 12, // Apple-like medium radius
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 9999,
};

// Extremely subtle, clean shadows (Sober/Professional)
export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
};
