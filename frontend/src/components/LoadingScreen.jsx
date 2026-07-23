import React from 'react';

/**
 * Premium, luxury animated loading screen for Charcha.
 * Displays a center-aligned ghost mascot with custom eye-blink, pulse, shadow, and orbital particles.
 * 
 * Props:
 * - `fadeOut` (boolean): Triggers the fade-out exit transition of the loading container.
 */
export default function LoadingScreen({ fadeOut = false }) {
  // 5 unique orbiting particles (reduced from 8 for performance on mobile devices)
  const particles = [
    { id: 1, radius: 70, duration: 16, fadeDuration: 4, delay: -2, size: 'w-1 h-1', opacity: 0.6, direction: 'cw', color: 'bg-purple-400' },
    { id: 2, radius: 95, duration: 22, fadeDuration: 6, delay: -5, size: 'w-1.5 h-1.5', opacity: 0.4, direction: 'ccw', color: 'bg-indigo-400' },
    { id: 3, radius: 80, duration: 18, fadeDuration: 5, delay: -10, size: 'w-1 h-1', opacity: 0.5, direction: 'cw', color: 'bg-purple-300' },
    { id: 4, radius: 110, duration: 28, fadeDuration: 8, delay: -1, size: 'w-2 h-2', opacity: 0.3, direction: 'ccw', color: 'bg-violet-400' },
    { id: 5, radius: 60, duration: 13, fadeDuration: 3, delay: -8, size: 'w-1.5 h-1.5', opacity: 0.7, direction: 'cw', color: 'bg-purple-200' },
  ];

  const ghostMascotPath = 'M 26 44 A 30 30 0 0 1 86 44 L 86 72 C 86 78, 77 78, 72 73 C 72 78, 63 78, 58 73 C 58 78, 49 78, 44 73 C 44 78, 20 86, 14 86 C 18 83, 26 78, 26 72 Z';

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090B] overflow-hidden select-none transition-opacity duration-300 ease-out ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-busy="true"
      aria-label="Loading application"
    >
      {/* 1. Extremely Subtle Background Glows (Aurora / Radial Glow) - Almost invisible & clean */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Central ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.02)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
        
        {/* Shifting auroras with extremely low opacity */}
        <div className="absolute top-[-15%] left-[-15%] w-[45%] h-[45%] rounded-full bg-purple-950/3 blur-[130px] aurora-glow-1" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[45%] h-[45%] rounded-full bg-indigo-950/3 blur-[130px] aurora-glow-2" />
        <div className="absolute top-[35%] right-[-10%] w-[35%] h-[35%] rounded-full bg-violet-950/3 blur-[110px] aurora-glow-3" />
      </div>

      {/* Center Container */}
      <div className="relative flex flex-col items-center justify-center">
        
        {/* 2. Orbiting Particles Container - Tilted in 3D perspective to avoid spinner feeling */}
        <div 
          className="absolute inset-0 w-0 h-0 flex items-center justify-center pointer-events-none" 
          style={{ transform: 'perspective(500px) rotateX(65deg) rotateY(-8deg)' }}
        >
          {particles.map((p) => {
            const isCw = p.direction === 'cw';
            const sizePx = p.size === 'w-1 h-1' ? '4px' : p.size === 'w-1.5 h-1.5' ? '6px' : '8px';
            return (
              <div
                key={p.id}
                className="absolute rounded-full orbit-particle-element bg-purple-400/90 blur-[0.5px]"
                style={{
                  width: sizePx,
                  height: sizePx,
                  opacity: p.opacity,
                  '--orbit-radius': `${p.radius}px`,
                  animation: `${isCw ? 'orbit-clockwise' : 'orbit-counter-clockwise'} ${p.duration}s linear infinite, particle-fade ${p.fadeDuration}s ease-in-out infinite`,
                  animationDelay: `${p.delay}s`,
                }}
              />
            );
          })}
        </div>

        {/* 3. Soft Purple Glow Pulse directly behind the ghost */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.14)_0%,rgba(0,0,0,0)_70%)] blur-[35px] logo-glow-pulse pointer-events-none" />

        {/* 4. Ghost Floating Logo Wrapper */}
        <div className="ghost-float-breath flex items-center justify-center relative z-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            className="w-24 h-24 text-slate-100 filter drop-shadow-[0_4px_16px_rgba(168,85,247,0.12)]"
            role="presentation"
          >
            <defs>
              <linearGradient id="loaderPurpleEyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C084FC" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>

            {/* Ghost body path */}
            <path d={ghostMascotPath} fill="currentColor" />

            {/* Glowing Purple Blinking Eyes */}
            <ellipse
              cx="45"
              cy="44"
              rx="5.5"
              ry="3.5"
              fill="url(#loaderPurpleEyeGrad)"
              className="ghost-eye-left"
            />
            <ellipse
              cx="67"
              cy="44"
              rx="5.5"
              ry="3.5"
              fill="url(#loaderPurpleEyeGrad)"
              className="ghost-eye-right"
            />
          </svg>
        </div>

        {/* 5. Coordinated Shadow beneath the ghost (only scales and fades) */}
        <div className="ghost-shadow w-16 h-2 bg-black/75 rounded-full mt-7 blur-[3px] pointer-events-none" />

      </div>
    </div>
  );
}
