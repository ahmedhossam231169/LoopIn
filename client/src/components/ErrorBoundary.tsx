import { Component, type ReactNode } from "react";

// Error Boundary — لو أي component وقع، الصفحة كلها ما تقعش معاه
interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // هنا لاحقًا هنبعت الـ error لـ Sentry
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="card max-w-md text-center">
            <p className="mb-2 text-lg font-bold">Something broke on this page</p>
            <p className="mb-4 text-sm text-mist-400">
              The error was logged. Try reloading — if it keeps happening, let us know.
            </p>
            <button className="btn-primary" onClick={() => location.reload()}>
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
