import { Link } from 'react-router';
import { ArrowRight, Home } from 'lucide-react';
import { useDocumentHead } from '../hooks/useDocumentHead';
import { getAuthSession } from '../utils/authSession';
import { resolveDefaultAppPath } from '../utils/navigationGuards';

export default function NotFound() {
  useDocumentHead({
    title: 'Page not found — TUGON',
    description: 'The page you were looking for could not be found on TUGON.',
    noindex: true,
  });

  const session = getAuthSession();
  const dashboardPath = resolveDefaultAppPath(session);
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="min-h-screen bg-[var(--surface)] px-5 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col items-center justify-center text-center">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--on-surface-variant)]">
          Error 404
        </p>
        <h1 className="mb-3 text-[40px] font-black tracking-[-0.03em] text-[var(--on-surface)] sm:text-[48px]">
          Page not found
        </h1>
        <p className="mb-8 max-w-md text-sm leading-relaxed text-[var(--on-surface-variant)]">
          The page you tried to open doesn&rsquo;t exist or has been moved. Check the URL, or return to a known location below.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container)] px-5 py-2.5 text-sm font-semibold text-[var(--on-surface)] hover:bg-[var(--surface-container-high)]"
          >
            <Home size={15} /> Go to home
          </Link>
          {isAuthenticated ? (
            <Link
              to={dashboardPath}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--on-primary)] hover:opacity-90"
            >
              Go to dashboard <ArrowRight size={15} />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
