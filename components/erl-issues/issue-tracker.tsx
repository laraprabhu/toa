'use client';

import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  Construction,
  FileText,
  FolderOpen,
  Hand,
  IndianRupee,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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

const reelStatusStyles: Record<IssueStatus, string> = {
  done: 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100',
  'in-progress': 'border-amber-300/40 bg-amber-300/15 text-amber-100',
  'not-done': 'border-rose-300/40 bg-rose-300/15 text-rose-100',
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

const swipeHintStorageKey = 'toa-erl-swipe-hint-seen';

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
    <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 text-white sm:p-4">
      <h3 className="text-[10px] font-black uppercase tracking-[0.13em] text-teal-200 sm:text-xs">
        {title}
      </h3>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-200 sm:line-clamp-4 sm:text-sm sm:leading-6 lg:line-clamp-5">
        {text || 'No comment recorded.'}
      </p>
    </section>
  );
}

function SwipeHint() {
  return (
    <output
      className="pointer-events-none absolute inset-0 z-40 grid place-items-center px-6"
      aria-live="polite"
    >
      <div className="w-full max-w-[240px] rounded-[1.75rem] border border-teal-300/20 bg-[#071a20]/94 px-6 pb-5 pt-4 text-center text-white shadow-[0_0_42px_rgb(45_212_191/24%)] backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-200">
          Browse the tracker
        </p>
        <div className="relative mx-auto mt-2 h-28 w-20">
          <span className="swipe-demo-hand absolute inset-x-0 bottom-0 mx-auto grid size-14 place-items-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg">
            <span
              className="absolute -right-1 -top-1 size-3 rounded-full border border-teal-200/70 animate-ping"
              aria-hidden="true"
            />
            <Hand size={29} aria-hidden="true" />
          </span>
        </div>
        <p className="text-sm font-black">Swipe up for the next issue</p>
      </div>
    </output>
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
      className="relative flex h-full min-h-full max-h-full snap-start snap-always flex-col overflow-hidden bg-[#0b222a] px-5 pb-28 pt-28 text-white sm:px-8 sm:pt-32 lg:px-10 lg:pt-36"
    >
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-xl border border-teal-300/20 bg-black/25 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] shadow-[0_8px_24px_rgb(0_0_0/18%)] backdrop-blur sm:text-sm">
          <span className="text-white">
            Issue {String(issue.number).padStart(2, '0')}
          </span>
          <span className="text-teal-300/60" aria-hidden="true">
            ·
          </span>
          <span className="text-teal-100">
            {position + 1} of {total}
          </span>
        </span>
        <StatusBadge status={issue.status} />
      </div>

      <div className="relative z-10 my-auto py-4 sm:py-6">
        <div className="flex flex-wrap gap-2 text-[11px] font-bold sm:text-xs">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-slate-100">
            {formatTower(issue.tower)}
          </span>
          <span className="max-w-full truncate rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-slate-100">
            {issue.category}
          </span>
        </div>

        <h2 className="mt-4 line-clamp-5 max-w-5xl font-heading text-[1.65rem] font-semibold leading-[1.08] tracking-[-0.035em] sm:mt-6 sm:line-clamp-4 sm:text-4xl lg:text-5xl">
          {issue.title}
        </h2>

        <div className="mt-5 grid gap-2.5 sm:mt-7 sm:grid-cols-2 sm:gap-3">
          <CommentBlock title="ERL response" text={issue.erlComment} />
          <CommentBlock
            title="TOA–ERL MoM · 29 Aug 2026"
            text={issue.momComment}
          />
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 pt-4 sm:pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/[0.08] px-3 py-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-teal-200">
              Owner
            </span>
            <strong className="text-[11px] text-white sm:text-xs">
              {issue.owner}
            </strong>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
              Raised by
            </span>
            <strong className="text-[11px] text-white sm:text-xs">
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
    <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.09em] text-slate-500">
      {label}
      <select
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none transition focus:border-teal focus:bg-white"
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
      className="fixed inset-0 z-[100] m-0 grid h-full max-h-none w-full max-w-none place-items-center overflow-y-auto border-0 bg-[#071a20]/88 p-4 backdrop-blur-xl sm:p-8"
      aria-modal="true"
      aria-labelledby="completion-title"
    >
      <section className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/15 bg-[radial-gradient(circle_at_100%_0%,rgba(246,200,88,0.2),transparent_38%),linear-gradient(160deg,#123641,#0a232b)] p-6 text-white shadow-[0_35px_100px_rgb(0_0_0/45%)] sm:p-8">
        <div className="absolute -right-10 -top-12 size-44 rounded-full border border-white/[0.06]" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.17em] text-teal-200">
            <Sparkles size={14} aria-hidden="true" /> TOA · ERL Progress
          </p>
          <h1
            id="completion-title"
            className="mt-4 max-w-sm font-heading text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl"
          >
            Verified civil work completion
          </h1>

          <div className="my-8 flex items-center justify-center">
            <div
              className="grid size-48 place-items-center rounded-full p-[10px] shadow-[0_0_70px_rgb(246_200_88/13%)] sm:size-56"
              style={{
                background: `conic-gradient(#f6c858 ${displayedCompletion * 3.6}deg, rgba(255,255,255,0.09) 0deg)`,
              }}
            >
              <div className="grid size-full place-items-center rounded-full border border-white/10 bg-[#0b252d] text-center shadow-inner">
                <div>
                  <strong
                    className="block font-heading text-7xl leading-none tracking-[-0.06em] text-white sm:text-8xl"
                    aria-live="polite"
                  >
                    {displayedCompletion}%
                  </strong>
                  <span className="mt-2 block text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                    Complete
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-300">Confirmed as complete</span>
              <strong className="text-white">
                {completed} of {total} issues
              </strong>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-sun transition-[width] duration-1000 ease-out"
                style={{ width: `${displayedCompletion}%` }}
              />
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            TOA marks work Done only when the available record shows no pending
            delivery, rework or verification gap.
          </p>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-sun px-5 text-sm font-black text-ink shadow-[0_12px_30px_rgb(246_200_88/18%)] transition hover:bg-[#ffd872]"
          >
            <X size={17} aria-hidden="true" /> Close and view tracker
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
        className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close filters"
      />
      <section className="relative max-h-[88svh] w-full overflow-y-auto rounded-t-[2rem] border border-b-0 border-slate-200 bg-white px-5 pb-7 pt-3 shadow-[0_-24px_80px_rgb(7_26_32/22%)] sm:mb-5 sm:max-w-2xl sm:rounded-[2rem] sm:border sm:px-7">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.13em] text-teal">
              Civil tracker
            </p>
            <h2
              id="filter-title"
              className="mt-1 font-heading text-3xl font-semibold text-ink"
            >
              Filter issues
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </div>

        <label className="mt-5 flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500 focus-within:border-teal focus-within:bg-white">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search issues</span>
          <input
            className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
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
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
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

function StaticTab({ tab }: { tab: Exclude<AppTab, 'civil'> }) {
  const isFund = tab === 'fund';
  const Icon = isFund ? IndianRupee : FileText;
  const title = isFund ? 'Fund tracking' : 'Project documents';
  const description = isFund
    ? 'The financial view will bring collections, expenditure and approval records together.'
    : 'The documents view will organise handover records, drawings, certificates and meeting files.';
  const placeholders = isFund
    ? ['Collection overview', 'Expenditure ledger', 'Approvals']
    : ['Handover records', 'Drawings & certificates', 'Meeting files'];

  return (
    <section className="h-svh overflow-y-auto bg-[#f3f6f5] px-5 pb-28 pt-6 sm:px-8 sm:pb-32 sm:pt-10">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_22px_70px_rgb(16_45_54/8%)]">
        <div className="bg-[radial-gradient(circle_at_90%_0%,rgba(246,200,88,0.24),transparent_34%),linear-gradient(145deg,#0d2a35,#071a20)] px-6 py-10 text-white sm:px-10 sm:py-14">
          <span className="grid size-14 place-items-center rounded-2xl bg-sun text-ink">
            <Icon size={27} aria-hidden="true" />
          </span>
          <p className="mt-7 text-xs font-black uppercase tracking-[0.17em] text-teal-200">
            Next module
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold tracking-[-0.035em] sm:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            {description}
          </p>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-8">
          {placeholders.map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5"
            >
              <div className="h-2 w-10 rounded-full bg-slate-200" />
              <h2 className="mt-5 font-heading text-xl font-semibold text-ink">
                {label}
              </h2>
              <p className="mt-2 text-sm text-slate-500">Coming soon</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function IssueTracker({ issues }: { issues: ErlIssue[] }) {
  const [activeTab, setActiveTab] = useState<AppTab>('civil');
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

  useLayoutEffect(() => {
    reelRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [category, owner, query, status, tower]);

  useEffect(() => {
    let shouldShow = true;
    try {
      shouldShow = window.localStorage.getItem(swipeHintStorageKey) !== 'true';
    } catch {}

    const timer = window.setTimeout(() => setShowSwipeHint(shouldShow), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showSwipeHint || showCompletion || activeTab !== 'civil') return;

    try {
      window.localStorage.setItem(swipeHintStorageKey, 'true');
    } catch {
      // The hint still works when storage is unavailable.
    }

    const timer = window.setTimeout(() => setShowSwipeHint(false), 3400);
    return () => window.clearTimeout(timer);
  }, [activeTab, showCompletion, showSwipeHint]);

  return (
    <>
      {activeTab === 'civil' ? (
        <section className="relative h-svh w-full overflow-hidden bg-ink">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pb-10 pt-3 sm:px-5 sm:pb-12 sm:pt-5">
            <div className="pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-2.5 text-white shadow-[0_14px_38px_rgb(45_212_191/20%)] backdrop-blur-xl sm:p-3">
              <div className="min-w-0 pl-1">
                <p className="truncate text-[11px] font-black uppercase tracking-[0.15em] text-teal-200 sm:text-sm lg:text-base">
                  ERL Civil Issues Tracker
                </p>
                <p className="mt-1 truncate text-[13px] font-semibold text-slate-300 sm:text-base lg:text-lg">
                  Total Issues: {issues.length} ·{' '}
                  <span className="font-black text-white">
                    {completion}% Completed
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  aria-label="Filter issues"
                  className="relative inline-flex size-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 text-sm font-black text-white transition hover:bg-white/15 sm:h-12 sm:w-auto sm:px-4 sm:text-base"
                >
                  <SlidersHorizontal size={19} aria-hidden="true" />
                  <span className="hidden sm:inline">Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-sun text-[10px] text-ink sm:static">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <a
                  href={siteHref('/erl-issues/admin')}
                  className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 sm:size-12"
                  aria-label="Open issue administration"
                >
                  <ShieldCheck size={19} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="grid h-full place-items-center bg-ink px-8 pb-28 pt-28 text-center text-white">
              <div>
                <Search className="mx-auto text-slate-500" size={28} />
                <h2 className="mt-3 font-heading text-2xl font-semibold">
                  No matching issues
                </h2>
                <p className="mt-2 text-sm text-slate-400">
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
            <section className="relative h-full overflow-hidden bg-ink">
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
            <SwipeHint />
          )}
        </section>
      ) : (
        <StaticTab tab={activeTab} />
      )}

      <nav
        className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-[520px] -translate-x-1/2 items-center gap-1 rounded-[1.6rem] border border-white/15 bg-[#071a20]/94 p-1.5 shadow-[0_0_38px_rgb(45_212_191/25%)] ring-1 ring-inset ring-white/[0.05] backdrop-blur-2xl sm:bottom-6"
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
              className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-[1.15rem] px-2 text-[10px] font-black transition sm:flex-row sm:gap-2 sm:text-xs ${
                selected
                  ? 'bg-white/[0.13] text-white shadow-[0_6px_18px_rgb(0_0_0/28%)] ring-1 ring-inset ring-white/15'
                  : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
              }`}
              aria-current={selected ? 'page' : undefined}
            >
              {selected && (
                <span className="absolute top-1 h-0.5 w-6 rounded-full bg-sun" />
              )}
              <Icon
                className={selected ? 'text-sun' : undefined}
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
    </>
  );
}
