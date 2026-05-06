import { Skeleton, SkeletonGroup } from './skeleton';
import CardSkeleton from './CardSkeleton';
import TableSkeleton from './TableSkeleton';

/* ══════════════════════════════════════════════════════════════════════
   PAGE-SPECIFIC SKELETON SCREENS
   ────────────────────────────────
   These mirror the exact layout of each page for a polished
   content-aware loading experience (YouTube/LinkedIn pattern).
   ══════════════════════════════════════════════════════════════════════ */

/* ── Dashboard Page Skeleton ──────────────────────────────────────── */
export function DashboardSkeleton() {
  return (
    <div className="px-4 py-3.5 min-h-full space-y-4">
      {/* Alert banner placeholder */}
      <SkeletonGroup className="rounded-none border-l-[3px] border-l-border bg-card px-3.5 py-3">
        <Skeleton variant="text" className="h-3 w-24 mb-2" delay={0} />
        <Skeleton variant="text" className="h-4 w-3/4" delay={40} />
        <Skeleton variant="text" className="h-3 w-1/2 mt-2" delay={80} />
      </SkeletonGroup>

      {/* Page header */}
      <SkeletonGroup className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton variant="text" className="h-2.5 w-20" delay={0} />
          <Skeleton variant="text" className="h-6 w-48" delay={40} />
          <Skeleton variant="text" className="h-3 w-64" delay={80} />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="rounded" className="h-9 w-32" delay={120} />
          <Skeleton variant="rounded" className="h-9 w-28" delay={160} />
        </div>
      </SkeletonGroup>

      {/* Cross-border alerts panel */}
      <div className="bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" className="h-4 w-4" />
            <Skeleton variant="text" className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="h-7 w-14" />
            <Skeleton variant="rounded" className="h-7 w-16" />
          </div>
        </div>
        <div className="px-4 py-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="flex-1 space-y-1.5">
                <Skeleton variant="text" className="h-3.5 w-3/4" delay={i * 70} />
                <Skeleton variant="text" className="h-3 w-1/2" delay={i * 70 + 30} />
              </div>
              <Skeleton variant="circular" className="h-8 w-8 shrink-0" delay={i * 70 + 60} />
            </div>
          ))}
        </div>
      </div>

      {/* KPI Stats — 4-col */}
      <div>
        <Skeleton variant="text" className="h-2.5 w-28 mb-1.5" />
        <CardSkeleton
          count={4}
          variant="stat"
          gridClassName="grid grid-cols-2 lg:grid-cols-4 gap-0 border-l border-t border-border"
        />
      </div>

      {/* Map + Live Feed Row */}
      <div className="flex flex-wrap gap-3.5">
        {/* Map placeholder */}
        <div className="flex-[3_1_340px] bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" className="h-4 w-4" />
              <Skeleton variant="text" className="h-4 w-36" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton variant="rounded" className="h-6 w-28" />
              <Skeleton variant="rounded" className="h-6 w-16" />
            </div>
          </div>
          <Skeleton variant="rectangular" className="h-[320px] w-full" />
        </div>

        {/* Live feed placeholder */}
        <div className="flex-[1_1_280px] bg-card">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <Skeleton variant="text" className="h-4 w-20" />
            <Skeleton variant="rounded" className="h-6 w-12" />
          </div>
          <CardSkeleton
            count={5}
            variant="compact"
            showAvatar={false}
            gridClassName="grid grid-cols-1 gap-0 px-3 py-2"
            cardClassName="rounded-none border-0 border-b border-border/30 px-0 py-2.5"
          />
        </div>
      </div>

      {/* Charts row */}
      <div className="flex flex-wrap gap-3.5">
        <div className="flex-[2_1_380px] bg-card p-4">
          <Skeleton variant="text" className="h-4 w-32 mb-3" />
          <Skeleton variant="rounded" className="h-[200px] w-full" />
        </div>
        <div className="flex-[1_1_280px] bg-card p-4">
          <Skeleton variant="text" className="h-4 w-28 mb-3" />
          <div className="flex items-center justify-center h-[200px]">
            <Skeleton variant="circular" className="h-[160px] w-[160px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Incidents Page Skeleton ──────────────────────────────────────── */
export function IncidentsSkeleton() {
  return (
    <div className="min-h-full bg-[var(--surface)] px-4 py-4 space-y-4">
      {/* Page header */}
      <SkeletonGroup className="border-b border-border pb-4">
        <Skeleton variant="text" className="h-5 w-36 mb-1" delay={0} />
        <Skeleton variant="text" className="h-3 w-48" delay={40} />
      </SkeletonGroup>

      {/* Tab bar */}
      <div className="flex gap-3 border-b border-border pb-0">
        <Skeleton variant="text" className="h-8 w-28" />
        <Skeleton variant="text" className="h-8 w-24" />
      </div>

      {/* Filter bar */}
      <SkeletonGroup className="flex flex-wrap items-center gap-2.5 border border-border bg-card px-3.5 py-3">
        <Skeleton variant="rounded" className="h-9 flex-[2_1_200px]" delay={0} />
        <Skeleton variant="rounded" className="h-9 w-32" delay={40} />
        <Skeleton variant="rounded" className="h-9 w-28" delay={80} />
        <Skeleton variant="rounded" className="h-9 w-28" delay={120} />
      </SkeletonGroup>

      {/* Table */}
      <TableSkeleton rows={8} columns={7} showHeader showActions />
    </div>
  );
}

