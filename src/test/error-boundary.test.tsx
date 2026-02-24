import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GroupErrorBoundary } from '@/components/groups/GroupErrorBoundary';

// Component que sempre lança erro
function ThrowError({ message = 'Test error' }: { message?: string }) {
  throw new Error(message);
}

// Component que funciona normalmente
function WorkingComponent() {
  return <div>Working Component</div>;
}

describe('ErrorBoundary', () => {
  // Suprimir console.error durante os testes
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working Component')).toBeInTheDocument();
  });

  it('should render fallback UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText(/Ocorreu um erro inesperado/)).toBeInTheDocument();
  });

  it('should show action buttons in fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
    expect(screen.getByText('Recarregar Página')).toBeInTheDocument();
    expect(screen.getByText('Página Inicial')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError message="Custom error" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Custom error' }),
      expect.any(Object)
    );
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom Fallback UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Fallback UI')).toBeInTheDocument();
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    // Simular modo de desenvolvimento
    const originalEnv = import.meta.env.DEV;
    (import.meta.env as any).DEV = true;

    render(
      <ErrorBoundary>
        <ThrowError message="Detailed error message" />
      </ErrorBoundary>
    );

    // Verificar que existe um elemento details (pode estar fechado)
    const details = screen.getByText(/Detalhes do erro/);
    expect(details).toBeInTheDocument();

    // Restaurar ambiente
    (import.meta.env as any).DEV = originalEnv;
  });
});

describe('GroupErrorBoundary', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('should render children when there is no error', () => {
    render(
      <GroupErrorBoundary>
        <WorkingComponent />
      </GroupErrorBoundary>
    );

    expect(screen.getByText('Working Component')).toBeInTheDocument();
  });

  it('should render group-specific fallback UI when error occurs', () => {
    render(
      <GroupErrorBoundary>
        <ThrowError />
      </GroupErrorBoundary>
    );

    expect(screen.getByText('Erro ao carregar grupos')).toBeInTheDocument();
    expect(screen.getByText(/Ocorreu um erro ao carregar o sistema de grupos/)).toBeInTheDocument();
  });

  it('should show try again button in fallback UI', () => {
    render(
      <GroupErrorBoundary>
        <ThrowError />
      </GroupErrorBoundary>
    );

    expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
  });

  it('should show error message in development mode', () => {
    const originalEnv = import.meta.env.DEV;
    (import.meta.env as any).DEV = true;

    render(
      <GroupErrorBoundary>
        <ThrowError message="Group error details" />
      </GroupErrorBoundary>
    );

    expect(screen.getByText(/Group error details/)).toBeInTheDocument();

    (import.meta.env as any).DEV = originalEnv;
  });
});

describe('Error Boundary Integration', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('should catch errors from deeply nested components', () => {
    function DeepComponent() {
      return (
        <div>
          <div>
            <div>
              <ThrowError message="Deep error" />
            </div>
          </div>
        </div>
      );
    }

    render(
      <ErrorBoundary>
        <DeepComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });

  it('should not catch errors from sibling components', () => {
    function SiblingComponents() {
      return (
        <>
          <ErrorBoundary>
            <ThrowError message="Error 1" />
          </ErrorBoundary>
          <ErrorBoundary>
            <WorkingComponent />
          </ErrorBoundary>
        </>
      );
    }

    render(<SiblingComponents />);

    // Primeiro boundary mostra erro
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    
    // Segundo boundary funciona normalmente
    expect(screen.getByText('Working Component')).toBeInTheDocument();
  });

  it('should handle async errors', async () => {
    // Nota: Error boundaries não capturam erros assíncronos por design do React
    // Este teste documenta o comportamento esperado
    
    function AsyncComponent() {
      return <div>Async Component</div>;
    }

    render(
      <ErrorBoundary>
        <AsyncComponent />
      </ErrorBoundary>
    );

    // Componente renderiza normalmente
    expect(screen.getByText('Async Component')).toBeInTheDocument();
    
    // Erros assíncronos (setTimeout, Promises rejeitadas, etc.) 
    // NÃO são capturados por Error Boundaries
    // Eles precisam ser tratados com try/catch ou .catch()
  });
});

describe('Error Boundary Edge Cases', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('should handle null children', () => {
    render(
      <ErrorBoundary>
        {null}
      </ErrorBoundary>
    );

    // Não deve lançar erro
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();
  });

  it('should handle undefined children', () => {
    render(
      <ErrorBoundary>
        {undefined}
      </ErrorBoundary>
    );

    // Não deve lançar erro
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();
  });

  it('should handle multiple children', () => {
    render(
      <ErrorBoundary>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
    expect(screen.getByText('Child 3')).toBeInTheDocument();
  });

  it('should handle errors in one of multiple children', () => {
    render(
      <ErrorBoundary>
        <div>Child 1</div>
        <ThrowError />
        <div>Child 3</div>
      </ErrorBoundary>
    );

    // Error boundary captura o erro
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    
    // Outros children não são renderizados
    expect(screen.queryByText('Child 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Child 3')).not.toBeInTheDocument();
  });
});
