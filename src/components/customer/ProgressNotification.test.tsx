import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as toastHook from "@/hooks/use-toast";
import { useProgressNotification } from "./ProgressNotification";

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

describe("ProgressNotification", () => {
  let mockToast: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockToast = vi.fn();
    vi.mocked(toastHook.useToast).mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    });

    global.AudioContext = vi.fn().mockImplementation(() => ({
      createOscillator: vi.fn().mockReturnValue({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: { value: 0 },
        type: "sine",
      }),
      createGain: vi.fn().mockReturnValue({
        connect: vi.fn(),
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
      }),
      destination: {},
      currentTime: 0,
    })) as typeof AudioContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function notify(options: Parameters<ReturnType<typeof useProgressNotification>["showNotification"]>[0]) {
    const { result } = renderHook(() => useProgressNotification());
    act(() => result.current.showNotification(options));
  }

  it("returns the notification action", () => {
    const { result } = renderHook(() => useProgressNotification());
    expect(result.current.showNotification).toBeTypeOf("function");
  });

  it.each([
    ["design", "Design"],
    ["production", "Produção"],
    ["quality_check", "Controle de Qualidade"],
    ["packaging", "Embalagem"],
    ["shipped", "Enviado"],
  ])("shows the current stage-change copy for %s", (stage, label) => {
    notify({ type: "stage_change", stage });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Pedido atualizado",
      description: `Seu pedido avancou para: ${label}.`,
      duration: 5000,
    });
  });

  it("does not toast a stage change without a stage", () => {
    notify({ type: "stage_change" });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("shows the approved-choice copy only when a character is present", () => {
    notify({ type: "choice_approved", characterName: "Naruto" });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Escolha aprovada",
      description: 'Sua escolha do personagem "Naruto" foi aprovada e registrada para a proxima etapa.',
      duration: 8000,
    });

    mockToast.mockClear();
    notify({ type: "choice_approved" });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it.each([
    ["Personagem fora de estoque", "Personagem fora de estoque"],
    [undefined, "Motivo nao especificado"],
  ])("shows a destructive rejected-choice notification", (reason, expectedReason) => {
    notify({ type: "choice_rejected", rejectionReason: reason });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Escolha rejeitada",
      description: `Sua escolha foi rejeitada. Motivo: ${expectedReason}. Escolha outro personagem para continuar.`,
      variant: "destructive",
      duration: 10000,
    });
  });

  it.each([
    ["BR123456789", "Seu pedido foi enviado. Codigo de rastreamento: BR123456789."],
    [undefined, "Seu pedido foi enviado. O codigo de rastreamento ainda nao esta disponivel."],
  ])("shows shipped state with the available tracking context", (trackingCode, description) => {
    notify({ type: "shipped", trackingCode });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Pedido enviado",
      description,
      duration: 8000,
    });
  });

  it("shows the locked-choice state", () => {
    notify({ type: "choice_locked" });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Escolha confirmada",
      description: "Sua escolha foi confirmada e nao pode mais ser alterada.",
      duration: 5000,
    });
  });

  it.each([
    ["Falta de material", "Falta de material"],
    [undefined, "Motivo nao especificado"],
  ])("shows the current production-blocked copy", (blockReason, expectedReason) => {
    notify({ type: "production_blocked", blockReason });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Producao pausada",
      description: `A producao do seu pedido foi pausada temporariamente. Motivo: ${expectedReason}. Novas atualizacoes aparecerao no acompanhamento do pedido quando forem registradas.`,
      variant: "destructive",
      duration: 10000,
    });
  });

  it("shows the production-resumed state", () => {
    notify({ type: "production_unblocked" });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Producao retomada",
      description: "A producao do seu pedido foi retomada.",
      duration: 5000,
    });
  });

  it("plays sound only when requested", () => {
    notify({ type: "stage_change", stage: "printing", playSound: true });
    expect(global.AudioContext).toHaveBeenCalledTimes(1);

    vi.mocked(global.AudioContext).mockClear();
    notify({ type: "stage_change", stage: "printing", playSound: false });
    notify({ type: "stage_change", stage: "printing" });
    expect(global.AudioContext).not.toHaveBeenCalled();
  });

  it("contains audio failures without breaking the notification", () => {
    global.AudioContext = vi.fn().mockImplementation(() => {
      throw new Error("AudioContext not supported");
    }) as typeof AudioContext;

    expect(() => {
      notify({ type: "stage_change", stage: "printing", playSound: true });
    }).not.toThrow();

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Pedido atualizado" }),
    );
  });

  it("ignores an unknown notification type", () => {
    notify({ type: "unknown_type" as never });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("keeps the configured durations and destructive variants", () => {
    notify({ type: "choice_approved", characterName: "Teste" });
    expect(mockToast).toHaveBeenLastCalledWith(expect.objectContaining({ duration: 8000 }));

    notify({ type: "choice_rejected" });
    expect(mockToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ duration: 10000, variant: "destructive" }),
    );

    notify({ type: "choice_locked" });
    expect(mockToast).toHaveBeenLastCalledWith(expect.objectContaining({ duration: 5000 }));
  });
});
