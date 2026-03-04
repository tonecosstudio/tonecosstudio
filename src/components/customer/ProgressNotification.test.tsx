/**
 * Tests for ProgressNotification Component
 * 
 * Tests the notification system for production progress updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProgressNotification } from "./ProgressNotification";
import * as toastHook from "@/hooks/use-toast";

// Mock the toast hook
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

    // Mock AudioContext
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
    })) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("useProgressNotification hook", () => {
    it("should return showNotification function", () => {
      const { result } = renderHook(() => useProgressNotification());
      
      expect(result.current).toHaveProperty("showNotification");
      expect(typeof result.current.showNotification).toBe("function");
    });
  });

  describe("Stage Change Notifications", () => {
    it("should show notification when stage changes to design", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "stage_change",
          stage: "design",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Pedido Atualizado",
        description: "Seu pedido avançou para: Design",
        duration: 5000,
      });
    });

    it("should show notification when stage changes to production", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "stage_change",
          stage: "production",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Pedido Atualizado",
        description: "Seu pedido avançou para: Produção",
        duration: 5000,
      });
    });

    it("should show notification when stage changes to quality_check", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "stage_change",
          stage: "quality_check",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Pedido Atualizado",
        description: "Seu pedido avançou para: Controle de Qualidade",
        duration: 5000,
      });
    });

    it("should show notification when stage changes to packaging", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "stage_change",
          stage: "packaging",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Pedido Atualizado",
        description: "Seu pedido avançou para: Embalagem",
        duration: 5000,
      });
    });

    it("should show notification when stage changes to shipped", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "stage_change",
          stage: "shipped",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Pedido Atualizado",
        description: "Seu pedido avançou para: Enviado",
        duration: 5000,
      });
    });

    it("should handle stage change without stage parameter", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "stage_change",
        });
      });

      // Should not call toast if stage is missing
      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe("Choice Approved Notifications", () => {
    it("should show notification when choice is approved", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "choice_approved",
          characterName: "Naruto",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "✅ Escolha Aprovada!",
        description: 'Sua escolha do personagem "Naruto" foi aprovada. A produção começará em breve!',
        duration: 8000,
      });
    });

    it("should handle choice approved without character name", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "choice_approved",
        });
      });

      // Should not call toast if character name is missing
      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe("Choice Rejected Notifications", () => {
    it("should show notification when choice is rejected with reason", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "choice_rejected",
          rejectionReason: "Personagem fora de estoque",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Escolha Rejeitada",
        description: "Sua escolha foi rejeitada. Motivo: Personagem fora de estoque. Por favor, escolha outro personagem.",
        variant: "destructive",
        duration: 10000,
      });
    });

    it("should show notification when choice is rejected without reason", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "choice_rejected",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Escolha Rejeitada",
        description: "Sua escolha foi rejeitada. Motivo: Motivo não especificado. Por favor, escolha outro personagem.",
        variant: "destructive",
        duration: 10000,
      });
    });
  });

  describe("Shipped Notifications", () => {
    it("should show notification when item is shipped with tracking code", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "shipped",
          trackingCode: "BR123456789",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "🎉 Pedido Enviado!",
        description: "Seu pedido foi enviado. Código de rastreamento: BR123456789",
        duration: 8000,
      });
    });

    it("should show notification when item is shipped without tracking code", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "shipped",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "🎉 Pedido Enviado!",
        description: "Seu pedido foi enviado. O código de rastreamento será disponibilizado em breve.",
        duration: 8000,
      });
    });
  });

  describe("Choice Locked Notifications", () => {
    it("should show notification when choice is locked", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "choice_locked",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Escolha Confirmada",
        description: "Sua escolha foi confirmada e a produção foi iniciada!",
        duration: 5000,
      });
    });
  });

  describe("Production Blocked Notifications", () => {
    it("should show notification when production is blocked with reason", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "production_blocked",
          blockReason: "Falta de material",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "⚠️ Produção Pausada",
        description: "A produção do seu pedido foi temporariamente pausada. Motivo: Falta de material. Entraremos em contato em breve.",
        variant: "destructive",
        duration: 10000,
      });
    });

    it("should show notification when production is blocked without reason", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "production_blocked",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "⚠️ Produção Pausada",
        description: "A produção do seu pedido foi temporariamente pausada. Motivo: Motivo não especificado. Entraremos em contato em breve.",
        variant: "destructive",
        duration: 10000,
      });
    });
  });

  describe("Production Unblocked Notifications", () => {
    it("should show notification when production is unblocked", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "production_unblocked",
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "✅ Produção Retomada",
        description: "A produção do seu pedido foi retomada. Obrigado pela paciência!",
        duration: 5000,
      });
    });
  });

  describe("Sound Notifications", () => {
    it("should play sound when playSound is true", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "stage_change",
          stage: "production",
          playSound: true,
        });
      });

      expect(global.AudioContext).toHaveBeenCalled();
    });

    it("should not play sound when playSound is false", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "stage_change",
          stage: "production",
          playSound: false,
        });
      });

      // AudioContext should not be called
      expect(global.AudioContext).not.toHaveBeenCalled();
    });

    it("should not play sound by default", () => {
      const { result } = renderHook(() => useProgressNotification());

      act(() => {
        result.current.showNotification({
          type: "stage_change",
          stage: "production",
        });
      });

      // AudioContext should not be called
      expect(global.AudioContext).not.toHaveBeenCalled();
    });

    it("should handle audio context errors gracefully", () => {
      // Mock AudioContext to throw error
      global.AudioContext = vi.fn().mockImplementation(() => {
        throw new Error("AudioContext not supported");
      }) as any;

      const { result } = renderHook(() => useProgressNotification());

      // Should not throw error
      expect(() => {
        act(() => {
          result.current.showNotification({
            type: "stage_change",
            stage: "production",
            playSound: true,
          });
        });
      }).not.toThrow();
    });
  });

  describe("Unknown Notification Types", () => {
    it("should handle unknown notification type gracefully", () => {
      const { result } = renderHook(() => useProgressNotification());
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      act(() => {
        result.current.showNotification({
          type: "unknown_type" as any,
        });
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[ProgressNotification] Unknown notification type:",
        "unknown_type"
      );
      expect(mockToast).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("Portuguese Localization", () => {
    it("should display all stage names in Portuguese", () => {
      const { result } = renderHook(() => useProgressNotification());

      const stages = [
        { stage: "awaiting_choice" as const, expected: "Aguardando Escolha" },
        { stage: "design" as const, expected: "Design" },
        { stage: "production" as const, expected: "Produção" },
        { stage: "quality_check" as const, expected: "Controle de Qualidade" },
        { stage: "packaging" as const, expected: "Embalagem" },
        { stage: "shipped" as const, expected: "Enviado" },
      ];

      stages.forEach(({ stage, expected }) => {
        act(() => {
          result.current.showNotification({
            type: "stage_change",
            stage,
          });
        });

        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            description: `Seu pedido avançou para: ${expected}`,
          })
        );

        mockToast.mockClear();
      });
    });

    it("should display all notification titles in Portuguese", () => {
      const { result } = renderHook(() => useProgressNotification());

      const notifications = [
        { type: "stage_change" as const, stage: "production" as const, expectedTitle: "Pedido Atualizado" },
        { type: "choice_approved" as const, characterName: "Test", expectedTitle: "✅ Escolha Aprovada!" },
        { type: "choice_rejected" as const, expectedTitle: "Escolha Rejeitada" },
        { type: "shipped" as const, expectedTitle: "🎉 Pedido Enviado!" },
        { type: "choice_locked" as const, expectedTitle: "Escolha Confirmada" },
        { type: "production_blocked" as const, expectedTitle: "⚠️ Produção Pausada" },
        { type: "production_unblocked" as const, expectedTitle: "✅ Produção Retomada" },
      ];

      notifications.forEach(({ type, expectedTitle, ...rest }) => {
        act(() => {
          result.current.showNotification({
            type,
            ...rest,
          });
        });

        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expectedTitle,
          })
        );

        mockToast.mockClear();
      });
    });
  });

  describe("Notification Durations", () => {
    it("should use correct duration for each notification type", () => {
      const { result } = renderHook(() => useProgressNotification());

      const notifications = [
        { type: "stage_change" as const, stage: "production" as const, expectedDuration: 5000 },
        { type: "choice_approved" as const, characterName: "Test", expectedDuration: 8000 },
        { type: "choice_rejected" as const, expectedDuration: 10000 },
        { type: "shipped" as const, expectedDuration: 8000 },
        { type: "choice_locked" as const, expectedDuration: 5000 },
        { type: "production_blocked" as const, expectedDuration: 10000 },
        { type: "production_unblocked" as const, expectedDuration: 5000 },
      ];

      notifications.forEach(({ type, expectedDuration, ...rest }) => {
        act(() => {
          result.current.showNotification({
            type,
            ...rest,
          });
        });

        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            duration: expectedDuration,
          })
        );

        mockToast.mockClear();
      });
    });
  });

  describe("Notification Variants", () => {
    it("should use destructive variant for negative notifications", () => {
      const { result } = renderHook(() => useProgressNotification());

      const negativeNotifications = [
        { type: "choice_rejected" as const },
        { type: "production_blocked" as const },
      ];

      negativeNotifications.forEach(({ type }) => {
        act(() => {
          result.current.showNotification({ type });
        });

        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
          })
        );

        mockToast.mockClear();
      });
    });

    it("should not use variant for positive notifications", () => {
      const { result } = renderHook(() => useProgressNotification());

      const positiveNotifications = [
        { type: "stage_change" as const, stage: "production" as const },
        { type: "choice_approved" as const, characterName: "Test" },
        { type: "shipped" as const },
        { type: "choice_locked" as const },
        { type: "production_unblocked" as const },
      ];

      positiveNotifications.forEach(({ type, ...rest }) => {
        act(() => {
          result.current.showNotification({
            type,
            ...rest,
          });
        });

        expect(mockToast).toHaveBeenCalledWith(
          expect.not.objectContaining({
            variant: expect.anything(),
          })
        );

        mockToast.mockClear();
      });
    });
  });
});
