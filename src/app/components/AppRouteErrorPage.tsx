import { isRouteErrorResponse, useRouteError } from 'react-router';
import { AlertTriangle, LoaderCircle, LogIn, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

type ResolvedErrorViewModel = {
  title: string;
  description: string;
  localizedDescription: string;
  isDeploymentUpdateIssue: boolean;
  details: string | null;
};

const STALE_ASSET_PATTERNS = [
  'failed to fetch dynamically imported module',
  'loading chunk',
  'is not a valid javascript mime type',
  'dynamically imported module',
  'imported module script failed',
];

function extractErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (typeof error.data === 'string' && error.data.trim().length > 0) {
      return error.data;
    }

    if (error.statusText?.trim().length) {
      return error.statusText;
    }

    return `Request failed with status ${error.status}`;
  }

  if (error instanceof Error) {
    return error.message || 'Unexpected application error.';
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unexpected application error.';
}

function isStaleAssetError(message: string): boolean {
  const normalized = message.toLowerCase();
  return STALE_ASSET_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function resolveErrorViewModel(error: unknown): ResolvedErrorViewModel {
  const message = extractErrorMessage(error);
  const deploymentIssue = isStaleAssetError(message);

  if (deploymentIssue) {
    return {
      title: 'App update in progress',
      description:
        'TUGON was just updated. Your browser is still using old app files. Refresh once to load the latest version.',
      localizedDescription:
        'Kaka-update lang ng TUGON. Lumang app files pa ang gamit ng browser mo. I-refresh para makuha ang pinakabagong version.',
      isDeploymentUpdateIssue: true,
      details: message,
    };
  }

  if (isRouteErrorResponse(error)) {
    return {
      title: error.status === 404 ? 'Page not found' : 'We could not open this page',
      description:
        error.status === 404
          ? 'The page may have been moved or removed. Return to login or refresh to continue.'
          : 'Please refresh the page. If this keeps happening, contact your barangay support team.',
      localizedDescription:
        error.status === 404
          ? 'Maaaring nailipat o natanggal na ang page na ito. Bumalik sa login o i-refresh ang app para magpatuloy.'
          : 'Paki-refresh ang page. Kung paulit-ulit ito, makipag-ugnayan sa barangay support team.',
      isDeploymentUpdateIssue: false,
      details: message,
    };
  }

  return {
    title: 'Unexpected application error',
    description: 'Please refresh the page. If the issue continues, log in again or try after a few minutes.',
    localizedDescription:
      'May hindi inaasahang error sa app. Paki-refresh ang page. Kung tuloy pa rin, mag-login ulit o subukan makalipas ang ilang minuto.',
    isDeploymentUpdateIssue: false,
    details: message,
  };
}

async function hardRefreshLatestVersion() {
  try {
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch {
    // Ignore cache API issues and still force a reload.
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('refresh', Date.now().toString());
  window.location.replace(nextUrl.toString());
}

export default function AppRouteErrorPage() {
  const routeError = useRouteError();
  const viewModel = resolveErrorViewModel(routeError);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-primary/5" />
      <Card className="relative z-10 w-full max-w-xl border-outline/20 bg-surface-container-lowest shadow-elevated">
        <CardHeader className="space-y-4 pb-0">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed text-primary">
            {viewModel.isDeploymentUpdateIssue ? (
              <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
            ) : (
              <AlertTriangle className="size-6" aria-hidden="true" />
            )}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-pretty text-2xl font-semibold text-on-surface">
              {viewModel.title}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed text-on-surface-variant">
              {viewModel.description}
            </CardDescription>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Filipino: {viewModel.localizedDescription}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
            <p className="font-medium text-on-surface">What to do now / Ano ang susunod na gagawin</p>
            <p className="mt-1">
              Tap <span className="font-semibold text-on-surface">Reload App</span> first. If the page still fails,
              use <span className="font-semibold text-on-surface">Hard Refresh</span> to pull the newest files.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Reload App / I-refresh ang App
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                void hardRefreshLatestVersion();
              }}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Hard Refresh / Sapilitang Refresh
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => window.location.assign('/auth/login')}
          >
            <LogIn className="size-4" aria-hidden="true" />
            Go to Login / Pumunta sa Login
          </Button>

          {viewModel.details ? (
            <p className="rounded-md border border-outline/30 bg-surface-container-low px-3 py-2 text-xs leading-relaxed text-on-surface-variant">
              Error detail: {viewModel.details}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
