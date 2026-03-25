import { useState, useRef, useEffect, useId } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface SelectOption {
  value: number | string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  clearLabel?: string;
  icon?: React.ReactNode;
  /** "filter" = compact pill style used in filter bars; "form" = full-width form input style */
  variant?: "filter" | "form";
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  clearLabel = "All",
  icon,
  variant = "form",
  className = "",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const containerRef        = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLInputElement>(null);
  const uid                 = useId();

  const selected = options.find(o => o.value === value) ?? null;

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const choose = (val: number | string | null) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  // ── Filter-bar pill variant ─────────────────────────────────────────────────
  if (variant === "filter") {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 bg-secondary/60 border border-border rounded-xl px-3 py-2 min-w-[180px] text-sm hover:bg-secondary/80 transition-colors w-full"
        >
          {icon && <span className="flex-none">{icon}</span>}
          <span className={`flex-1 text-left truncate ${selected ? "text-foreground" : "text-muted-foreground"}`}>
            {selected ? selected.label : placeholder}
          </span>
          {selected ? (
            <X
              className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground flex-none"
              onClick={e => { e.stopPropagation(); choose(null); }}
            />
          ) : (
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground flex-none transition-transform ${open ? "rotate-180" : ""}`} />
          )}
        </button>

        {open && (
          <div className="absolute z-50 top-full mt-1 left-0 min-w-full w-56 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-none" />
              <input
                ref={inputRef}
                id={uid}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Options list */}
            <ul className="max-h-52 overflow-y-auto py-1">
              {/* Clear option */}
              <li>
                <button
                  type="button"
                  onClick={() => choose(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${value === null ? "text-primary font-medium" : "text-muted-foreground"}`}
                >
                  <span className="w-4 flex-none">{value === null && <Check className="w-3.5 h-3.5" />}</span>
                  {clearLabel}
                </button>
              </li>

              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-xs text-muted-foreground text-center">No results</li>
              ) : (
                filtered.map(opt => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => choose(opt.value)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${value === opt.value ? "text-primary font-medium" : "text-foreground"}`}
                    >
                      <span className="w-4 flex-none">{value === opt.value && <Check className="w-3.5 h-3.5" />}</span>
                      <span className="truncate">{opt.label}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ── Form input variant ──────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 border border-input bg-background rounded-md px-3 py-2 text-sm hover:border-ring/50 transition-colors"
      >
        {icon && <span className="flex-none text-muted-foreground">{icon}</span>}
        <span className={`flex-1 text-left truncate ${selected ? "text-foreground" : "text-muted-foreground"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-none transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-full bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card">
            <Search className="w-4 h-4 text-muted-foreground flex-none" />
            <input
              ref={inputRef}
              id={uid}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {/* Clear/default option */}
            <li>
              <button
                type="button"
                onClick={() => choose(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${value === null ? "text-primary font-medium" : "text-muted-foreground"}`}
              >
                <span className="w-4 flex-none">{value === null && <Check className="w-3.5 h-3.5" />}</span>
                {placeholder}
              </button>
            </li>

            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs text-muted-foreground text-center">No results</li>
            ) : (
              filtered.map(opt => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => choose(opt.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${value === opt.value ? "text-primary font-medium" : "text-foreground"}`}
                  >
                    <span className="w-4 flex-none">{value === opt.value && <Check className="w-3.5 h-3.5" />}</span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
