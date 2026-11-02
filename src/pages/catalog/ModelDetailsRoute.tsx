import { useParams } from "react-router-dom";
import LegacyModelDetails from "./ModelDetails";
import CanonicalModelDetails from "./CanonicalModelDetails";

const LEGACY_MODEL_ID =
  /(?:^|-)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ModelDetailsRoute() {
  const { id } = useParams<{ id: string }>();
  return id && !LEGACY_MODEL_ID.test(id) ? (
    <CanonicalModelDetails />
  ) : (
    <LegacyModelDetails />
  );
}
