'use client';

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleDashed,
  Clock3,
  LayoutList,
  RotateCcw,
  Search,
  Smartphone,
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

type ViewMode = 'list' | 'reel';
type StatusFilter = IssueStatus | 'all';

const statusStyles: Record<IssueStatus, string> = {
  done: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  'in-progress': 'border-amber-300 bg-amber-100 text-amber-950',
  'not-done': 'border-rose-300 bg-rose-100 text-rose-950',
};

const reelStatusStyles: Record<IssueStatus, string> = {
  done: 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100',
  'in-progress': 'border-amber-300/40 bg-amber-300/15 text-amber-100',
  'not-done': 'border-rose-300/40 bg-rose-300/15 text-rose-100',
};

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

function StatusBadge({
  status,
  reel = false,
}: {
  status: IssueStatus;
  reel?: boolean;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] ${
        reel ? reelStatusStyles[status] : statusStyles[status]
      }`}
    >
      <StatusIcon status={status} />
      {issueStatusLabels[status]}
    </span>
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
    <label className="grid min-w-[160px] gap-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
      {label}
      <select
        className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-800 shadow-sm outline-none transition focus:border-teal"
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

function IssueListCard({ issue }: { issue: ErlIssue }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgb(15_45_54/6%)] sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-8 items-center rounded-full bg-slate-950 px-3 text-xs font-black tracking-[0.1em] text-white">
              ISSUE {String(issue.number).padStart(2, '0')}
            </span>
            <StatusBadge status={issue.status} />
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              {formatTower(issue.tower)}
            </span>
          </div>
          <h2 className="max-w-4xl font-heading text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-3xl">
            {issue.title}
          </h2>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            <span>
              <strong className="text-slate-900">Category:</strong>{' '}
              {issue.category}
            </span>
            <span>
              <strong className="text-slate-900">Owner:</strong> {issue.owner}
            </span>
            <span>
              <strong className="text-slate-900">Raised by:</strong>{' '}
              {issue.raisedBy}
            </span>
          </div>
        </div>
      </div>

      <details className="group mt-6 rounded-2xl border border-slate-200 bg-slate-50">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-bold text-slate-800">
          View ERL response and meeting record
          <span className="text-xs font-semibold text-teal group-open:hidden">
            Open
          </span>
          <span className="hidden text-xs font-semibold text-teal group-open:inline">
            Close
          </span>
        </summary>
        <div className="grid gap-4 border-t border-slate-200 p-4 lg:grid-cols-2">
          <CommentBlock title="ERL response" text={issue.erlComment} />
          <CommentBlock
            title="TOA–ERL MoM · 29 Aug 2026"
            text={issue.momComment}
          />
        </div>
      </details>
    </article>
  );
}

function CommentBlock({
  title,
  text,
  dark = false,
}: {
  title: string;
  text: string;
  dark?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border p-4 ${
        dark
          ? 'border-white/10 bg-white/[0.06] text-white'
          : 'border-slate-200 bg-white text-slate-800'
      }`}
    >
      <h3
        className={`text-xs font-black uppercase tracking-[0.11em] ${
          dark ? 'text-teal-200' : 'text-teal'
        }`}
      >
        {title}
      </h3>
      <p
        className={`mt-2 text-sm leading-6 ${
          dark
            ? 'line-clamp-4 text-slate-200 sm:line-clamp-5 lg:line-clamp-none'
            : 'text-slate-700'
        }`}
      >
        {text || 'No comment recorded.'}
      </p>
    </section>
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
      className="relative flex h-full min-h-full max-h-full snap-start snap-always flex-col overflow-hidden bg-[radial-gradient(circle_at_90%_0%,rgba(246,200,88,0.22),transparent_34%),linear-gradient(145deg,#0d2a35,#092129_55%,#071a20)] p-5 text-white sm:p-10"
    >
      <div className="absolute -right-10 top-16 select-none font-heading text-[11rem] font-bold leading-none text-white/[0.035] sm:text-[17rem]">
        {issue.number}
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
          Issue {String(issue.number).padStart(2, '0')} · {position + 1} of{' '}
          {total}
        </span>
        <StatusBadge status={issue.status} reel />
      </div>

      <div className="relative z-10 my-auto py-4 sm:py-8">
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-slate-100">
            {formatTower(issue.tower)}
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-slate-100">
            {issue.category}
          </span>
        </div>
        <h2 className="mt-5 max-w-4xl font-heading text-2xl font-semibold leading-[1.08] tracking-[-0.035em] sm:mt-6 sm:text-5xl">
          {issue.title}
        </h2>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <CommentBlock title="ERL response" text={issue.erlComment} dark />
          <CommentBlock
            title="TOA–ERL MoM · 29 Aug 2026"
            text={issue.momComment}
            dark
          />
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs font-semibold text-slate-300">
        <span>
          Owner: {issue.owner} · Raised by: {issue.raisedBy}
        </span>
        <span className="inline-flex items-center gap-2">
          <ArrowDown size={14} aria-hidden="true" /> Swipe for next issue
        </span>
      </div>
    </article>
  );
}

