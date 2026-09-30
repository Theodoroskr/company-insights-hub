// Shared caller authorization for order-related edge functions.
// Allowed: backend/service-role calls, staff with edit rights on the given
// section, the signed-in order owner, or (guest checkout) an anonymous caller
// for a guest order created in the last 30 minutes.
// deno-lint-ignore-file no-explicit-any

const PAID = ["paid", "processing", "completed", "fulfilled"];
const GUEST_WINDOW_MS = 30 * 60 * 1000;

export type OrderAuth =
  | { ok: true; service: boolean; staff: boolean; userId: string | null }
  | { ok: false; status: number; error: string };

export function bearer(req: Request): string {
  return (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
}

export function isServiceCall(req: Request): boolean {
  const t = bearer(req);
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return !!t && !!key && t === key;
}

export async function getCallerUser(req: Request, admin: any): Promise<string | null> {
  const t = bearer(req);
  if (!t || t === Deno.env.get("SUPABASE_ANON_KEY") || isServiceCall(req)) return null;
  const { data } = await admin.auth.getUser(t);
  return data?.user?.id ?? null;
}

export async function isStaffFor(admin: any, userId: string, section: string): Promise<boolean> {
  const { data } = await admin.rpc("has_permission", { _user_id: userId, _section: section, _need_edit: true });
  return data === true;
}

export async function authorizeOrder(
  req: Request,
  admin: any,
  orderId: string | null | undefined,
  opts: { requirePaid?: boolean; requirePending?: boolean; section?: string } = {},
): Promise<OrderAuth> {
  if (isServiceCall(req)) return { ok: true, service: true, staff: false, userId: null };
  if (!orderId) return { ok: false, status: 404, error: "Order not found" };

  const { data: order } = await admin
    .from("orders").select("id, user_id, status, created_at").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, status: 404, error: "Order not found" };

  const uid = await getCallerUser(req, admin);
  if (uid && (await isStaffFor(admin, uid, opts.section ?? "fulfillment"))) {
    return { ok: true, service: false, staff: true, userId: uid };
  }

  let owner = false;
  if (uid) owner = order.user_id === uid;
  else if (!order.user_id) {
    const age = Date.now() - new Date(order.created_at).getTime();
    owner = age >= 0 && age < GUEST_WINDOW_MS;
  }
  if (!owner) return { ok: false, status: uid ? 403 : 401, error: uid ? "Forbidden" : "Unauthorized" };

  if (opts.requirePaid && !PAID.includes(order.status ?? "")) {
    return { ok: false, status: 402, error: "Order is not paid" };
  }
  if (opts.requirePending && order.status !== "pending") {
    return { ok: false, status: 409, error: "Order already processed" };
  }
  return { ok: true, service: false, staff: false, userId: uid };
}
