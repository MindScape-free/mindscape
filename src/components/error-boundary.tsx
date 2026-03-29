'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          
          <h2 className="text-xl font-bold mb-2">
            {this.props.sectionName ? `${this.props.sectionName} Error` : 'Something went wrong'}
          </h2>
          
          <p className="text-muted-foreground mb-6 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          
          <div className="flex gap-3">
            <Button onClick={this.handleRetry} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={this.handleGoHome} variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface AsyncErrorProps {
  children: (handleError: (error: Error) => void) => ReactNode;
  fallback?: ReactNode;
}

interface AsyncErrorState {
  error: Error | null;
}

export class AsyncErrorBoundary extends Component<AsyncErrorProps, AsyncErrorState> {
  constructor(props: AsyncErrorProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): AsyncErrorState {
    return { error };
  }

  handleError = (error: Error) => {
    this.setState({ error });
  };

  render() {
    if (this.state.error) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
        </div>
      );
    }

    return this.props.children(this.handleError);
  }
}
