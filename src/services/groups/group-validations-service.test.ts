import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  validateAttachment,
  validateCollectionExists,
  validateGroupName,
  validateGroupNameUnique,
  validateGroupType,
  validateMembershipCriteria,
  validateMessage,
  validateUserExists,
} from "./group-validations-service";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  requireAdmin: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));
vi.mock("@/services/auth/current-user", () => ({
  requireCurrentUserAdminAccess: mocks.requireAdmin,
}));
vi.mock("@/lib/logger", () => ({
  log: { error: mocks.error },
}));

function query(data: unknown, error: { message: string; code?: string } | null = null) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    neq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  [q.select, q.eq, q.is, q.neq].forEach((fn) => fn.mockReturnValue(q));
  mocks.from.mockReturnValue(q);
  return q;
}

describe("group validation — business constraints and fail-closed lookups", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue("admin-1");
  });

  it.each(["", " ", "ab", "  a  "])(
    "rejects an empty or too-short group name %#", (name) => {
      expect(validateGroupName(name)).toMatchObject({ valid: false });
    },
  );

  it("enforces the maximum length of a group name", () => {
    expect(validateGroupName("x".repeat(101))).toEqual({
      valid: false,
      error: "Nome do grupo deve ter no máximo 100 caracteres",
    });
  });

  it("allows the documented lower and upper name lengths", () => {
    expect(validateGroupName("abc")).toEqual({ valid: true });
    expect(validateGroupName("x".repeat(100))).toEqual({ valid: true });
  });

  it.each(["", "  ", "\n"])("blocks empty group messages %#", (message) => {
    expect(validateMessage(message)).toEqual({
      valid: false,
      error: "Mensagem não pode estar vazia",
    });
  });

  it("blocks messages longer than the established 5000-character maximum", () => {
    expect(validateMessage("x".repeat(5001))).toMatchObject({ valid: false });
    expect(validateMessage("x".repeat(5000))).toEqual({ valid: true });
  });

  it.each(["manual", "assinantes", "colecao", "lancamentos", "pedidos"])(
    "accepts the established group type %s", (type) => {
      expect(validateGroupType(type)).toEqual({ valid: true });
    },
  );

  it("rejects unsupported group types rather than silently creating one", () => {
    expect(validateGroupType("system")).toEqual({
      valid: false,
      error: "Tipo de grupo inválido",
    });
  });

  it("requires manual groups not to contain automatic membership criteria", () => {
    expect(validateMembershipCriteria("manual", null)).toEqual({ valid: true });
    expect(validateMembershipCriteria("manual", {
      type: "colecao", collectionId: "collection-1",
    })).toMatchObject({ valid: false });
  });

  it("requires automatic groups to specify membership criteria", () => {
    expect(validateMembershipCriteria("assinantes", null)).toMatchObject({
      valid: false,
      error: "Grupos automáticos devem ter critérios de associação",
    });
  });

  it("requires a collection ID when a collection rule is selected", () => {
    expect(validateMembershipCriteria("colecao", {
      type: "colecao", collectionId: "",
    })).toMatchObject({ valid: false });
    expect(validateMembershipCriteria("colecao", {
      type: "colecao", collectionId: "collection-1",
    })).toEqual({ valid: true });
  });

  it("accepts a valid subscriber rule without inventing members", () => {
    expect(validateMembershipCriteria("assinantes", {
      type: "assinantes", subscriptionStatus: "active",
    })).toEqual({ valid: true });
  });

  it("looks up collections by their authoritative ID", async () => {
    const q = query({ id: "collection-1" });
    await expect(validateCollectionExists("collection-1")).resolves.toEqual({
      valid: true,
    });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("collections");
    expect(q.eq).toHaveBeenCalledWith("id", "collection-1");
  });

  it("does not claim that a collection exists when its row is absent", async () => {
    query(null);
    await expect(validateCollectionExists("missing")).resolves.toMatchObject({
      valid: false, error: "Coleção não encontrada",
    });
  });

  it("fails closed if the collection read is denied", async () => {
    query(null, { message: "permission denied" });
    await expect(validateCollectionExists("collection-1")).resolves.toMatchObject({
      valid: false, error: "Coleção não encontrada",
    });
  });

  it("fails closed when a collection query throws unexpectedly", async () => {
    mocks.from.mockImplementationOnce(() => { throw new Error("offline"); });
    await expect(validateCollectionExists("collection-1")).resolves.toMatchObject({
      valid: false, error: "Erro ao validar coleção",
    });
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("requires administrative authority before looking up other user profiles", async () => {
    const q = query({ id: "user-1" });
    await expect(validateUserExists("user-1")).resolves.toEqual({ valid: true });
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("profiles");
    expect(q.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("denies a user lookup without administrative authorization", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("Admin access required"));
    await expect(validateUserExists("user-1")).resolves.toMatchObject({
      valid: false, error: "Erro ao validar usuário",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("reports missing user profiles without inventing them", async () => {
    query(null);
    await expect(validateUserExists("missing")).resolves.toMatchObject({
      valid: false, error: "Usuário não encontrado",
    });
  });

  it("checks only active group names when verifying uniqueness", async () => {
    const q = query(null, { message: "No rows", code: "PGRST116" });
    await expect(validateGroupNameUnique("Clube")).resolves.toEqual({
      valid: true,
    });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("chat_groups");
    expect(q.eq).toHaveBeenCalledWith("name", "Clube");
    expect(q.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("does not reject a group name solely because the currently edited group owns it", async () => {
    const q = query(null, { message: "No rows", code: "PGRST116" });
    await expect(validateGroupNameUnique("Clube", "group-1")).resolves.toEqual({
      valid: true,
    });
    expect(q.neq).toHaveBeenCalledWith("id", "group-1");
  });

  it("blocks duplicate active group names", async () => {
    query({ id: "another-group" });
    await expect(validateGroupNameUnique("Clube")).resolves.toEqual({
      valid: false, error: "Já existe um grupo com este nome",
    });
  });

  it("does not claim uniqueness after database authorization failures", async () => {
    query(null, { message: "read denied", code: "42501" });
    await expect(validateGroupNameUnique("Clube")).resolves.toMatchObject({
      valid: false, error: "Erro ao validar nome do grupo",
    });
    expect(mocks.error).toHaveBeenCalledOnce();
  });

  it("does not claim uniqueness when the query throws", async () => {
    mocks.from.mockImplementationOnce(() => { throw new Error("network"); });
    await expect(validateGroupNameUnique("Clube")).resolves.toMatchObject({
      valid: false, error: "Erro ao validar nome do grupo",
    });
  });

  it("validates the attachment MIME type and maximum 10 MB size", () => {
    const file = (size: number, type: string) => ({ size, type }) as File;
    expect(validateAttachment(file(10 * 1024 * 1024, "image/webp")))
      .toEqual({ valid: true });
    expect(validateAttachment(file(10 * 1024 * 1024 + 1, "image/jpeg")))
      .toMatchObject({ valid: false, error: "Arquivo muito grande. Tamanho máximo: 10MB" });
    expect(validateAttachment(file(1, "application/x-msdownload")))
      .toMatchObject({ valid: false, error: "Tipo de arquivo não permitido" });
  });

  it.each(["image/jpeg", "image/png", "image/gif", "application/pdf"])(
    "accepts the documented attachment MIME type %s", (type) => {
      expect(validateAttachment({ size: 200, type } as File))
        .toEqual({ valid: true });
    },
  );
});
