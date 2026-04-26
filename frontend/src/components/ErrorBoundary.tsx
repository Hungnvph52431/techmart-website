import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-black text-slate-800">
            Đã có lỗi xảy ra
          </h1>
          <p className="text-sm text-slate-600">
            Trang gặp lỗi không mong muốn. Bạn có thể thử lại hoặc tải lại
            trang.
          </p>
          {import.meta.env.DEV && (
            <details className="text-left bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700">
              <summary className="cursor-pointer font-bold">
                Chi tiết lỗi (dev)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
            >
              Thử lại
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      </div>
    );
  }
}
