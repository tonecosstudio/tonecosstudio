import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { errorToStatus, getServiceClient } from "../_shared/supabase.ts";
import { isUUID } from "../_shared/validation.ts";

type JsonObject = Record<string, unknown>;

const PAYMENT_METHOD_FIELDS = new Set([
  "name",
  "type",
  "instructions",
  "payment_link",
  "pix_key",
  "account_details",
  "is_active",
  "is_default",
  "display_order",
]);

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function asObject(value: unknown, fieldName: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }

  return value as JsonObject;
}

function cleanOptionalText(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string")
    throw new Error(`${fieldName} must be a string`);

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} is too long`);
  }

  return trimmed || null;
}

function cleanRequiredText(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  const clean = cleanOptionalText(value, fieldName, maxLength);
  if (!clean) throw new Error(`${fieldName} is required`);
  return clean;
}

function cleanBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean")
    throw new Error(`${fieldName} must be a boolean`);
  return value;
}

function cleanInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return numberValue;
}

function cleanAccountDetails(value: unknown): JsonObject | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("account_details must be an object");
  }
  return value as JsonObject;
}

function normalizePaymentMethodPayload(
  value: unknown,
  create: boolean,
): JsonObject {
  const input = asObject(value, "data");
  for (const key of Object.keys(input)) {
    if (!PAYMENT_METHOD_FIELDS.has(key)) {
      throw new Error(`Unknown payment method field: ${key}`);
    }
  }

  const payload: JsonObject = {};
  const name = create
    ? cleanRequiredText(input.name, "name", 120)
    : cleanOptionalText(input.name, "name", 120);
  const type = create
    ? cleanRequiredText(input.type, "type", 40)
    : cleanOptionalText(input.type, "type", 40);
  const instructions = create
    ? cleanRequiredText(input.instructions, "instructions", 4000)
    : cleanOptionalText(input.instructions, "instructions", 4000);

  if (name !== undefined) payload.name = name;
  if (type !== undefined) payload.type = type;
  if (instructions !== undefined) payload.instructions = instructions;

  const paymentLink = cleanOptionalText(
    input.payment_link,
    "payment_link",
    2048,
  );
  const pixKey = cleanOptionalText(input.pix_key, "pix_key", 255);
  const accountDetails = cleanAccountDetails(input.account_details);
  const isActive = cleanBoolean(input.is_active, "is_active");
  const isDefault = cleanBoolean(input.is_default, "is_default");
  const displayOrder = cleanInteger(input.display_order, "display_order");

  if (paymentLink !== undefined) payload.payment_link = paymentLink;
  if (pixKey !== undefined) payload.pix_key = pixKey;
  if (accountDetails !== undefined) payload.account_details = accountDetails;
  if (isActive !== undefined) payload.is_active = isActive;
  if (isDefault !== undefined) payload.is_default = isDefault;
  if (displayOrder !== undefined) payload.display_order = displayOrder;

  if (!create && Object.keys(payload).length === 0) {
    throw new Error("No fields provided to update");
  }

  return payload;
}

function mapPaymentMethodRpcError(message: string): {
  status: number;
  error: string;
} {
  if (message.includes("PAYMENT_METHOD_NOT_FOUND")) {
    return { status: 404, error: "Payment method not found" };
  }
  if (message.includes("INVALID_PAYMENT_METHOD_NAME")) {
    return { status: 400, error: "Payment method name is invalid" };
  }
  if (message.includes("INVALID_PAYMENT_METHOD_TYPE")) {
    return { status: 400, error: "Payment method type is invalid" };
  }
  if (message.includes("INVALID_PAYMENT_METHOD_INSTRUCTIONS")) {
    return { status: 400, error: "Payment instructions are invalid" };
  }
  if (message.includes("INVALID_PAYMENT_METHOD_LINK")) {
    return { status: 400, error: "Payment link must be HTTPS" };
  }
  if (message.includes("INVALID_PAYMENT_METHOD_PIX_KEY")) {
    return { status: 400, error: "PIX key is invalid" };
  }
  if (message.includes("INVALID_PAYMENT_METHOD_ORDER")) {
    return { status: 400, error: "Display order is invalid" };
  }
  if (message.includes("required") || message.includes("must be")) {
    return { status: 400, error: message };
  }
  return { status: 500, error: "Internal server error" };
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    if (req.method !== "POST") {
      return json(req, { ok: false, error: "method not allowed" }, 405);
    }

    const admin = await assertRateLimitedAdmin(req, "admin-payment-methods");
    if (admin.rateLimited) return admin.rateLimited;

    const service = getServiceClient();
    const body = asObject(await req.json().catch(() => ({})), "request body");
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "list") {
      const { data, error } = await service
        .from("admin_payment_methods")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return json(req, { ok: true, data: data ?? [] });
    }

    if (action === "create") {
      const payload = normalizePaymentMethodPayload(body.data, true);
      const { data, error } = await service.rpc("admin_create_payment_method", {
        p_data: payload,
      });

      if (error) {
        const mapped = mapPaymentMethodRpcError(error.message || "");
        return json(req, { ok: false, error: mapped.error }, mapped.status);
      }

      return json(req, { ok: true, data });
    }

    if (action === "update") {
      const methodId = typeof body.methodId === "string" ? body.methodId : "";
      if (!isUUID(methodId)) {
        return json(
          req,
          { ok: false, error: "methodId must be a valid UUID" },
          400,
        );
      }

      const payload = normalizePaymentMethodPayload(body.data, false);
      const { data, error } = await service.rpc("admin_update_payment_method", {
        p_method_id: methodId,
        p_data: payload,
      });

      if (error) {
        const mapped = mapPaymentMethodRpcError(error.message || "");
        return json(req, { ok: false, error: mapped.error }, mapped.status);
      }

      return json(req, { ok: true, data });
    }

    if (action === "setDefault") {
      const methodId = typeof body.methodId === "string" ? body.methodId : "";
      if (!isUUID(methodId)) {
        return json(
          req,
          { ok: false, error: "methodId must be a valid UUID" },
          400,
        );
      }

      const { data, error } = await service.rpc(
        "admin_set_default_payment_method",
        {
          p_method_id: methodId,
        },
      );

      if (error) {
        const mapped = mapPaymentMethodRpcError(error.message || "");
        return json(req, { ok: false, error: mapped.error }, mapped.status);
      }

      return json(req, { ok: true, data });
    }

    if (action === "toggleActive") {
      const methodId = typeof body.methodId === "string" ? body.methodId : "";
      if (!isUUID(methodId)) {
        return json(
          req,
          { ok: false, error: "methodId must be a valid UUID" },
          400,
        );
      }
      if (typeof body.isActive !== "boolean") {
        return json(
          req,
          { ok: false, error: "isActive must be a boolean" },
          400,
        );
      }

      const { data, error } = await service.rpc(
        "admin_toggle_payment_method_active",
        {
          p_method_id: methodId,
          p_is_active: body.isActive,
        },
      );

      if (error) {
        const mapped = mapPaymentMethodRpcError(error.message || "");
        return json(req, { ok: false, error: mapped.error }, mapped.status);
      }

      return json(req, { ok: true, data });
    }

    if (action === "delete") {
      const methodId = typeof body.methodId === "string" ? body.methodId : "";
      if (!isUUID(methodId)) {
        return json(
          req,
          { ok: false, error: "methodId must be a valid UUID" },
          400,
        );
      }

      const { data, error } = await service.rpc("admin_delete_payment_method", {
        p_method_id: methodId,
      });

      if (error) {
        const mapped = mapPaymentMethodRpcError(error.message || "");
        return json(req, { ok: false, error: mapped.error }, mapped.status);
      }

      return json(req, { ok: true, data });
    }

    return json(req, { ok: false, error: "Unknown action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = errorToStatus(message);
    console.error("admin-payment-methods error:", message);
    return json(
      req,
      { ok: false, error: status >= 500 ? "Internal server error" : message },
      status,
    );
  }
});
