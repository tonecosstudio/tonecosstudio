/** Local preview entry only; production keeps src/main.tsx. */
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { CatalogMvpShell } from "./CatalogMvpShell";
import "./index.css";
import "./styles/landing-page.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <CatalogMvpShell />
  </HelmetProvider>,
);
