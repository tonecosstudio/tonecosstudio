import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMyTonecosProfile,
  getTonecosCurrentUser,
  signOutTonecosAccount,
  updateMyTonecosContactPreferences,
  updateMyTonecosDeliveryAddress,
} from "./tonecos-account-service";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser, getSession: mocks.getSession },
    from: mocks.from,
  },
}));
vi.mock("@/config/supabase-environment", () => ({
  LOCAL_SUPABASE_FALLBACK: true,
}));
vi.mock("@/config/tonecos-commercial-authority", () => ({
  assertTonecosCommercialEnabled: vi.fn(),
}));
vi.mock("@/services/auth/auth-session-service", () => ({
  signOutCurrentSession: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Tonecos local account fixture", () => {
  it("uses the normal account profile and keeps edits in memory without Supabase calls", async () => {
    await expect(getTonecosCurrentUser()).resolves.toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      email: "marina.oliveira@tonart.local",
    });
    await expect(getMyTonecosProfile()).resolves.toMatchObject({
      full_name: "Marina Oliveira",
      delivery_address: { street: "Rua das Palmeiras", city: "São Paulo" },
      preferred_contact_channel: "email",
    });

    await updateMyTonecosDeliveryAddress({
      street: "Rua Nova",
      number: "42",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      zipCode: "01234-567",
      country: "BR",
    });
    await updateMyTonecosContactPreferences({
      preferredContactChannel: "email",
      quoteUpdates: false,
    });

    await expect(getMyTonecosProfile()).resolves.toMatchObject({
      delivery_address: {
        street: "Rua Nova",
        number: "42",
        city: "São Paulo",
        zipCode: "01234567",
      },
      preferred_contact_channel: "email",
      quote_updates: false,
    });
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();

    await signOutTonecosAccount();
    await expect(getTonecosCurrentUser()).resolves.toBeNull();
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});
