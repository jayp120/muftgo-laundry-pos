import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Something went wrong' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[App ErrorBoundary]', error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '' });
    // soft reset: clear last known bad route state, stay on same page
    try {
      sessionStorage.removeItem('last_error_path');
    } catch { /* ignore */ }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/home';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4 border rounded-xl p-6 bg-card">
            <h2 className="text-xl font-bold">
              {this.props.fallbackTitle || 'Something went wrong'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Don't worry — your data is safe. Please try again.
            </p>
            {this.state.message && (
              <p className="text-xs text-muted-foreground bg-muted rounded p-2 break-all">
                {this.state.message}
              </p>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={this.handleReset} variant="default">
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant="outline">
                Go to Home
              </Button>
              <Button onClick={this.handleReload} variant="ghost">
                Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
