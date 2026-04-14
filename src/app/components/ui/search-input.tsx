import * as React from "react";
import { Search, X, Loader2 } from "lucide-react";

import { cn } from "./utils";

export interface SearchInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Show a loading spinner on the right side (e.g., while fetching results). */
  loading?: boolean;
  /**
   * Single-character keyboard shortcut that focuses the input from anywhere on the page.
   * Pressed alone (no modifiers) and ignored while typing in other inputs.
   * Example: "/" or "s".
   */
  shortcut?: string;
  /** Classes applied to the input itself. */
  className?: string;
  /** Classes applied to the wrapper. */
  wrapperClassName?: string;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      value,
      onValueChange,
      loading = false,
      shortcut,
      className,
      wrapperClassName,
      placeholder = "Search...",
      onKeyDown,
      ...rest
    },
    ref,
  ) {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }
      },
      [ref],
    );

    React.useEffect(() => {
      if (!shortcut) return;
      const handler = (event: KeyboardEvent) => {
        if (event.key !== shortcut) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        innerRef.current?.focus();
        innerRef.current?.select();
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [shortcut]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape" && value) {
        event.preventDefault();
        onValueChange("");
      }
      onKeyDown?.(event);
    };

    const hasValue = value.length > 0;
    const showClear = hasValue && !loading;
    const showShortcut = Boolean(shortcut) && !hasValue && !loading;

    return (
      <div
        className={cn(
          "group relative flex h-9 w-full items-center rounded-md border border-input bg-input-background text-[13px] transition-[color,box-shadow,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-quart)] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          wrapperClassName,
        )}
      >
        <Search
          size={14}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-muted-foreground transition-colors",
            "group-focus-within:text-foreground",
          )}
        />
        <input
          ref={setRefs}
          type="search"
          role="searchbox"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "h-full w-full min-w-0 rounded-md border-0 bg-transparent pl-8 pr-9 text-[13px] text-foreground placeholder:text-muted-foreground outline-none",
            "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            className,
          )}
          {...rest}
        />
        {loading ? (
          <Loader2
            size={14}
            aria-hidden="true"
            className="absolute right-[11px] top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        ) : showClear ? (
          <button
            type="button"
            onClick={() => {
              onValueChange("");
              innerRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-[6px] top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-quart)] hover:bg-[var(--surface-container-low)] hover:text-foreground active:scale-90"
          >
            <X size={14} />
          </button>
        ) : showShortcut ? (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 rounded border border-input bg-[var(--surface-container-low)] px-1.5 py-px font-mono text-[10px] font-medium text-muted-foreground"
          >
            {shortcut}
          </kbd>
        ) : null}
      </div>
    );
  },
);
