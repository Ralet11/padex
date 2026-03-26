import React, { createContext, useContext, useState } from 'react';
import { defaultColors, lightTheme, darkTheme } from './colors';
import { typography } from './typography';
import { spacing, radius, shadows } from './spacing';

// Create the context
const ThemeContext = createContext({
    colors: defaultColors,
    typography: typography,
    spacing: spacing,
    radius: radius,
    shadows: shadows,
    isDark: true,
    toggleTheme: () => { },
});

// Create the provider component
export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(false);

    const toggleTheme = () => {
        setIsDark((prev) => !prev);
    };

    const theme = {
        colors: isDark ? darkTheme : lightTheme,
        typography,
        spacing,
        radius,
        shadows,
        isDark,
        toggleTheme,
    };

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};

// Custom hook to use the theme easily
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
