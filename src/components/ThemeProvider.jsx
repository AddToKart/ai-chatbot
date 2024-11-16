// src/components/ThemeProvider.jsx
'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  isDark: false,
  setIsDark: () => {}
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(darkModePreference.matches);

    const handler = (e) => setIsDark(e.matches);
    darkModePreference.addEventListener('change', handler);
    
    return () => darkModePreference.removeEventListener('change', handler);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      <div className={isDark ? 'dark' : ''}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}