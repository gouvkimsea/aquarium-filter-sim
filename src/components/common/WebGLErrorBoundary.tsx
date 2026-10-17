import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Viewport / WebGL Error Caught:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError || this.props.fallbackMessage) {
      const displayMsg =
        this.props.fallbackMessage ||
        this.state.error?.message ||
        'An unexpected error occurred during WebGL rendering.';

      return (
        <div id="webgl-error-container" className="webgl-error-overlay">
          <div className="webgl-error-card">
            <div className="webgl-error-icon-wrapper">
              <AlertTriangle className="webgl-error-icon" size={48} />
            </div>

            <h2 id="webgl-error-title" className="webgl-error-title">
              3D Viewport Initialization Error
            </h2>

            <p id="webgl-error-description" className="webgl-error-description">
              The 3D Aquarium Filter Simulator requires WebGL hardware acceleration to render real-time fluid and 3D filtration components.
            </p>

            <div className="webgl-error-details">
              <code>{displayMsg}</code>
            </div>

            <div className="webgl-error-troubleshooting">
              <h4>
                <HelpCircle size={16} /> Troubleshooting Steps:
              </h4>
              <ul>
                <li>Ensure "Use graphics acceleration when available" is enabled in browser settings.</li>
                <li>Check that your graphics drivers are up to date.</li>
                <li>Verify your browser supports WebGL at <a href="https://get.webgl.org" target="_blank" rel="noreferrer">get.webgl.org</a>.</li>
                <li>Try refreshing the page or restarting your browser.</li>
              </ul>
            </div>

            <button
              id="webgl-retry-button"
              className="webgl-retry-btn"
              onClick={this.handleRetry}
            >
              <RefreshCw size={18} />
              Retry Initialization
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
