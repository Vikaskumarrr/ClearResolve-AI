import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";

/* --------------------------------- Types ---------------------------------- */

type JobStatus = "queued" | "running" | "completed" | "failed";

interface Job {
  _id: string;
  kind: "file" | "url";
  sourceId: string;
  status: JobStatus;
  progress: { processedDocuments: number; storedChunks: number };
  result?: { documents: number; chunks: number };
  error?: string;
  createdAt: string;
  completedAt?: string;
}

const ACTIVE_STATUSES: JobStatus[] = ["queued", "running"];
const POLL_INTERVAL_MS = 2000;

/* -------------------------------- Helpers --------------------------------- */

function isActive(job: Job): boolean {
  return ACTIVE_STATUSES.includes(job.status);
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

const STATUS_STYLES: Record<JobStatus, string> = {
  queued:
    "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 ring-1 ring-zinc-500/20",
  running:
    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20",
  completed:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20",
  failed:
    "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20",
};

/* ---------------------------------- Page ---------------------------------- */

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref of the interval so we can clean it up reliably.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track mounted state so late fetches don't set state after unmount.
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Fetch the full job list. Returns the fetched jobs (or null on failure).
  const fetchJobs = useCallback(async (): Promise<Job[] | null> => {
    try {
      const res = await fetch("/api/jobs", { credentials: "include" });

      if (res.status === 401) {
        if (mountedRef.current) {
          setUnauthenticated(true);
          setError(null);
        }
        return null;
      }

      if (!res.ok) {
        if (mountedRef.current) setError("Failed to load jobs.");
        return null;
      }

      const data = (await res.json()) as Job[] | { jobs?: Job[] };
      const list = Array.isArray(data) ? data : data.jobs ?? [];

      if (mountedRef.current) {
        setJobs(list);
        setUnauthenticated(false);
        setError(null);
      }
      return list;
    } catch {
      if (mountedRef.current) setError("Failed to reach the server.");
      return null;
    }
  }, []);

  // Poll a single running job and merge its latest state into the list.
  const pollJob = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, { credentials: "include" });
      if (!res.ok) return;
      const updated = (await res.json()) as Job;
      if (!mountedRef.current || !updated?._id) return;
      setJobs((prev) =>
        prev.map((j) => (j._id === updated._id ? updated : j))
      );
    } catch {
      // Ignore transient polling errors; the next tick will retry.
    }
  }, []);

  // (Re)start polling based on which jobs are currently active.
  const managePolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      setJobs((current) => {
        const active = current.filter(isActive);
        if (active.length === 0) {
          stopPolling();
          return current;
        }
        // Fire off per-job polls for the active jobs.
        active.forEach((j) => void pollJob(j._id));
        return current;
      });
    }, POLL_INTERVAL_MS);
  }, [pollJob, stopPolling]);

  // Initial load.
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      const list = await fetchJobs();
      if (mountedRef.current) setLoading(false);
      if (list && list.some(isActive)) managePolling();
    })();

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [fetchJobs, managePolling, stopPolling]);

  // Whenever the job list changes, ensure polling matches the active set.
  useEffect(() => {
    if (loading) return;
    const hasActive = jobs.some(isActive);
    if (hasActive && pollRef.current === null) {
      managePolling();
    } else if (!hasActive) {
      stopPolling();
    }
  }, [jobs, loading, managePolling, stopPolling]);

  async function refresh() {
    setLoading(true);
    await fetchJobs();
    if (mountedRef.current) setLoading(false);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(99,102,241,0.14),transparent)]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3.5">
          <Link to="/" className="flex items-center gap-3" aria-label="Back to home">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="m7 14 4-4 3 3 5-6" />
              </svg>
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold tracking-tight">
                Ingestion Dashboard
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Track your document jobs
              </p>
            </div>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <button
              onClick={refresh}
              className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/[0.08]"
            >
              Refresh
            </button>
            <Link
              to="/chat"
              className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:opacity-90"
            >
              Open Chat
            </Link>
          </nav>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-5xl px-5 py-8">
        {loading ? (
          <LoadingState />
        ) : unauthenticated ? (
          <UnauthenticatedState />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : jobs.length === 0 ? (
          <EmptyState />
        ) : (
          <JobsTable jobs={jobs} />
        )}
      </main>
    </div>
  );
}

/* ------------------------------- Job table -------------------------------- */

function JobsTable({ jobs }: { jobs: Job[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold tracking-tight">
          Your jobs
          <span className="ml-2 text-zinc-400">({jobs.length})</span>
        </h2>
        {jobs.some(isActive) && (
          <span className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
            Live
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {jobs.map((job) => (
          <JobCard key={job._id} job={job} />
        ))}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-5 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {job.kind}
            </span>
            <StatusBadge status={job.status} />
          </div>
          <p
            className="mt-2 truncate text-sm font-medium text-zinc-800 dark:text-zinc-100"
            title={job.sourceId}
          >
            {job.sourceId}
          </p>
        </div>

        <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
          <p>Created {formatDate(job.createdAt)}</p>
          {job.completedAt && <p>Finished {formatDate(job.completedAt)}</p>}
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="Docs processed"
          value={job.result?.documents ?? job.progress.processedDocuments}
        />
        <Metric
          label="Chunks stored"
          value={job.result?.chunks ?? job.progress.storedChunks}
        />
        {job.status === "completed" && job.result && (
          <>
            <Metric label="Total docs" value={job.result.documents} />
            <Metric label="Total chunks" value={job.result.chunks} />
          </>
        )}
      </div>

      {/* Running indicator */}
      {isActive(job) && (
        <div className="mt-4 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          {job.status === "queued" ? "Waiting to start…" : "Processing…"}
        </div>
      )}

      {/* Error message */}
      {job.status === "failed" && job.error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {job.error}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-lg font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
        {value}
      </p>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {status === "running" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {status}
    </span>
  );
}

/* ------------------------------ Empty states ------------------------------ */

function LoadingState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        Loading your jobs…
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30">
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M9 15h6M9 11h2" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold tracking-tight">No jobs yet</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        Upload a document or start a website ingestion and it will show up here
        with live progress.
      </p>
      <Link
        to="/chat"
        className="mt-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:opacity-90"
      >
        Go to Chat
      </Link>
    </div>
  );
}

function UnauthenticatedState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30">
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Please sign in</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        You need to be signed in to view your ingestion jobs.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-full border border-black/10 bg-white/70 px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/[0.08]"
      >
        Back to home
      </Link>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="mt-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
