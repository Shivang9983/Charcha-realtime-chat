import React from 'react';

/**
 * Reusable and accessible Logo component for Charcha.
 * 
 * Props:
 * - `showText` (boolean): If true, displays the "Charcha" wordmark alongside the mascot. Default is false.
 * - `className` (string): Additional tailwind/CSS classes for styling and sizing the SVG.
 * - `ariaLabel` (string): Optional custom aria-label override.
 */
export default function Logo({
  showText = false,
  className = 'w-10 h-10',
  ariaLabel,
  ...props
}) {
  const defaultLabel = showText ? 'Charcha Logo' : 'Charcha Mascot';
  const label = ariaLabel || defaultLabel;

  // The original ghost mascot path, subtly resembling a chat bubble
  const ghostMascotPath = 'M 26 44 A 30 30 0 0 1 86 44 L 86 72 C 86 78, 77 78, 72 73 C 72 78, 63 78, 58 73 C 58 78, 49 78, 44 73 C 44 78, 20 86, 14 86 C 18 83, 26 78, 26 72 Z';

  if (showText) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 320 100"
        className={className}
        role="img"
        aria-label={label}
        {...props}
      >
        <title>{label}</title>
        <defs>
          <linearGradient id="logoPurpleGradText" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        
        {/* Mascot grouped and shifted to the left */}
        <g transform="translate(10, 0)">
          {/* Ghost body inherits currentColor (usually white) */}
          <path d={ghostMascotPath} fill="currentColor" />
          {/* Glowing Purple Accent Eyes */}
          <ellipse cx="45" cy="44" rx="5.5" ry="3.5" fill="url(#logoPurpleGradText)" />
          <ellipse cx="67" cy="44" rx="5.5" ry="3.5" fill="url(#logoPurpleGradText)" />
        </g>

        {/* Wordmark inherits typography and text color */}
        <text
          x="120"
          y="58"
          fill="currentColor"
          style={{
            fontFamily: 'inherit',
            fontWeight: 800,
            fontSize: '42px',
            letterSpacing: '-0.03em',
          }}
        >
          Charcha
        </text>
      </svg>
    );
  }

  // Icon Only (viewBox 0 0 100 100)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={label}
      {...props}
    >
      <title>{label}</title>
      <defs>
        <linearGradient id="logoPurpleGradIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>

      {/* Ghost body inherits currentColor (usually white) */}
      <path d={ghostMascotPath} fill="currentColor" />
      {/* Glowing Purple Accent Eyes */}
      <ellipse cx="45" cy="44" rx="5.5" ry="3.5" fill="url(#logoPurpleGradIcon)" />
      <ellipse cx="67" cy="44" rx="5.5" ry="3.5" fill="url(#logoPurpleGradIcon)" />
    </svg>
  );
}
