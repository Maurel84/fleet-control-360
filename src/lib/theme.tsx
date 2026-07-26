import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './auth';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('fc360-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('fc360-theme', theme);
  }, [theme]);

  // Reset to system default when user changes (different preference per user)
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem('fc360-theme');
    if (!stored) {
      setTheme(window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
  }, [user]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
