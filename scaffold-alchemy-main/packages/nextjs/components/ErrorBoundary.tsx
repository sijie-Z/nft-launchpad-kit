"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="card bg-base-200 shadow-xl max-w-md w-full mx-4">
              <div className="card-body items-center text-center gap-4">
                <div className="text-5xl">⚠️</div>
                <h2 className="card-title text-xl">Something went wrong</h2>
                <p className="text-base-content/60 text-sm">
                  {this.state.error?.message || "An unexpected error occurred."}
                </p>
                <div className="card-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      this.setState({ hasError: false, error: undefined });
                    }}
                  >
                    Try Again
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