export function IssueTracker({ issues }: { issues: ErlIssue[] }) {
  const [view, setView] = useState<ViewMode>('list');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState('all');
  const [tower, setTower] = useState('all');
  const [owner, setOwner] = useState('all');
  const [activeReel, setActiveReel] = useState(0);
  const reelRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () => [...new Set(issues.map((issue) => issue.category))].sort(),
    [issues],
  );
  const towers = useMemo(
    () => [...new Set(issues.map((issue) => issue.tower))].sort(),
    [issues],
  );

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

  const counts = useMemo(
    () => ({
      done: issues.filter((issue) => issue.status === 'done').length,
      inProgress: issues.filter((issue) => issue.status === 'in-progress')
        .length,
      notDone: issues.filter((issue) => issue.status === 'not-done').length,
    }),
    [issues],
  );
  const completion = issues.length
    ? Math.round((counts.done / issues.length) * 100)
    : 0;

  const resetFilters = useCallback(() => {
    setQuery('');
    setStatus('all');
    setCategory('all');
    setTower('all');
    setOwner('all');
  }, []);

  const scrollToReel = useCallback(
    (index: number) => {
      const bounded = Math.max(0, Math.min(index, filteredIssues.length - 1));
      const root = reelRef.current;
      const target = root?.querySelector<HTMLElement>(
        `[data-reel-index="${bounded}"]`,
      );
      if (root && target) {
        root.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
      }
    },
    [filteredIssues.length],
  );

  useLayoutEffect(() => {
    reelRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [category, owner, query, status, tower, view]);

  useEffect(() => {
    if (view !== 'reel' || !reelRef.current) return;
    const root = reelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const index = Number(
          (visible?.target as HTMLElement | undefined)?.dataset.reelIndex,
        );
        if (Number.isInteger(index)) setActiveReel(index);
      },
      { root, threshold: [0.55, 0.75] },
    );
    root
      .querySelectorAll<HTMLElement>('[data-reel-index]')
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [filteredIssues, view]);

  const filtersActive =
    Boolean(query) ||
    status !== 'all' ||
    category !== 'all' ||
    tower !== 'all' ||
    owner !== 'all';

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-ink p-5 text-white shadow-[0_16px_44px_rgb(16_45_54/16%)]">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
            Verified completion
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <strong className="font-heading text-5xl leading-none">
              {completion}%
            </strong>
            <span className="text-sm text-slate-300">
              {counts.done} of {issues.length}
            </span>
          </div>
        </div>
        <SummaryCard status="done" value={counts.done} />
        <SummaryCard status="in-progress" value={counts.inProgress} />
        <SummaryCard status="not-done" value={counts.notDone} />
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_42px_rgb(15_45_54/6%)] sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <label className="grid flex-1 gap-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            Search issues
            <span className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-teal">
              <Search size={17} aria-hidden="true" />
              <input
                className="w-full bg-transparent text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Number, issue, response…"
              />
            </span>
          </label>

          <fieldset className="flex gap-2 rounded-xl bg-slate-100 p-1">
            <legend className="sr-only">View mode</legend>
            <button
              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition xl:flex-none ${
                view === 'list'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-slate-500'
              }`}
              type="button"
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
            >
              <LayoutList size={17} aria-hidden="true" /> List
            </button>
            <button
              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition xl:flex-none ${
                view === 'reel'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-slate-500'
              }`}
              type="button"
              onClick={() => setView('reel')}
              aria-pressed={view === 'reel'}
            >
              <Smartphone size={17} aria-hidden="true" /> Reel
            </button>
          </fieldset>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          <SelectFilter
            label="Status"
            value={status}
            onChange={(value) => setStatus(value as StatusFilter)}
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
            onChange={setCategory}
            options={[
              { value: 'all', label: 'All categories' },
              ...categories.map((value) => ({ value, label: value })),
            ]}
          />
          <SelectFilter
            label="Tower / block"
            value={tower}
            onChange={setTower}
            options={[
              { value: 'all', label: 'All blocks' },
              ...towers.map((value) => ({ value, label: formatTower(value) })),
            ]}
          />
          <SelectFilter
            label="Owner"
            value={owner}
            onChange={setOwner}
            options={[
              { value: 'all', label: 'All owners' },
              { value: 'ERL', label: 'ERL' },
              { value: 'TOA', label: 'TOA' },
            ]}
          />
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-[19px] inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-bold text-teal transition hover:bg-teal/10"
            >
              <RotateCcw size={16} aria-hidden="true" /> Reset
            </button>
          )}
        </div>
      </section>

      <div className="my-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>
          Showing{' '}
          <strong className="text-slate-950">{filteredIssues.length}</strong> of{' '}
          {issues.length} issues
        </p>
        <p className="max-w-2xl text-xs leading-5">
          Status is assessed conservatively for TOA. A delivery is marked Done
          only when the record shows no remaining work or verification gap.
        </p>
      </div>

      {filteredIssues.length === 0 ? (
        <div className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div>
            <Search className="mx-auto text-slate-400" size={28} />
            <h2 className="mt-3 font-heading text-2xl font-semibold text-ink">
              No matching issues
            </h2>
            <button
              className="mt-3 text-sm font-bold text-teal"
              type="button"
              onClick={resetFilters}
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : view === 'list' ? (
        <section className="grid gap-4" aria-label="Issue list">
          {filteredIssues.map((issue) => (
            <IssueListCard key={issue.id} issue={issue} />
          ))}
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-ink shadow-[0_26px_80px_rgb(7_26_32/24%)]">
          <section
            ref={reelRef}
            className="h-[calc(100svh-10rem)] min-h-[620px] max-h-[820px] snap-y snap-mandatory overflow-y-auto overscroll-contain"
            aria-label="Swipeable issue reel"
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
          <div className="pointer-events-none absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
            <button
              type="button"
              className="pointer-events-auto grid size-11 place-items-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur disabled:opacity-30"
              onClick={() => scrollToReel(activeReel - 1)}
              disabled={activeReel === 0}
              aria-label="Previous issue"
            >
              <ArrowUp size={18} />
            </button>
            <button
              type="button"
              className="pointer-events-auto grid size-11 place-items-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur disabled:opacity-30"
              onClick={() => scrollToReel(activeReel + 1)}
              disabled={activeReel === filteredIssues.length - 1}
              aria-label="Next issue"
            >
              <ArrowDown size={18} />
            </button>
          </div>
        </section>
      )}
    </>
  );
}

function SummaryCard({
  status,
  value,
}: {
  status: IssueStatus;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgb(15_45_54/5%)]">
      <StatusBadge status={status} />
      <div className="mt-4 flex items-end justify-between gap-4">
        <strong className="font-heading text-5xl leading-none text-ink">
          {value}
        </strong>
        <span className="text-sm text-slate-500">issues</span>
      </div>
    </div>
  );
}
