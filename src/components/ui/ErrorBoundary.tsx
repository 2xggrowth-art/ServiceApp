import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import Button from './Button';
import { WifiOff } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Detect if error is a failed dynamic import (chunk load failure)
function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes("Importing a module script failed")
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  private onlineHandler: (() => void) | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);

    // If offline chunk load error, auto-retry when connection returns
    if (isChunkLoadError(error) && !navigator.onLine) {
      this.onlineHandler = () => {
        window.removeEventListener('online', this.onlineHandler!);
        this.onlineHandler = null;
        this.setState({ hasError: false, error: null });
      };
      window.addEventListener('online', this.onlineHandler);
    }
  }

  componentWillUnmount() {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isOfflineChunk = isChunkLoadError(this.state.error) && !navigator.onLine;

      return (
        <div className="min-h-screen bg-page-bg flex items-center justify-center px-6">
          <div className="text-center max-w-[340px]">
            {isOfflineChunk ? (
              <>
                <WifiOff size={48} className="mx-auto mb-4 text-yellow-500" />
                <h2 className="text-lg font-bold mb-2">You're Offline</h2>
                <p className="text-sm text-grey-muted mb-4">
                  This page hasn't been cached yet. It will load automatically when you're back online.
                </p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">⚠️</div>
                <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
                <p className="text-sm text-grey-muted mb-4">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
              </>
            )}
            <Button size="lg" onClick={this.handleRetry}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
