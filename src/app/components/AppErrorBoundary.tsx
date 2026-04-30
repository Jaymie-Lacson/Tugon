import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          gap: '1rem',
          padding: '2rem',
          background: 'var(--surface)',
          color: 'var(--on-surface)',
          fontFamily: 'inherit',
          textAlign: 'center',
        }}
      >
        <p style={{ fontWeight: 700, fontSize: 'var(--text-xl)' }}>
          Something went wrong.
        </p>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: 'var(--text-sm)' }}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          onClick={this.handleReload}
          style={{
            padding: '0.5rem 1.25rem',
            background: 'var(--primary-container)',
            color: 'var(--on-primary)',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
