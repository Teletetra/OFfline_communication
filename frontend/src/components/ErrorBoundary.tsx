import React from 'react';
interface State { hasError: boolean; }
export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error('UI error:', error); }
  render() { return this.state.hasError ? <div style={{ padding: 24 }}>Something went wrong. Please refresh the page.</div> : this.props.children; }
}
