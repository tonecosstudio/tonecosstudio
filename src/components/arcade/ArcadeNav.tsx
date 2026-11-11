/** Commercial navigation controller: only this module imports auth/coins. */
import { useAuth } from "@/lib/auth";
import { useCurrentUserIsAdmin } from "@/lib/roles";
import { useCoinsBalance } from "@/hooks/coins/useCoinsBalance";
import { ArcadeNavView } from "./ArcadeNavView";

const PREVIEW_READ_ONLY = import.meta.env.VITE_PREVIEW_READ_ONLY === "true";

export function ArcadeNav() {
  const { user } = useAuth();
  const visibleUser = PREVIEW_READ_ONLY ? null : user;
  const { data: isAdmin } = useCurrentUserIsAdmin({
    currentUserId: visibleUser?.id,
    enabled: !PREVIEW_READ_ONLY,
  });
  const { data: balanceData, isLoading: balanceLoading } = useCoinsBalance(
    visibleUser?.id,
    { enabled: !!visibleUser },
  );
  return <ArcadeNavView
    visibleUser={!!visibleUser}
    isAdmin={!!isAdmin}
    userBalance={balanceData?.balance ?? 0}
    balanceLoading={balanceLoading}
  />;
}
