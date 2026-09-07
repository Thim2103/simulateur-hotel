import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Uncaught error in component tree:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
          <p className="text-base font-semibold">Une erreur est survenue.</p>
          <p>Les données affichées peuvent être temporairement indisponibles. Vous pouvez réessayer.</p>
          <button
            type="button"
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            onClick={this.handleReset}
          >
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
