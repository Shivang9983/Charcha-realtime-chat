import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="cursor-pointer rounded-xl border border-slate-200/60 bg-black-100 p-2.5 text-slate-700 transition-all duration-200 hover:scale-105 hover:bg-black-200 active:scale-95 dark:border-slate-700/50 dark:bg-black-200 dark:text-slate-200 dark:hover:bg-black-700"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500 animate-pulse" /> : <Moon className="h-5 w-5 text-indigo-500" />}
    </button>
  );
}


