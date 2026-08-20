import { AlertTriangle } from 'lucide-react';
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

interface Props {
  children: ReactNode;
  /** Changing this resets the boundary — pass the active tab so navigating away recovers. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Without a boundary, a throw in any feature — or a failed lazy-chunk fetch on a
 * flaky connection — blanks the whole app to white. This keeps the shell up and
 * offers a way back.
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No telemetry backend in this build; surface it for local debugging.
    console.error('Feature crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Something went wrong on this screen"
        description="The rest of the app is fine — your project and generated images are untouched. Reload this screen to carry on."
        action={
          <Button variant="primary" onClick={() => this.setState({ error: null })}>
            Reload this screen
          </Button>
        }
      />
    );
  }
}
