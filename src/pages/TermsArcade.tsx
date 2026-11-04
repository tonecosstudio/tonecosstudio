/** Commercial legal-page controller; pure presentation is used by the catalog MVP. */
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { TermsArcadeView } from "./TermsArcadeView";

export default function TermsArcade() {
  const readOnly = import.meta.env.VITE_PREVIEW_READ_ONLY === "true";
  const { data: settings } = useSystemSettings({ enabled: !readOnly });
  return <TermsArcadeView settings={settings} />;
}
