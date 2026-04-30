import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return compact ? <div className="h-6 w-[72px]" aria-hidden="true" /> : <div className="h-8 w-8" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === 'dark';

  if (compact) {
    return (
      <div className="inline-flex overflow-hidden rounded-md border border-[var(--outline-variant)]/55 bg-[var(--surface-container-lowest)] text-[10px] font-semibold">
        <button
          type="button"
          onClick={() => setTheme('light')}
          aria-label="Switch to light mode"
          aria-current={!isDark ? 'true' : undefined}
          className={`flex min-w-9 items-center justify-center gap-1 px-2 py-1 transition-colors ${
            !isDark
              ? 'bg-primary text-[var(--primary-foreground)]'
              : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]'
          }`}
        >
          <Sun size={12} />
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          aria-label="Switch to dark mode"
          aria-current={isDark ? 'true' : undefined}
          className={`flex min-w-9 items-center justify-center gap-1 px-2 py-1 transition-colors ${
            isDark
              ? 'bg-primary text-[var(--primary-foreground)]'
              : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]'
          }`}
        >
          <Moon size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={className ?? "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
