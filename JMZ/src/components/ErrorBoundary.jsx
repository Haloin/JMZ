// Enhanced Error Boundary Component
// Provides better error handling and user feedback
import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Send to error reporting service
    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    // Send error to your monitoring service
    try {
      fetch('/api/error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {
        // Fallback: store in localStorage
        const errors = JSON.parse(localStorage.getItem('errors') || '[]');
        errors.push({
          error: error.message,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('errors', JSON.stringify(errors.slice(-10))); // Keep last 10 errors
      });
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  };

  handleRetry = () => {
    if (this.state.retryCount < 3) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700 text-center"
          >
            <div className="flex justify-center mb-6">
              <AlertTriangle className="w-16 h-16 text-red-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-4">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-400 mb-6">
              {this.state.error?.message || 'An unexpected error occurred while loading this page.'}
            </p>

            {this.state.retryCount < 3 && (
              <div className="mb-4">
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again ({3 - this.state.retryCount} attempts left)</span>
                </button>
              </div>
            )}

            <button
              onClick={this.handleGoHome}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Go Home</span>
            </button>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-red-400 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;