import { srOnlyClass } from "@/lib/accessibility";

/**
 * Componente para texto visualmente oculto mas acessível a screen readers
 *
 * @example
 * <button>
 *   <Icon />
 *   <VisuallyHidden>Fechar modal</VisuallyHidden>
 * </button>
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className={srOnlyClass}>{children}</span>;
}
