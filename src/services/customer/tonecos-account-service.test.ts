import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  changeTonecosPassword, registerTonecosAccount, resendTonecosSignupConfirmation,
  signInTonecosAccount, signOutTonecosAccount,
  getTonecosCurrentUser, getMyTonecosProfile, updateMyTonecosProfile,
  updateMyTonecosWhatsapp, updateMyTonecosPersonalData, updateMyTonecosDeliveryAddress,
  updateMyTonecosContactPreferences,
  requestTonecosPasswordReset, completeTonecosPasswordRecovery,
  verifyTonecosPasswordRecoveryToken,
} from "./tonecos-account-service";

const USER = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), getSession: vi.fn(), from: vi.fn(), updateUser: vi.fn(), verifyOtp: vi.fn(),
  resendSignupConfirmation: vi.fn(), sendPasswordResetEmail: vi.fn(),
  signUpWithPasswordCredentials: vi.fn(),
  signInWithPasswordCredentials: vi.fn(), signOutCurrentSession: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: {
    getUser: mocks.getUser,
    getSession: mocks.getSession,
    updateUser: mocks.updateUser,
    verifyOtp: mocks.verifyOtp,
  }, from: mocks.from },
}));
vi.mock("@/services/auth/auth-session-service", () => ({
  resendSignupConfirmation: mocks.resendSignupConfirmation,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  signUpWithPasswordCredentials: mocks.signUpWithPasswordCredentials,
  signInWithPasswordCredentials: mocks.signInWithPasswordCredentials,
  signOutCurrentSession: mocks.signOutCurrentSession,
}));
vi.mock("@/config/supabase-environment", () => ({
  LOCAL_SUPABASE_FALLBACK: false,
  get PREVIEW_READ_ONLY() {
    return import.meta.env.VITE_PREVIEW_READ_ONLY === "true";
  },
  get SUPABASE_URL() {
    return import.meta.env.VITE_SUPABASE_URL ?? "";
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "test" } }, error: null });
  vi.stubEnv("VITE_SUPABASE_URL", "https://icmtmaakjucmuzxnofkd.supabase.co");
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
});
afterEach(() => vi.unstubAllEnvs());

