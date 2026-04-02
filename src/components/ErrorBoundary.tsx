import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "24px",
            fontFamily: "monospace",
            background: "#0d1117",
            color: "#e6edf3",
            height: "100%",
            overflow: "auto",
          }}
        >
          <h2 style={{ color: "#f85149", marginBottom: "12px" }}>
            💥 PWA Crashed
          </h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              fontSize: "13px",
              background: "#161b22",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #30363d",
            }}
          >
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            style={{
              marginTop: "16px",
              padding: "8px 16px",
              background: "#58a6ff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
