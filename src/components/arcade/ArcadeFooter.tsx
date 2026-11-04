/** Commercial footer controller; the MVP uses the same view without settings queries. */
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { ArcadeFooterView } from "./ArcadeFooterView";

export function ArcadeFooter() {
  const readOnly = import.meta.env.VITE_PREVIEW_READ_ONLY === "true";
  const { data: settings } = useSystemSettings({ enabled: !readOnly });
  return <ArcadeFooterView settings={settings} />;
}
