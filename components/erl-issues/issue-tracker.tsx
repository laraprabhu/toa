'use client';

import {
  Calculator,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Construction,
  FolderOpen,
  Hand,
  IndianRupee,
  Moon,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  formatTower,
  issueStatusLabels,
  type ErlIssue,
  type IssueStatus,
} from '@/lib/erl-issues';
import { siteHref } from '@/lib/site-path';

type AppTab = 'civil' | 'fund' | 'documents';
type StatusFilter = IssueStatus | 'all';
type ColorTheme = 'dark' | 'light';

const reelStatusStyles: Record<IssueStatus, string> = {
  done: 'border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:border-emerald-300/40 dark:bg-emerald-300/15 dark:text-emerald-100',
  'in-progress':
    'border-amber-600/30 bg-amber-500/12 text-amber-800 dark:border-amber-300/40 dark:bg-amber-300/15 dark:text-amber-100',
  'not-done':
    'border-rose-600/25 bg-rose-500/10 text-rose-800 dark:border-rose-300/40 dark:bg-rose-300/15 dark:text-rose-100',
};

const appTabs: Array<{
  id: AppTab;
  label: string;
  icon: typeof Construction;
}> = [
  { id: 'civil', label: 'Civil', icon: Construction },
  { id: 'fund', label: 'Fund', icon: IndianRupee },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
];

const swipeHintStorageKey = 'toa-erl-swipe-hint-dismissed-v2';
const colorThemeStorageKey = 'toa-erl-color-theme';
const fundBaselineTotal = 53_102_320.38;
const fundDailyInterest = 9_402.64;
const fundBaselineTimestamp = Date.UTC(2026, 9, 16, 18, 30);
const fundInterestUpToOrder = 7_423_975;
const fundAdditionalInterestBaseline = 14_132_161;
const fundTotalInterestBaseline = 21_556_136;

const fundDues = [
  {
    label: 'Corpus amount receivable',
    amount: 27_677_112,
  },
  {
    label: 'Interest on corpus',
    liveInterest: true,
  },
  {
    label: 'Common amenities maintenance withheld by the promoter',
    amount: 3_030_123,
  },
  {
    label: 'Maintenance dues for unsold flats',
    period: 'As of 12 October 2026',
    amount: 718_949.38,
  },
  {
    label: 'Common area usage charges for the promoter’s office',
    period: 'April–September 2022',
    amount: 120_000,
  },
] as const;

function formatRupees(value: number, decimals = 0) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function useLiveFundSnapshot() {
  const [now, setNow] = useState(fundBaselineTimestamp);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const initialUpdate = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1_000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  const elapsedMs = Math.max(0, now - fundBaselineTimestamp);
  const accruedInterest =
    (elapsedMs / (24 * 60 * 60 * 1_000)) * fundDailyInterest;

  return {
    liveTotal: fundBaselineTotal + accruedInterest,
    additionalInterest: fundAdditionalInterestBaseline + accruedInterest,
    totalInterest: fundTotalInterestBaseline + accruedInterest,
  };
}

function StatusIcon({
  status,
  size = 16,
}: {
  status: IssueStatus;
  size?: number;
}) {
  if (status === 'done') return <CheckCircle2 size={size} aria-hidden="true" />;
  if (status === 'in-progress')
    return <Clock3 size={size} aria-hidden="true" />;
  return <CircleDashed size={size} aria-hidden="true" />;
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: ColorTheme;
  onToggle: () => void;
}) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      className="erl-icon-button grid size-10 shrink-0 place-items-center rounded-xl border transition hover:-translate-y-0.5"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun size={19} aria-hidden="true" />
      ) : (
        <Moon size={19} aria-hidden="true" />
      )}
    </button>
  );
}