/* ── Reports Page Skeleton ────────────────────────────────────────── */
export function ReportsSkeleton() {
  return (
    <div className="min-h-full bg-[var(--surface)] px-4 py-4 space-y-4">
      {/* Page header */}
      <SkeletonGroup className="border-b border-border pb-4">
        <Skeleton variant="text" className="h-5 w-32 mb-1" delay={0} />
        <Skeleton variant="text" className="h-3 w-56" delay={40} />
      </SkeletonGroup>

      {/* Summary cards */}
      <CardSkeleton
        count={4}
        variant="stat"
        gridClassName="grid grid-cols-2 lg:grid-cols-4 gap-0 border-l border-t border-border"
      />

      {/* Search + Filter */}
      <SkeletonGroup className="flex flex-wrap items-center gap-2.5 border border-border bg-card px-3.5 py-3">
        <Skeleton variant="rounded" className="h-9 flex-[2_1_200px]" />
        <Skeleton variant="rounded" className="h-9 w-32" />
        <Skeleton variant="rounded" className="h-9 w-28" />
      </SkeletonGroup>

      {/* Table */}
      <TableSkeleton rows={8} columns={6} showHeader />
    </div>
  );
}

/* ── Citizen Dashboard Skeleton ───────────────────────────────────── */
export function CitizenDashboardSkeleton() {
  return (
    <div className="citizen-content-shell px-4 lg:px-5 pt-4 pb-[18px] space-y-4">
      {/* Greeting header */}
      <SkeletonGroup className="border-b border-border pb-4">
        <Skeleton variant="text" className="h-2.5 w-32 mb-2" delay={0} />
        <Skeleton variant="text" className="h-7 w-48 mb-1" delay={40} />
        <Skeleton variant="text" className="h-3 w-40" delay={80} />
      </SkeletonGroup>

      {/* Verification banner */}
      <SkeletonGroup className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" className="h-10 w-10 shrink-0" delay={0} />
          <div className="flex-1 space-y-1.5">
            <Skeleton variant="text" className="h-4 w-2/5" delay={40} />
            <Skeleton variant="text" className="h-3 w-3/5" delay={80} />
          </div>
          <Skeleton variant="rounded" className="h-6 w-16 shrink-0" delay={120} />
        </div>
      </SkeletonGroup>

      {/* Stat cards */}
      <CardSkeleton
        count={3}
        lines={0}
        showImage={false}
        gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        cardClassName="rounded-xl flex items-center min-h-[112px] p-0 overflow-hidden"
      />

      {/* Quick actions */}
      <SkeletonGroup className="space-y-2">
        <Skeleton variant="text" className="h-3 w-24 mb-2" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3.5 rounded-lg border border-border bg-card px-4 py-4">
            <Skeleton variant="rounded" className="h-10 w-10 shrink-0" delay={i * 70} />
            <div className="flex-1 space-y-1.5">
              <Skeleton variant="text" className="h-4 w-1/3" delay={i * 70 + 30} />
              <Skeleton variant="text" className="h-3 w-2/3" delay={i * 70 + 60} />
            </div>
          </div>
        ))}
      </SkeletonGroup>

      {/* Map preview */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <Skeleton variant="text" className="h-4 w-28" />
          <Skeleton variant="rounded" className="h-6 w-16" />
        </div>
        <Skeleton variant="rectangular" className="h-[200px] w-full" />
      </div>

      {/* Recent reports */}
      <CardSkeleton
        count={4}
        variant="compact"
        showAvatar={false}
        gridClassName="grid grid-cols-1 gap-0"
        cardClassName="rounded-none border-x-0 border-t-0 border-b border-border/50 px-0 py-3"
      />
    </div>
  );
}

/* ── Analytics Page Skeleton ──────────────────────────────────────── */
export function AnalyticsSkeleton() {
  return (
    <div className="min-h-full bg-[var(--surface)] px-4 py-4 space-y-4">
      {/* Header */}
      <SkeletonGroup className="border-b border-border pb-4">
        <Skeleton variant="text" className="h-5 w-28 mb-1" />
        <Skeleton variant="text" className="h-3 w-44" />
      </SkeletonGroup>

      {/* Date filter */}
      <div className="flex gap-2">
        <Skeleton variant="rounded" className="h-9 w-36" />
        <Skeleton variant="rounded" className="h-9 w-36" />
        <Skeleton variant="rounded" className="h-9 w-20" />
      </div>

      {/* KPI row */}
      <CardSkeleton
        count={4}
        variant="stat"
        gridClassName="grid grid-cols-2 lg:grid-cols-4 gap-0 border-l border-t border-border"
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <Skeleton variant="text" className="h-4 w-32 mb-3" delay={i * 80} />
            <Skeleton variant="rounded" className="h-[240px] w-full" delay={i * 80 + 40} />
          </div>
        ))}
      </div>

      {/* Breakdown table */}
      <TableSkeleton rows={6} columns={4} showHeader />
    </div>
  );
}

/* ── Verifications Page Skeleton ──────────────────────────────────── */
export function VerificationsSkeleton() {
  return (
    <div className="min-h-full bg-[var(--surface)] px-4 py-4 space-y-4">
      <SkeletonGroup className="border-b border-border pb-4">
        <Skeleton variant="text" className="h-5 w-32 mb-1" />
        <Skeleton variant="text" className="h-3 w-48" />
      </SkeletonGroup>

      {/* Filter */}
      <div className="flex gap-2">
        <Skeleton variant="rounded" className="h-9 flex-1 max-w-xs" />
        <Skeleton variant="rounded" className="h-9 w-28" />
      </div>

      {/* Verification cards */}
      <CardSkeleton
        count={4}
        variant="compact"
        showAvatar
      />
    </div>
  );
}