describe("Tonecos authenticated MVP account", () => {

  it("treats a logged-out visitor as guest without calling getUser or showing an Auth error", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(getTonecosCurrentUser()).resolves.toBeNull();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("handles a session that disappears between preflight and server verification", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError", message: "Auth session missing!" },
    });
    await expect(getTonecosCurrentUser()).resolves.toBeNull();
  });

  it("still verifies authenticated users server-side and propagates real Auth errors", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { id: USER, email: "client@example.com" } },
      error: null,
    });
    await expect(getTonecosCurrentUser()).resolves.toEqual({ id: USER, email: "client@example.com" });
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { name: "AuthApiError", message: "Authentication service unavailable" },
    });
    await expect(getTonecosCurrentUser()).rejects.toMatchObject({ message: "Authentication service unavailable" });
  });

  it("sends password reset through existing rate-limited service to current Tonecos origin", async () => {
    mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
    await expect(
      requestTonecosPasswordReset(
        "  CLIENT@EXAMPLE.COM ",
        "/solicitar-orcamento",
      ),
    ).resolves.toBeUndefined();
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith({
      email: "client@example.com",
      redirectTo: expect.stringMatching(
        /\/recuperar-senha\?action=update&next=%2Fsolicitar-orcamento$/,
      ),
    });
  });

  it("rejects external password-reset return destinations", async () => {
    mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
    await requestTonecosPasswordReset(
      "client@example.com",
      "https://evil.example/phish",
    );
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith({
      email: "client@example.com",
      redirectTo: expect.stringMatching(/\/recuperar-senha\?action=update$/),
    });
  });

  it("exchanges recovery token hash with Supabase Auth for cross-browser password recovery", async () => {
    const tokenHash = "a".repeat(64);
    mocks.verifyOtp.mockResolvedValue({ data: { user: { id: USER }, session: { access_token: "test", user: { id: USER } } }, error: null });
    await expect(verifyTonecosPasswordRecoveryToken(tokenHash)).resolves.toBe(USER);
    expect(mocks.verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: tokenHash, type: "recovery" });
  });

  it("rejects malformed, expired and sessionless recovery tokens without updating a password", async () => {
    await expect(verifyTonecosPasswordRecoveryToken("invalid")).rejects.toThrow("tonecos_recovery_link_invalid");
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    mocks.verifyOtp.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: "Expired" } });
    await expect(verifyTonecosPasswordRecoveryToken("b".repeat(64))).rejects.toThrow("tonecos_recovery_link_invalid");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("rejects recovery without the prior OTP even when a normal login is active", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    await expect(completeTonecosPasswordRecovery("StrongPass123!"))
      .rejects.toThrow("tonecos_recovery_session_required");
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
    await expect(completeTonecosPasswordRecovery("weak"))
      .rejects.toThrow("tonecos_recovery_password_invalid");
  });

  it("rejects OTP responses whose user and session do not match", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: USER }, session: { access_token: "test", user: { id: "22222222-2222-4222-8222-222222222222" } } },
      error: null,
    });
    await expect(verifyTonecosPasswordRecoveryToken("b".repeat(64)))
      .rejects.toThrow("tonecos_recovery_link_invalid");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("changes password only after OTP proof, consumes proof, and signs out", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: USER }, session: { access_token: "test", user: { id: USER } } },
      error: null,
    });
    await expect(verifyTonecosPasswordRecoveryToken("c".repeat(64))).resolves.toBe(USER);
    mocks.getUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    mocks.updateUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    mocks.signOutCurrentSession.mockResolvedValue(undefined);
    await expect(completeTonecosPasswordRecovery("StrongPass123!")).resolves.toBeUndefined();
    expect(mocks.updateUser).toHaveBeenCalledExactlyOnceWith({ password: "StrongPass123!" });
    expect(mocks.signOutCurrentSession).toHaveBeenCalledTimes(1);
    await expect(completeTonecosPasswordRecovery("StrongPass123!"))
      .rejects.toThrow("tonecos_recovery_session_required");
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
  });

  it("rejects a different signed-in user after verifying a valid recovery OTP", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: USER }, session: { access_token: "test", user: { id: USER } } },
      error: null,
    });
    await verifyTonecosPasswordRecoveryToken("d".repeat(64));
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "22222222-2222-4222-8222-222222222222" } },
      error: null,
    });
    await expect(completeTonecosPasswordRecovery("StrongPass123!"))
      .rejects.toThrow("tonecos_recovery_session_required");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("registers with Supabase Auth only; confirmation is explicit", async () => {
    mocks.signUpWithPasswordCredentials.mockResolvedValue({ userId: USER, emailConfirmationRequired: true });
    await expect(registerTonecosAccount({
      email: "  Client@example.com ",
      password: "StrongPass123!",
      fullName: "  Cliente  ",
      returnTo: "/solicitar-orcamento",
    })).resolves.toEqual({ userId: USER, emailConfirmationRequired: true });
    expect(mocks.signUpWithPasswordCredentials).toHaveBeenCalledWith({
      email: "client@example.com",
      password: "StrongPass123!",
      fullName: "Cliente",
      emailRedirectTo: expect.stringMatching(
        /\/login\?next=%2Fsolicitar-orcamento$/,
      ),
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("resends signup confirmation through the same Auth authority and redirect", async () => {
    mocks.resendSignupConfirmation.mockResolvedValue(undefined);
    await expect(
      resendTonecosSignupConfirmation(
        "  CLIENT@EXAMPLE.COM ",
        "/solicitar-orcamento",
      ),
    ).resolves.toBeUndefined();
    expect(mocks.resendSignupConfirmation).toHaveBeenCalledExactlyOnceWith({
      email: "client@example.com",
      emailRedirectTo: expect.stringMatching(
        /\/login\?next=%2Fsolicitar-orcamento$/,
      ),
    });
  });

  it("never accepts an external signup confirmation return path", async () => {
    mocks.signUpWithPasswordCredentials.mockResolvedValue({
      userId: USER,
      emailConfirmationRequired: true,
    });
    await registerTonecosAccount({
      email: "client@example.com",
      password: "StrongPass123!",
      fullName: "Cliente",
      returnTo: "https://evil.example/phish",
    });
    expect(mocks.signUpWithPasswordCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        emailRedirectTo: expect.stringMatching(/\/login$/),
      }),
    );
  });

  it("does not sign in unless Auth actually returned user and session", async () => {
    mocks.signInWithPasswordCredentials.mockResolvedValueOnce(USER);
    await expect(signInTonecosAccount("client@example.com", "StrongPass123!")).resolves.toBe(USER);
    mocks.signInWithPasswordCredentials.mockRejectedValueOnce(new Error("tonecos_login_incomplete"));
    await expect(signInTonecosAccount("client@example.com", "StrongPass123!")).rejects.toThrow("tonecos_login_incomplete");
  });

  it("allows existing valid accounts to log in even when their original password predates the signup policy", async () => {
    mocks.signInWithPasswordCredentials.mockResolvedValue(USER);
    await expect(signInTonecosAccount("client@example.com", "OldPassword1"))
      .resolves.toBe(USER);
    expect(mocks.signInWithPasswordCredentials).toHaveBeenCalledWith({
      email: "client@example.com", password: "OldPassword1",
    });
    await expect(signInTonecosAccount("client@example.com", ""))
      .rejects.toThrow("tonecos_account_credentials_invalid");
  });

  it("changes a password only after verifying the current credential and then signs out", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: USER, email: "client@example.com" } },
      error: null,
    });
    mocks.signInWithPasswordCredentials.mockResolvedValue(USER);
    mocks.updateUser.mockResolvedValue({
      data: { user: { id: USER } },
      error: null,
    });
    mocks.signOutCurrentSession.mockResolvedValue(undefined);

    await expect(
      changeTonecosPassword({
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
      }),
    ).resolves.toBeUndefined();

    expect(mocks.signInWithPasswordCredentials).toHaveBeenCalledExactlyOnceWith({
      email: "client@example.com",
      password: "OldPassword123!",
    });
    expect(mocks.updateUser).toHaveBeenCalledExactlyOnceWith({
      password: "NewPassword123!",
    });
    expect(mocks.signOutCurrentSession).toHaveBeenCalledTimes(1);

    await expect(
      changeTonecosPassword({
        currentPassword: "SamePassword123!",
        newPassword: "SamePassword123!",
      }),
    ).rejects.toThrow("tonecos_new_password_invalid");
  });

  it("allows private accounts without enabling quotes, using the same Auth SSOT", async () => {
    vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "false");
    mocks.signInWithPasswordCredentials.mockResolvedValue(USER);
    await expect(signInTonecosAccount("client@example.com", "StrongPass123!")).resolves.toBe(USER);
    expect(mocks.signInWithPasswordCredentials).toHaveBeenCalledTimes(1);
  });

  it("blocks commercial requests when configured for the OrdaX Supabase project", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://jhfphsjptrpmtnzkpwud.supabase.co");
    await expect(registerTonecosAccount({
      email: "client@example.com", password: "StrongPass123!", fullName: "Cliente",
    })).rejects.toThrow("tonecos_supabase_project_mismatch");
    expect(mocks.signUpWithPasswordCredentials).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("blocks account access in public read-only previews", async () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    await expect(signInTonecosAccount("client@example.com", "StrongPass123!"))
      .rejects.toThrow("tonecos_commercial_mvp_disabled");
    await expect(getMyTonecosProfile()).rejects.toThrow("tonecos_commercial_mvp_disabled");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("reads and updates only the authenticated profile through RLS", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    const profile = {
      id: USER, email: "client@example.com", full_name: "Cliente", phone: "71999999999",
      cpf: null, birth_date: null,
      created_at: "2026-11-05T00:00:00Z", updated_at: "2026-11-05T00:00:00Z",
    };
    const read = { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
    read.select.mockReturnValue(read); read.eq.mockReturnValue(read);
    read.single.mockResolvedValue({ data: profile, error: null });
    const change = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() };
    change.update.mockReturnValue(change); change.eq.mockReturnValue(change);
    change.select.mockReturnValue(change);
    change.single.mockResolvedValue({ data: profile, error: null });
    mocks.from.mockReturnValueOnce(read).mockReturnValueOnce(change);
    await expect(getMyTonecosProfile()).resolves.toEqual(profile);
    await expect(updateMyTonecosProfile({ fullName: "Cliente", phone: "71999999999" }))
      .resolves.toEqual(profile);
    expect(read.eq).toHaveBeenCalledWith("id", USER);
    expect(change.update).toHaveBeenCalledExactlyOnceWith({
      full_name: "Cliente", phone: "71999999999",
    });
    expect(change.eq).toHaveBeenCalledWith("id", USER);
  });

  it("keeps the existing account usable when optional CPF and birth-date columns are not deployed", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    const missingTaxColumns = {
      code: "42703",
      message: "column profiles.cpf does not exist",
    };
    const makeQuery = (result: { data: unknown; error: unknown }) => {
      const query = {
        select: vi.fn(() => query),
        update: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn().mockResolvedValue(result),
      };
      return query;
    };
    const saved = {
      id: USER, email: "client@example.com", full_name: "Cliente", phone: null,
      whatsapp: "71999999999", delivery_address: null,
      preferred_contact_channel: "email", quote_updates: true,
      production_updates: true, marketing_emails: false,
      created_at: "2026-11-05T00:00:00Z", updated_at: "2026-11-05T00:00:00Z",
    };
    const failedRead = makeQuery({ data: null, error: missingTaxColumns });
    const compatibleRead = makeQuery({ data: saved, error: null });
    mocks.from.mockReturnValueOnce(failedRead).mockReturnValueOnce(compatibleRead);

    await expect(getMyTonecosProfile()).resolves.toMatchObject({
      cpf: null,
      birth_date: null,
      taxDetailsAvailable: false,
      whatsapp: "71999999999",
    });
    expect(failedRead.select).toHaveBeenCalledWith(expect.stringContaining("cpf"));
    expect(compatibleRead.select).toHaveBeenCalledWith(expect.not.stringContaining("cpf"));

    const failedUpdate = makeQuery({ data: null, error: missingTaxColumns });
    const compatibleUpdate = makeQuery({ data: saved, error: null });
    mocks.from.mockReturnValueOnce(failedUpdate).mockReturnValueOnce(compatibleUpdate);
    await expect(updateMyTonecosWhatsapp("(71) 99999-9999"))
      .resolves.toMatchObject({ taxDetailsAvailable: false, whatsapp: "71999999999" });
    expect(compatibleUpdate.update).toHaveBeenCalledExactlyOnceWith({ whatsapp: "71999999999" });
  });

  it("never drops entered CPF or birth date when the profile schema is missing those columns", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    const query = {
      update: vi.fn(() => query),
      eq: vi.fn(() => query),
      select: vi.fn(() => query),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST204", message: "Could not find the 'cpf' column of 'profiles' in the schema cache" },
      }),
    };
    mocks.from.mockReturnValue(query);
    await expect(updateMyTonecosPersonalData({
      whatsapp: "(71) 99999-9999",
      cpf: "529.982.247-25",
      birthDate: "1992-05-14",
    })).rejects.toThrow("tonecos_account_tax_details_unavailable");
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it("rejects weak input, non-owner and invalid phones before mutation", async () => {
    await expect(registerTonecosAccount({
      email: "bad", password: "short", fullName: "Cliente",
    })).rejects.toThrow("tonecos_account_credentials_invalid");
    await expect(updateMyTonecosProfile({ fullName: "Cliente", phone: "abc" }))
      .rejects.toThrow("tonecos_account_phone_invalid");
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(getMyTonecosProfile()).rejects.toThrow("tonecos_login_required");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("saves personal details, delivery and opt-ins only in the existing RLS-owned profile", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    const savedProfile = { id: USER, email: "client@example.com" };
    const changes: unknown[] = [];
    mocks.from.mockImplementation(() => {
      const query = {
        update: vi.fn((payload: unknown) => {
          changes.push(payload);
          return query;
        }),
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn().mockResolvedValue({ data: savedProfile, error: null }),
      };
      return query;
    });
    await expect(updateMyTonecosPersonalData({
      whatsapp: "(71) 99999-9999",
      cpf: "529.982.247-25",
      birthDate: "1992-05-14",
    })).resolves.toEqual(savedProfile);
    await expect(updateMyTonecosWhatsapp("(71) 99999-9999")).resolves.toEqual(savedProfile);
    await expect(updateMyTonecosDeliveryAddress({
      street: "Rua Exemplo", number: "10", neighborhood: "Centro",
      city: "Salvador", state: "BA", zipCode: "40000-000",
      country: "BR",
    })).resolves.toEqual(savedProfile);
    await expect(updateMyTonecosContactPreferences({
      preferredContactChannel: "whatsapp",
      quoteUpdates: true,
    })).resolves.toEqual(savedProfile);
    expect(changes).toEqual([
      { whatsapp: "71999999999", cpf: "52998224725", birth_date: "1992-05-14" },
      { whatsapp: "71999999999" },
      { delivery_address: {
        street: "Rua Exemplo", number: "10", neighborhood: "Centro",
        city: "Salvador", state: "BA", zipCode: "40000000",
        country: "BR",
      } },
      { preferred_contact_channel: "whatsapp", quote_updates: true },
    ]);
    expect(mocks.getUser).toHaveBeenCalledTimes(4);
  });

  it("rejects unsupported profile values before authentication or data writes", async () => {
    await expect(updateMyTonecosWhatsapp("123")).rejects.toThrow("tonecos_account_whatsapp_invalid");
    await expect(updateMyTonecosWhatsapp("71abcd999999999")).rejects.toThrow("tonecos_account_whatsapp_invalid");
    await expect(updateMyTonecosPersonalData({
      whatsapp: "", cpf: "111.111.111-11", birthDate: "1992-05-14",
    })).rejects.toThrow("tonecos_account_cpf_invalid");
    await expect(updateMyTonecosPersonalData({
      whatsapp: "", cpf: "529.982.247-25", birthDate: "2027-01-01",
    })).rejects.toThrow("tonecos_account_birth_date_invalid");
    await expect(updateMyTonecosDeliveryAddress({
      street: "Rua", number: "1", neighborhood: "Centro",
      city: "Salvador", state: "BA", zipCode: "123",
      country: "BR",
    })).rejects.toThrow("tonecos_account_address_invalid");
    await expect(updateMyTonecosDeliveryAddress({
      street: "Rua", number: "1", neighborhood: "Centro",
      city: "Salvador", state: "BA", zipCode: "40000x000",
      country: "BR",
    })).rejects.toThrow("tonecos_account_address_invalid");
    await expect(updateMyTonecosContactPreferences({
      preferredContactChannel: "invalid" as "email",
      quoteUpdates: true,
    })).rejects.toThrow("tonecos_account_preferences_invalid");
    await expect(updateMyTonecosContactPreferences({
      preferredContactChannel: "email",
      quoteUpdates: true,
      marketingEmails: false,
    } as Parameters<typeof updateMyTonecosContactPreferences>[0]))
      .rejects.toThrow("tonecos_account_preferences_invalid");
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("signs out through Supabase Auth and propagates errors", async () => {
    mocks.signOutCurrentSession.mockResolvedValue(undefined);
    await expect(signOutTonecosAccount()).resolves.toBeUndefined();
    mocks.signOutCurrentSession.mockRejectedValueOnce(new Error("offline"));
    await expect(signOutTonecosAccount()).rejects.toThrow("offline");
  });
});