function TrackerTopBar({
  title,
  summary,
  actions,
}: {
  title: string;
  summary: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pb-10 pt-3">
      <div className="erl-top-bar pointer-events-auto mx-auto flex items-center justify-between gap-3 rounded-2xl border p-2 shadow-[0_14px_38px_var(--erl-nav-shadow)] backdrop-blur-xl">
        <div className="min-w-0 pl-1">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-[var(--erl-accent)]">
            {title}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-[var(--erl-muted)]">
            {summary}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {actions}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.09em] ${reelStatusStyles[status]}`}
    >
      <StatusIcon status={status} size={14} />
      {issueStatusLabels[status]}
    </span>
  );
}

function CommentBlock({ title, text }: { title: string; text: string }) {
  return (
    <section className="erl-soft-card rounded-2xl border p-3.5">
      <h3 className="text-[10px] font-black uppercase tracking-[0.13em] text-[var(--erl-accent)]">
        {title}
      </h3>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--erl-muted)]">
        {text || 'No comment recorded.'}
      </p>
    </section>
  );
}

function SwipeHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <dialog
      open
      className="absolute inset-0 z-40 m-0 grid h-full max-h-none w-full max-w-none place-items-center border-0 bg-[var(--erl-dialog-overlay)] px-6 backdrop-blur-[2px]"
      aria-modal="true"
      aria-labelledby="swipe-hint-title"
    >
      <div className="erl-floating-card relative w-full max-w-[260px] rounded-[1.75rem] border px-6 pb-5 pt-5 text-center shadow-[0_0_42px_var(--erl-shadow)] backdrop-blur-xl">
        <button
          type="button"
          onClick={onDismiss}
          className="erl-icon-button absolute right-3 top-3 grid size-9 place-items-center rounded-full border transition"
          aria-label="Close swipe tutorial"
        >
          <X size={17} aria-hidden="true" />
        </button>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--erl-accent)]">
          Browse the tracker
        </p>
        <div className="relative mx-auto mt-2 h-28 w-20">
          <span className="swipe-demo-hand erl-icon-button absolute inset-x-0 bottom-0 mx-auto grid size-14 place-items-center rounded-full border shadow-lg">
            <span
              className="absolute -right-1 -top-1 size-3 animate-ping rounded-full border border-[var(--erl-accent)]"
              aria-hidden="true"
            />
            <Hand size={29} aria-hidden="true" />
          </span>
        </div>
        <p id="swipe-hint-title" className="text-sm font-black">
          Swipe up for the next issue
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-sun px-4 text-sm font-black text-ink transition hover:bg-[#ffd872]"
        >
          Got it
        </button>
      </div>
    </dialog>
  );
}

function ReelCard({
  issue,
  position,
  total,
}: {
  issue: ErlIssue;
  position: number;
  total: number;
}) {
  return (
    <article
      data-reel-index={position}
      className="relative flex h-full min-h-full max-h-full snap-start snap-always flex-col overflow-hidden bg-[var(--erl-reel)] px-5 pb-28 pt-28 text-[var(--erl-text)]"
    >
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <span className="erl-number-chip inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] shadow-[0_8px_24px_rgb(0_0_0/12%)] backdrop-blur">
          <span className="text-[var(--erl-text)]">
            Issue {String(issue.number).padStart(2, '0')}
          </span>
          <span
            className="text-[var(--erl-accent)] opacity-60"
            aria-hidden="true"
          >
            ·
          </span>
          <span className="text-[var(--erl-accent)]">
            {position + 1} of {total}
          </span>
        </span>
        <StatusBadge status={issue.status} />
      </div>

      <div className="relative z-10 my-auto py-4">
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="erl-chip rounded-full border px-3 py-1.5">
            {formatTower(issue.tower)}
          </span>
          <span className="erl-chip max-w-full truncate rounded-full border px-3 py-1.5">
            {issue.category}
          </span>
        </div>

        <h2 className="mt-4 line-clamp-5 font-heading text-[1.65rem] font-semibold leading-[1.08] tracking-[-0.035em]">
          {issue.title}
        </h2>

        <div className="mt-5 grid gap-2.5">
          <CommentBlock title="ERL response" text={issue.erlComment} />
          <CommentBlock
            title="TOA–ERL MoM · 29 Aug 2026"
            text={issue.momComment}
          />
        </div>
      </div>

      <div className="relative z-10 border-t border-[var(--erl-border)] pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="erl-meta-pill inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--erl-accent)]">
              Owner
            </span>
            <strong className="text-[11px] text-[var(--erl-text)]">
              {issue.owner}
            </strong>
          </span>
          <span className="erl-meta-pill inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--erl-muted)]">
              Raised by
            </span>
            <strong className="text-[11px] text-[var(--erl-text)]">
              {issue.raisedBy}
            </strong>
          </span>
        </div>
      </div>
    </article>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.09em] text-[var(--erl-muted)]">
      {label}
      <select
        className="erl-input min-h-12 w-full rounded-2xl border px-3 text-sm font-semibold normal-case tracking-normal outline-none transition"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompletionModal({
  completion,
  completed,
  total,
  onClose,
}: {
  completion: number;
  completed: number;
  total: number;
  onClose: () => void;
}) {
  const [displayedCompletion, setDisplayedCompletion] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { liveTotal: liveFundTotal } = useLiveFundSnapshot();
  const fundTargetCrores = (liveFundTotal / 10_000_000).toFixed(2);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduceMotion) {
      const timer = window.setTimeout(
        () => setDisplayedCompletion(completion),
        0,
      );
      return () => window.clearTimeout(timer);
    }

    const duration = 1400;
    const start = performance.now();
    let frame = 0;
    const animate = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedCompletion(Math.round(completion * eased));
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [completion]);

  useEffect(() => {
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <dialog
      open
      className="fixed inset-0 z-[100] m-0 grid h-full max-h-none w-full max-w-none place-items-center overflow-y-auto border-0 bg-[var(--erl-modal-overlay)] p-4 backdrop-blur-xl sm:p-8"
      aria-modal="true"
      aria-labelledby="completion-title"
      aria-describedby="completion-summary"
    >
      <section className="erl-modal-card w-full max-w-md rounded-[2rem] border p-6 shadow-[0_35px_100px_rgb(0_0_0/28%)] sm:p-8">
        <div>
          <h1
            id="completion-title"
            className="font-heading text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl"
          >
            ERL Progress Tracker
          </h1>

          <p
            id="completion-summary"
            className="mt-3 text-sm font-medium leading-relaxed text-[var(--erl-muted)] sm:text-base"
          >
            The owners plan to issue the NOC once all three categories reach
            100%. Close this window to view detailed information.
          </p>

          <div className="mt-7 space-y-6">
            {[
              {
                label: 'Civil works',
                value: `${completed} of ${total}`,
                progress: displayedCompletion,
              },
              {
                label: 'Fund transfer',
                value: `0 of ${fundTargetCrores} Crs`,
                progress: 0,
              },
              { label: 'Documents', value: 'No docs', progress: 0 },
            ].map((row, index) => (
              <div key={row.label}>
                <div className="flex items-center justify-between gap-4 text-sm sm:text-base">
                  <span className="font-bold text-[var(--erl-text)]">
                    {row.label}
                  </span>
                  <strong className="text-sm text-[var(--erl-muted)]">
                    {row.value}
                  </strong>
                </div>
                <progress
                  className="sr-only"
                  max={100}
                  value={row.progress}
                  aria-label={`${row.label} progress`}
                />
                <div
                  className="modal-progress-track relative mt-3 h-9 overflow-hidden rounded-xl bg-[var(--erl-progress-track)]"
                  style={{ animationDelay: `${index * 140}ms` }}
                  aria-hidden="true"
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-xl bg-sun transition-[width] duration-1000 ease-out"
                    style={{ width: `${row.progress}%` }}
                  />
                  <span className="relative z-10 grid h-full place-items-center text-sm font-bold tabular-nums text-[var(--erl-progress-label)] sm:text-base">
                    {Math.round(row.progress)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="mt-8 inline-flex min-h-13 w-full items-center justify-center rounded-2xl bg-sun px-5 text-sm font-black text-ink transition hover:bg-[#ffd872] focus:outline-none focus-visible:outline-none"
          >
            Close and View tracker
          </button>
        </div>
      </section>
    </dialog>
  );
}

function FilterSheet({
  open,
  query,
  status,
  category,
  tower,
  owner,
  categories,
  towers,
  resultCount,
  totalCount,
  onQueryChange,
  onStatusChange,
  onCategoryChange,
  onTowerChange,
  onOwnerChange,
  onReset,
  onClose,
}: {
  open: boolean;
  query: string;
  status: StatusFilter;
  category: string;
  tower: string;
  owner: string;
  categories: string[];
  towers: string[];
  resultCount: number;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onCategoryChange: (value: string) => void;
  onTowerChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 80);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-[80] m-0 flex h-full max-h-none w-full max-w-none items-end justify-center border-0 bg-transparent p-0"
      aria-modal="true"
      aria-labelledby="filter-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--erl-dialog-overlay)] backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close filters"
      />
      <section className="erl-filter-sheet relative max-h-[88svh] w-full overflow-y-auto rounded-t-[2rem] border border-b-0 px-5 pb-7 pt-3 shadow-[0_-24px_80px_rgb(7_26_32/18%)] sm:mb-5 sm:max-w-2xl sm:rounded-[2rem] sm:border sm:px-7">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--erl-border)] sm:hidden" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.13em] text-teal">
              Civil tracker
            </p>
            <h2
              id="filter-title"
              className="mt-1 font-heading text-3xl font-semibold text-[var(--erl-text)]"
            >
              Filter issues
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="erl-icon-button grid size-11 place-items-center rounded-full border transition"
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </div>

        <label className="erl-input mt-5 flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-[var(--erl-muted)]">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search issues</span>
          <input
            className="w-full bg-transparent text-sm font-semibold text-[var(--erl-text)] outline-none placeholder:font-normal placeholder:text-[var(--erl-muted)]"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search issue number, text or response"
          />
        </label>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <SelectFilter
            label="Status"
            value={status}
            onChange={(value) => onStatusChange(value as StatusFilter)}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'done', label: 'Done' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'not-done', label: 'Not Done' },
            ]}
          />
          <SelectFilter
            label="Category"
            value={category}
            onChange={onCategoryChange}
            options={[
              { value: 'all', label: 'All categories' },
              ...categories.map((value) => ({ value, label: value })),
            ]}
          />
          <SelectFilter
            label="Tower / block"
            value={tower}
            onChange={onTowerChange}
            options={[
              { value: 'all', label: 'All blocks' },
              ...towers.map((value) => ({ value, label: formatTower(value) })),
            ]}
          />
          <SelectFilter
            label="Owner"
            value={owner}
            onChange={onOwnerChange}
            options={[
              { value: 'all', label: 'All owners' },
              { value: 'ERL', label: 'ERL' },
              { value: 'TOA', label: 'TOA' },
            ]}
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className="erl-secondary-button inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black transition"
          >
            <RotateCcw size={16} /> Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-[1.4] rounded-2xl bg-ink px-4 text-sm font-black text-white transition hover:bg-[#173b46]"
          >
            Show {resultCount} of {totalCount}
          </button>
        </div>
      </section>
    </dialog>
  );
}

function LiveFundTotal({ liveTotal }: { liveTotal: number }) {
  return (
    <section className="erl-live-total relative overflow-hidden rounded-[2rem] border p-5 shadow-[0_0_48px_var(--erl-shadow)]">
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[var(--erl-accent)]">
            Live total due from ERL
          </p>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-300" />
            </span>
            Updating now
          </span>
        </div>

        <output
          className="mt-6 block overflow-hidden font-heading text-[clamp(2rem,9cqi,3rem)] font-semibold leading-none tracking-[-0.055em] text-[var(--erl-text)]"
          aria-label={`Current total due is ${formatRupees(liveTotal, 2)}`}
        >
          <span>{formatRupees(liveTotal, 2)}</span>
        </output>
      </div>
    </section>
  );
}

function ImportantFacts() {
  return (
    <section
      className="erl-section-card mt-6 rounded-[2rem] border p-5"
      aria-labelledby="important-facts-title"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--erl-accent)]">
        Facts for calculation
      </p>
      <h2
        id="important-facts-title"
        className="mt-1 font-heading text-3xl font-semibold tracking-[-0.035em]"
      >
        Important Facts
      </h2>

      <div className="mt-6 grid gap-3">
        <article className="erl-sub-card flex items-center gap-4 rounded-2xl border p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--erl-gold-border)] bg-[var(--erl-gold-soft)] text-[var(--erl-gold)]">
            <Calculator size={21} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--erl-muted)]">
              Interest percentage
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold text-[var(--erl-text)]">
              12.4%{' '}
              <span className="text-base text-[var(--erl-muted)]">
                per annum
              </span>
            </p>
          </div>
        </article>

        <article className="erl-sub-card flex items-center gap-4 rounded-2xl border p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--erl-accent-border)] bg-[var(--erl-accent-soft)] text-[var(--erl-accent)]">
            <ShieldCheck size={21} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--erl-muted)]">
              RERA order received
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold text-[var(--erl-text)]">
              September 2022
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

function TodayStamp() {
  const [today, setToday] = useState('');

  useEffect(() => {
    const update = () =>
      setToday(
        new Intl.DateTimeFormat('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Kolkata',
        }).format(new Date()),
      );
    const initialUpdate = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <span>
      Updated today
      {today ? ` · ${today}` : ''}
    </span>
  );
}

function FundTab({
  theme,
  onToggleTheme,
}: {
  theme: ColorTheme;
  onToggleTheme: () => void;
}) {
  const fundSnapshot = useLiveFundSnapshot();

  return (
    <section className="relative h-svh overflow-hidden bg-[var(--erl-page)] text-[var(--erl-text)]">
      <TrackerTopBar
        title="ERL Fund Transfer Tracker"
        summary={
          <>
            Promoter: ERL · <TodayStamp />
          </>
        }
        actions={<ThemeToggle theme={theme} onToggle={onToggleTheme} />}
      />

      <div className="h-full overflow-y-auto px-4 pb-32 pt-28">
        <div className="mx-auto w-full">
          <header className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[var(--erl-accent)]">
              TOA · Financial claim
            </p>
            <h1 className="mt-3 font-heading text-4xl font-semibold leading-[0.98] tracking-[-0.045em]">
              Revised dues payable by the promoter (ERL)
            </h1>
          </header>

          <LiveFundTotal liveTotal={fundSnapshot.liveTotal} />

          <section className="erl-section-card mt-6 rounded-[2rem] border p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--erl-accent)]">
                  Amount breakdown
                </p>
                <h2 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.035em]">
                  Revised dues as on today
                </h2>
              </div>
              <span className="erl-chip hidden rounded-full border px-3 py-1.5 text-xs font-bold sm:inline-flex">
                5 components
              </span>
            </div>

            <ol className="mt-6 grid gap-3">
              {fundDues.map((due, index) => (
                <li
                  key={due.label}
                  className="erl-sub-card rounded-2xl border p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--erl-chip)] text-[10px] font-black text-[var(--erl-accent)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold leading-5 text-[var(--erl-text)]">
                        {due.label}
                      </h3>
                      {'period' in due && (
                        <p className="mt-1 text-xs text-[var(--erl-muted)]">
                          {due.period}
                        </p>
                      )}
                    </div>
                  </div>
                  <strong className="mt-3 block pl-10 font-heading text-2xl font-semibold tracking-[-0.03em] text-[var(--erl-gold)]">
                    {formatRupees(
                      'liveInterest' in due
                        ? fundSnapshot.totalInterest
                        : due.amount,
                      2,
                    )}
                  </strong>
                </li>
              ))}
            </ol>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--erl-gold-border)] bg-[var(--erl-gold-soft)] p-4">
              <span className="text-xs font-black uppercase tracking-[0.13em] text-[var(--erl-gold)]">
                Total revised dues as on today
              </span>
              <strong className="font-heading text-2xl font-semibold text-[var(--erl-text)]">
                {formatRupees(fundSnapshot.liveTotal, 2)}
              </strong>
            </div>
          </section>

          <section className="erl-section-card mt-6 rounded-[2rem] border p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--erl-accent)]">
              Interest breakup
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold">
              Accumulated interest
            </h2>

            <dl className="mt-6 divide-y divide-[var(--erl-border)]">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-[var(--erl-muted)]">
                  Up to 5 September 2022
                </dt>
                <dd className="shrink-0 font-bold text-[var(--erl-text)]">
                  {formatRupees(fundInterestUpToOrder, 2)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-[var(--erl-muted)]">
                  Additional interest as on today
                </dt>
                <dd className="shrink-0 font-bold text-[var(--erl-text)]">
                  {formatRupees(fundSnapshot.additionalInterest, 2)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm font-bold text-[var(--erl-accent)]">
                  Total accumulated interest
                </dt>
                <dd className="shrink-0 font-black text-[var(--erl-gold)]">
                  {formatRupees(fundSnapshot.totalInterest, 2)}
                </dd>
              </div>
            </dl>
          </section>

          <ImportantFacts />
        </div>
      </div>
    </section>
  );
}

function DocumentsTab({
  theme,
  onToggleTheme,
}: {
  theme: ColorTheme;
  onToggleTheme: () => void;
}) {
  return (
    <section className="relative grid h-svh place-items-center bg-[var(--erl-page)] px-5 pb-24 text-center text-[var(--erl-text)]">
      <div className="absolute right-4 top-4">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <p className="font-heading text-2xl font-semibold tracking-[-0.025em] text-[var(--erl-muted)]">
        No data loaded yet
      </p>
    </section>
  );
}

export function IssueTracker({ issues }: { issues: ErlIssue[] }) {
  const [activeTab, setActiveTab] = useState<AppTab>('civil');
  const [theme, setTheme] = useState<ColorTheme>('dark');
  const [showCompletion, setShowCompletion] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState('all');
  const [tower, setTower] = useState('all');
  const [owner, setOwner] = useState('all');
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const reelRef = useRef<HTMLElement>(null);

  const categories = useMemo(
    () => [...new Set(issues.map((issue) => issue.category))].sort(),
    [issues],
  );
  const towers = useMemo(
    () => [...new Set(issues.map((issue) => issue.tower))].sort(),
    [issues],
  );
  const completed = useMemo(
    () => issues.filter((issue) => issue.status === 'done').length,
    [issues],
  );
  const completion = issues.length
    ? Math.round((completed / issues.length) * 100)
    : 0;

  const filteredIssues = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return issues.filter((issue) => {
      if (status !== 'all' && issue.status !== status) return false;
      if (category !== 'all' && issue.category !== category) return false;
      if (tower !== 'all' && issue.tower !== tower) return false;
      if (owner !== 'all' && issue.owner !== owner) return false;
      if (!needle) return true;
      return [
        String(issue.number),
        issue.title,
        issue.category,
        issue.tower,
        formatTower(issue.tower),
        issue.owner,
        issue.erlComment,
        issue.momComment,
      ].some((value) => value.toLowerCase().includes(needle));
    });
  }, [category, issues, owner, query, status, tower]);

  const activeFilterCount = [
    Boolean(query),
    status !== 'all',
    category !== 'all',
    tower !== 'all',
    owner !== 'all',
  ].filter(Boolean).length;

  const resetFilters = useCallback(() => {
    setQuery('');
    setStatus('all');
    setCategory('all');
    setTower('all');
    setOwner('all');
  }, []);

  const closeFilters = useCallback(() => setShowFilters(false), []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(colorThemeStorageKey, next);
      } catch {
        // The theme still changes for this visit when storage is unavailable.
      }
      return next;
    });
  }, []);

  const dismissSwipeHint = useCallback(() => {
    setShowSwipeHint(false);
    try {
      window.localStorage.setItem(swipeHintStorageKey, 'true');
    } catch {
      // The hint can still be dismissed when storage is unavailable.
    }
  }, []);

  useLayoutEffect(() => {
    reelRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [category, owner, query, status, tower]);

  useLayoutEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(colorThemeStorageKey);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
    } catch {
      // Dark mode remains the first-visit default when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    let shouldShow = true;
    try {
      shouldShow = window.localStorage.getItem(swipeHintStorageKey) !== 'true';
    } catch {}

    const timer = window.setTimeout(() => setShowSwipeHint(shouldShow), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={`erl-tracker-theme h-svh overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}
      data-theme={theme}
    >
      <main className="erl-app-shell relative mx-auto h-svh w-full max-w-[640px] overflow-hidden bg-[var(--erl-page)]">
        {activeTab === 'civil' ? (
          <section className="relative h-svh w-full overflow-hidden bg-[var(--erl-page)]">
          <TrackerTopBar
            title="ERL Civil Issues Tracker"
            summary={
              <>
                Total Issues: {issues.length} ·{' '}
                <span className="font-black text-[var(--erl-text)]">
                  {completion}% Completed
                </span>
              </>
            }
            actions={
              <>
                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  aria-label="Filter issues"
                  className="erl-icon-button relative inline-flex size-10 items-center justify-center gap-2 rounded-xl border text-sm font-black transition hover:-translate-y-0.5"
                >
                  <SlidersHorizontal size={19} aria-hidden="true" />
                  <span className="sr-only">Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-sun text-[10px] text-ink">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
                <a
                  href={siteHref('/erl-issues/admin')}
                  className="erl-icon-button grid size-10 place-items-center rounded-xl border transition hover:-translate-y-0.5"
                  aria-label="Open issue synchronization"
                >
                  <ShieldCheck size={19} aria-hidden="true" />
                </a>
              </>
            }
          />

          {filteredIssues.length === 0 ? (
            <div className="grid h-full place-items-center bg-[var(--erl-page)] px-8 pb-28 pt-28 text-center text-[var(--erl-text)]">
              <div>
                <Search className="mx-auto text-[var(--erl-muted)]" size={28} />
                <h2 className="mt-3 font-heading text-2xl font-semibold">
                  No matching issues
                </h2>
                <p className="mt-2 text-sm text-[var(--erl-muted)]">
                  Adjust the filters to return to the issue feed.
                </p>
                <button
                  className="mt-4 rounded-full bg-sun px-5 py-3 text-sm font-black text-ink"
                  type="button"
                  onClick={resetFilters}
                >
                  Clear filters
                </button>
              </div>
            </div>
          ) : (
            <section className="relative h-full overflow-hidden bg-[var(--erl-page)]">
              <section
                ref={reelRef}
                className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
                aria-label="Swipeable civil issue reel"
              >
                {filteredIssues.map((issue, index) => (
                  <ReelCard
                    key={issue.id}
                    issue={issue}
                    position={index}
                    total={filteredIssues.length}
                  />
                ))}
              </section>
            </section>
          )}

          {showSwipeHint && !showCompletion && filteredIssues.length > 1 && (
            <SwipeHint onDismiss={dismissSwipeHint} />
          )}
          </section>
        ) : activeTab === 'fund' ? (
          <FundTab theme={theme} onToggleTheme={toggleTheme} />
        ) : (
          <DocumentsTab theme={theme} onToggleTheme={toggleTheme} />
        )}
      </main>

      <nav
        className="erl-bottom-nav fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-[520px] -translate-x-1/2 items-center gap-1 rounded-[1.6rem] border p-1.5 shadow-[0_0_38px_var(--erl-nav-shadow)] ring-1 ring-inset ring-[var(--erl-ring)] backdrop-blur-2xl"
        aria-label="Progress sections"
      >
        {appTabs.map(({ id, label, icon: Icon }) => {
          const selected = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                setShowFilters(false);
              }}
              className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-[1.15rem] px-2 text-[10px] font-black transition ${
                selected
                  ? 'bg-[var(--erl-selected)] text-[var(--erl-text)] shadow-[0_6px_18px_rgb(0_0_0/16%)] ring-1 ring-inset ring-[var(--erl-border)]'
                  : 'text-[var(--erl-muted)] hover:bg-[var(--erl-hover)] hover:text-[var(--erl-text)]'
              }`}
              aria-current={selected ? 'page' : undefined}
            >
              {selected && (
                <span className="absolute top-1 h-0.5 w-6 rounded-full bg-sun" />
              )}
              <Icon
                className={selected ? 'text-[var(--erl-gold)]' : undefined}
                size={19}
                aria-hidden="true"
              />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {showCompletion && (
        <CompletionModal
          completion={completion}
          completed={completed}
          total={issues.length}
          onClose={() => setShowCompletion(false)}
        />
      )}

      <FilterSheet
        open={showFilters}
        query={query}
        status={status}
        category={category}
        tower={tower}
        owner={owner}
        categories={categories}
        towers={towers}
        resultCount={filteredIssues.length}
        totalCount={issues.length}
        onQueryChange={setQuery}
        onStatusChange={setStatus}
        onCategoryChange={setCategory}
        onTowerChange={setTower}
        onOwnerChange={setOwner}
        onReset={resetFilters}
        onClose={closeFilters}
      />
    </div>
  );
}
