import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export default function SearchBar({ onChange, isSearching }) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Check if system is macOS for rendering the proper keyboard shortcut icon
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const platform = navigator.platform || navigator.userAgentData?.platform || '';
      setIsMac(/Mac|iPod|iPhone|iPad/.test(platform));
    }
  }, []);

  // Handle Ctrl+K / Cmd+K global shortcuts to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isModifierPressed = isMac ? e.metaKey : e.ctrlKey;
      if (isModifierPressed && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMac]);

  // Handle Escape key to clear search or blur when input is focused
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (value) {
        setValue('');
        onChange(''); // Immediately update parent when cleared
      } else {
        inputRef.current?.blur();
      }
    }
  };

  // Debounced input change notification to parent
  useEffect(() => {
    // If value is empty, update the parent state instantly to make reset snappy
    if (!value.trim()) {
      onChange('');
      return;
    }

    const timer = setTimeout(() => {
      onChange(value);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [value, onChange]);

  const handleClear = () => {
    setValue('');
    onChange(''); // Immediately update parent when cleared
    inputRef.current?.focus();
  };

  return (
    <div className="relative group w-full">
      {/* Search Input Box Wrapper */}
      <div
        className={`flex items-center gap-2 w-full rounded-xl border px-3.5 py-2.5 transition-all duration-200 ease-out bg-slate-50 dark:bg-neutral-950/70 ${
          isFocused
            ? 'border-purple-500/80 ring-2 ring-purple-500/20 dark:ring-purple-500/25 shadow-[0_0_12px_rgba(168,85,247,0.12)] dark:shadow-[0_0_16px_rgba(168,85,247,0.18)]'
            : 'border-slate-200 dark:border-neutral-850 hover:border-slate-300 dark:hover:border-neutral-750'
        }`}
      >
        {/* Modern Search Icon */}
        <Search
          className={`h-4.5 w-4.5 shrink-0 transition-colors duration-200 ${
            isFocused ? 'text-purple-500 dark:text-purple-400' : 'text-slate-400 dark:text-neutral-500'
          }`}
        />

        {/* Input Element */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search chats or users..."
          className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-450 dark:placeholder-neutral-550 border-none outline-none focus:outline-none focus:ring-0 p-0"
        />

        {/* Action Controls / Icons on Right */}
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          {/* Loading Spinner */}
          {isSearching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500 dark:text-purple-400" />
          )}

          {/* Clear X Button */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-md text-slate-450 hover:text-slate-650 hover:bg-slate-200/50 dark:text-neutral-550 dark:hover:text-neutral-200 dark:hover:bg-neutral-850 transition-all duration-150 cursor-pointer"
              title="Clear search (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Keyboard Shortcut Badge */}
          {!value && !isFocused && (
            <span className="hidden sm:inline-flex items-center text-[10px] font-bold text-slate-400 dark:text-neutral-500 bg-slate-150/85 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-800 px-1.5 py-0.5 rounded-md font-mono pointer-events-none transition-opacity duration-200">
              {isMac ? '⌘K' : 'Ctrl K'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
