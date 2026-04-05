"use client";

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { TriangleAlert, RefreshCw } from "lucide-react";

type Props = {
  children: ReactNode;
  name: string;
  fallback?: "inline" | "card" | "hidden";
};

type State = {
  error: Error | null;
};

export class FeatureBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, {
      tags: { feature_boundary: this.props.name },
      contexts: {
        react: { componentStack: info.componentStack },
      },
    });
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback = "card" } = this.props;

    if (!error) return children;

    if (fallback === "hidden") {
      return <div className="min-h-[1px]" />;
    }

    if (fallback === "inline") {
      return (
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          <TriangleAlert className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>Something went wrong</span>
          <button
            onClick={this.reset}
            className="ml-auto text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-slate-100 p-6 text-center dark:bg-slate-700">
        <TriangleAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Something went wrong
        </p>
        <button
          onClick={this.reset}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Try again
        </button>
      </div>
    );
  }
}
