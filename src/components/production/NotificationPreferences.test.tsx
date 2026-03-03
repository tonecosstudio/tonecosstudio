/**
 * Tests for NotificationPreferences Component
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationPreferences } from "./NotificationPreferences";
import * as notificationService from "@/services/notifications/alert-notification-service";

// Mock the notification service
vi.mock("@/services/notifications/alert-notification-service", () => ({
  getNotificationPreferences: vi.fn(),
  saveNotificationPreferences: vi.fn(),
  requestNotificationPermission: vi.fn(),
  canShowNotifications: vi.fn(),
}));

// Mock the toast hook
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("NotificationPreferences Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(notificationService.getNotificationPreferences).mockReturnValue({
      browserNotifications: false,
      soundNotifications: false,
      emailDigest: true,
    });
    
    vi.mocked(notificationService.canShowNotifications).mockReturnValue(false);
  });

  it("should render all notification preference options", () => {
    render(<NotificationPreferences />);

    expect(screen.getByText("Preferências de Notificação")).toBeInTheDocument();
    expect(screen.getByText("Notificações do Navegador")).toBeInTheDocument();
    expect(screen.getByText("Notificações Sonoras")).toBeInTheDocument();
    expect(screen.getByText("Resumo Diário por Email")).toBeInTheDocument();
  });

  it("should load preferences from service on mount", () => {
    render(<NotificationPreferences />);

    expect(notificationService.getNotificationPreferences).toHaveBeenCalled();
  });

  it("should show 'Permitir Notificações' button when permission not granted", () => {
    vi.mocked(notificationService.canShowNotifications).mockReturnValue(false);

    render(<NotificationPreferences />);

    expect(screen.getByText("Permitir Notificações")).toBeInTheDocument();
  });

  it("should not show 'Permitir Notificações' button when permission granted", () => {
    vi.mocked(notificationService.canShowNotifications).mockReturnValue(true);
    vi.mocked(notificationService.getNotificationPreferences).mockReturnValue({
      browserNotifications: true,
      soundNotifications: false,
      emailDigest: true,
    });

    render(<NotificationPreferences />);

    expect(screen.queryByText("Permitir Notificações")).not.toBeInTheDocument();
  });

  it("should request permission when 'Permitir Notificações' button is clicked", async () => {
    vi.mocked(notificationService.requestNotificationPermission).mockResolvedValue(true);

    render(<NotificationPreferences />);

    const button = screen.getByText("Permitir Notificações");
    fireEvent.click(button);

    await waitFor(() => {
      expect(notificationService.requestNotificationPermission).toHaveBeenCalled();
    });
  });

  it("should show success toast when permission is granted", async () => {
    vi.mocked(notificationService.requestNotificationPermission).mockResolvedValue(true);

    render(<NotificationPreferences />);

    const button = screen.getByText("Permitir Notificações");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Permissão Concedida",
        description: expect.any(String),
      });
    });
  });

  it("should show error toast when permission is denied", async () => {
    vi.mocked(notificationService.requestNotificationPermission).mockResolvedValue(false);

    render(<NotificationPreferences />);

    const button = screen.getByText("Permitir Notificações");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Permissão Negada",
        description: expect.any(String),
        variant: "destructive",
      });
    });
  });

  it("should toggle sound notifications and save preferences", async () => {
    render(<NotificationPreferences />);

    const soundSwitch = screen.getByRole("switch", { name: /notificações sonoras/i });
    fireEvent.click(soundSwitch);

    await waitFor(() => {
      expect(notificationService.saveNotificationPreferences).toHaveBeenCalledWith({
        browserNotifications: false,
        soundNotifications: true,
        emailDigest: true,
      });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Preferências Atualizadas",
      description: "Notificações sonoras ativadas.",
    });
  });

  it("should toggle email digest and save preferences", async () => {
    render(<NotificationPreferences />);

    const emailSwitch = screen.getByRole("switch", { name: /resumo diário por email/i });
    fireEvent.click(emailSwitch);

    await waitFor(() => {
      expect(notificationService.saveNotificationPreferences).toHaveBeenCalledWith({
        browserNotifications: false,
        soundNotifications: false,
        emailDigest: false,
      });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Preferências Atualizadas",
      description: "Resumo diário por email desativado.",
    });
  });

  it("should request permission before enabling browser notifications", async () => {
    vi.mocked(notificationService.requestNotificationPermission).mockResolvedValue(true);
    vi.mocked(notificationService.canShowNotifications).mockReturnValue(false);
    vi.mocked(notificationService.getNotificationPreferences).mockReturnValue({
      browserNotifications: true,
      soundNotifications: false,
      emailDigest: true,
    });

    render(<NotificationPreferences />);

    // The switch is disabled when permission is not granted, so we need to click the button instead
    const button = screen.getByText("Permitir Notificações");
    fireEvent.click(button);

    await waitFor(() => {
      expect(notificationService.requestNotificationPermission).toHaveBeenCalled();
    });
  });

  it("should not enable browser notifications if permission denied", async () => {
    vi.mocked(notificationService.requestNotificationPermission).mockResolvedValue(false);
    vi.mocked(notificationService.canShowNotifications).mockReturnValue(false);

    render(<NotificationPreferences />);

    // Click the "Permitir Notificações" button which will request permission
    const button = screen.getByText("Permitir Notificações");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Permissão Negada",
        description: expect.any(String),
        variant: "destructive",
      });
    });

    // Preferences should not be saved
    expect(notificationService.saveNotificationPreferences).not.toHaveBeenCalled();
  });

  it("should display correct initial switch states", () => {
    vi.mocked(notificationService.getNotificationPreferences).mockReturnValue({
      browserNotifications: true,
      soundNotifications: true,
      emailDigest: false,
    });
    vi.mocked(notificationService.canShowNotifications).mockReturnValue(true);

    render(<NotificationPreferences />);

    const browserSwitch = screen.getByRole("switch", { name: /notificações do navegador/i });
    const soundSwitch = screen.getByRole("switch", { name: /notificações sonoras/i });
    const emailSwitch = screen.getByRole("switch", { name: /resumo diário por email/i });

    expect(browserSwitch).toBeChecked();
    expect(soundSwitch).toBeChecked();
    expect(emailSwitch).not.toBeChecked();
  });
});
