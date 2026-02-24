import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary específico para o sistema de grupos
 * Fornece fallback UI customizado para erros em grupos
 */
export class GroupErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro no sistema de grupos:", error, errorInfo);

    // TODO: Log to error tracking service
    // logErrorToService('group_error', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Erro ao carregar grupos</CardTitle>
            </div>
            <CardDescription>
              Ocorreu um erro ao carregar o sistema de grupos. Tente novamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-4 p-3 bg-muted rounded text-sm font-mono text-destructive">
                {this.state.error.toString()}
              </div>
            )}
            <Button onClick={this.handleReset} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
