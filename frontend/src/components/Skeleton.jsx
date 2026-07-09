import React from 'react';

// Modular shimmer element helper
export function ShimmerEl({ className }) {
  return <div className={`animate-shimmer rounded-lg bg-slate-200/80 dark:bg-zinc-800 ${className}`} />;
}

export function SidebarSkeleton() {
  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-black text-slate-800 dark:text-slate-100 select-none md:w-80 md:border-r border-slate-200 dark:border-neutral-900">
      {/* Profile Header skeleton */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-900 bg-slate-50/50 dark:bg-neutral-950/40 p-4">
        <div className="flex items-center gap-3">
          <ShimmerEl className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5 text-left">
            <ShimmerEl className="h-3.5 w-20" />
            <ShimmerEl className="h-3 w-14" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ShimmerEl className="h-9 w-9 rounded-xl" />
          <ShimmerEl className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* Search Input skeleton */}
      <div className="border-b border-slate-200 dark:border-neutral-900 bg-slate-50/30 dark:bg-neutral-900/30 p-3">
        <ShimmerEl className="h-8 w-full rounded-xl" />
      </div>

      {/* Chat List skeleton */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        <div className="px-3 py-1">
          <ShimmerEl className="h-3 w-12 rounded-sm" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
            <ShimmerEl className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <ShimmerEl className="h-3.5 w-28" />
                <ShimmerEl className="h-2.5 w-5" />
              </div>
              <ShimmerEl className="h-3 w-full max-w-[160px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-3">
        <ShimmerEl className="h-10 w-10 rounded-xl" />
        <div className="space-y-2 text-left">
          <ShimmerEl className="h-4 w-28" />
          <ShimmerEl className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ChatMessagesSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      {[...Array(6)].map((_, i) => {
        const isMe = i % 2 === 0;
        return (
          <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1.5`}>
            {/* Bubble */}
            <div className={`flex gap-3 items-end max-w-[70%] ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
              {!isMe && <ShimmerEl className="h-8 w-8 rounded-lg shrink-0" />}
              <div className="w-full">
                <ShimmerEl
                  className={`h-12 w-full rounded-2xl ${
                    isMe
                      ? 'rounded-tr-xs bg-indigo-500/20 dark:bg-indigo-900/20'
                      : 'rounded-tl-xs bg-slate-100 dark:bg-zinc-800/50'
                  } max-w-[280px]`}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-black p-4">
      <div className="relative w-full max-w-md space-y-6 rounded-3xl border border-slate-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 p-8 shadow-xl">
        <div className="flex flex-col items-center gap-2">
          <ShimmerEl className="h-6 w-32" />
          <ShimmerEl className="h-4 w-56" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <ShimmerEl className="h-24 w-24 rounded-2xl" />
          <ShimmerEl className="h-3 w-20" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <ShimmerEl className="h-3 w-16" />
            <ShimmerEl className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <ShimmerEl className="h-3 w-16" />
            <ShimmerEl className="h-10 w-full rounded-xl" />
          </div>
          <ShimmerEl className="h-12 w-full rounded-xl mt-6" />
        </div>
      </div>
    </div>
  );
}

export function GroupModalSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <ShimmerEl className="h-3 w-20" />
        <ShimmerEl className="h-10 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        <ShimmerEl className="h-3.5 w-16" />
        <ShimmerEl className="h-10 w-full rounded-xl" />
      </div>
      <div className="space-y-2 pt-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3">
              <ShimmerEl className="h-8 w-8 rounded-full" />
              <div className="space-y-1">
                <ShimmerEl className="h-3 w-24" />
                <ShimmerEl className="h-2.5 w-32" />
              </div>
            </div>
            <ShimmerEl className="h-5 w-5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
