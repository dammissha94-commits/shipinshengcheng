'use client';

import type { ReactNode, ErrorInfo } from 'react';
import { Component, type ReactElement } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactElement;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 错误边界组件 — 捕获子组件树中的 JavaScript 错误，
 * 记录错误日志，并显示降级 UI。
 * 
 * @example
 * <ErrorBoundary fallback={(error) => <div>出错了：{error.message}</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error, this.state.errorInfo!);
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-2)] px-4 text-center">
          <div className="max-w-md rounded-2xl bg-white p-8 shadow-warm-lg">
            <div className="mb-4 text-6xl">😢</div>
            <h2 className="mb-2 text-xl font-bold text-[var(--ink-1)]">
              抱歉，出现了意外错误
            </h2>
            <p className="mb-6 text-sm text-[var(--ink-3)]">
              {this.state.error?.message || '未知错误'}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({
                  hasError: false,
                  error: null,
                  errorInfo: null,
                });
                window.location.reload();
              }}
              className="min-h-[44px] rounded-xl bg-[var(--terracotta)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--terracotta)]/90 active:scale-[0.97]"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
