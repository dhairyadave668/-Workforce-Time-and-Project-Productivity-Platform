import { Component } from "react";
import type { ReactNode } from "react";
import GlobalError from "./GlobalError";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return <GlobalError message={this.state.message} />;
    }

    return this.props.children;
  }
}