/**
 * Utilitários para melhorar a acessibilidade
 */

/**
 * Gera ID único para associar labels com inputs
 */
export function generateId(prefix: string = "id"): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Anuncia mensagem para screen readers
 * Útil para feedback de ações (ex: "Item adicionado ao carrinho")
 */
export function announceToScreenReader(message: string, priority: "polite" | "assertive" = "polite") {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only"; // Visualmente oculto
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove após 1 segundo
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Verifica se elemento está visível no viewport
 */
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Scroll suave para elemento
 */
export function scrollToElement(
  element: HTMLElement | null,
  options: ScrollIntoViewOptions = { behavior: "smooth", block: "center" }
) {
  if (!element) return;
  element.scrollIntoView(options);
}

/**
 * Previne scroll do body (útil em modals)
 */
export function preventBodyScroll(prevent: boolean) {
  if (prevent) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
}

/**
 * Detecta se usuário prefere movimento reduzido
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Detecta se usuário prefere modo escuro
 */
export function prefersDarkMode(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Detecta se usuário prefere alto contraste
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia("(prefers-contrast: high)").matches;
}

/**
 * Formata número para leitura por screen reader
 * Ex: 1000 -> "mil", 1000000 -> "um milhão"
 */
export function formatNumberForScreenReader(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)} mil`;
  return `${(num / 1000000).toFixed(1)} milhões`;
}

/**
 * Formata data para leitura por screen reader
 */
export function formatDateForScreenReader(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Adiciona atributos ARIA para loading state
 */
export function getLoadingAriaAttributes(isLoading: boolean) {
  return {
    "aria-busy": isLoading,
    "aria-live": "polite" as const,
  };
}

/**
 * Adiciona atributos ARIA para estado de erro
 */
export function getErrorAriaAttributes(hasError: boolean, errorMessage?: string) {
  return {
    "aria-invalid": hasError,
    "aria-describedby": hasError && errorMessage ? "error-message" : undefined,
  };
}

/**
 * Adiciona atributos ARIA para estado expandido/colapsado
 */
export function getExpandedAriaAttributes(isExpanded: boolean, controlsId?: string) {
  return {
    "aria-expanded": isExpanded,
    "aria-controls": controlsId,
  };
}

/**
 * Adiciona atributos ARIA para estado selecionado
 */
export function getSelectedAriaAttributes(isSelected: boolean) {
  return {
    "aria-selected": isSelected,
    "aria-current": isSelected ? ("true" as const) : undefined,
  };
}

/**
 * Adiciona atributos ARIA para modal
 */
export function getModalAriaAttributes(isOpen: boolean, labelId?: string, descriptionId?: string) {
  return {
    role: "dialog" as const,
    "aria-modal": true,
    "aria-labelledby": labelId,
    "aria-describedby": descriptionId,
    "aria-hidden": !isOpen,
  };
}

/**
 * Adiciona atributos ARIA para tooltip
 */
export function getTooltipAriaAttributes(tooltipId: string) {
  return {
    "aria-describedby": tooltipId,
  };
}

/**
 * Adiciona atributos ARIA para tabs
 */
export function getTabAriaAttributes(
  isSelected: boolean,
  tabId: string,
  panelId: string
) {
  return {
    role: "tab" as const,
    "aria-selected": isSelected,
    "aria-controls": panelId,
    id: tabId,
    tabIndex: isSelected ? 0 : -1,
  };
}

/**
 * Adiciona atributos ARIA para tab panel
 */
export function getTabPanelAriaAttributes(tabId: string, panelId: string) {
  return {
    role: "tabpanel" as const,
    "aria-labelledby": tabId,
    id: panelId,
    tabIndex: 0,
  };
}

/**
 * Classe CSS para elementos visualmente ocultos mas acessíveis a screen readers
 */
export const srOnlyClass = "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0";
