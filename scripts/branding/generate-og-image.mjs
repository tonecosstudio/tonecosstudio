import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Single, deterministic social image for the Tonecos brand.
// Generated at build-time, never from a remote catalog or customer data.
const output = fileURLToPath(new URL("../../dist/og-image.png", import.meta.url));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#080808"/>
  <path d="M50 56H1150V574H50Z" fill="none" stroke="#b68b3b" stroke-width="2"/>
  <path d="M84 95H1116M84 535H1116" stroke="#b68b3b" stroke-width="1" opacity=".5"/>
  <path d="M86 94H260M940 94H1114" stroke="#f5c766" stroke-width="4"/>
  <text x="92" y="156" fill="#c49a4e" font-family="Arial,sans-serif" font-size="25" font-weight="700" letter-spacing="11">TONECOS STUDIO</text>
  <text x="88" y="342" fill="#f7f5ef" font-family="Arial,sans-serif" font-size="128" font-weight="800" letter-spacing="13">TONECOS</text>
  <rect x="89" y="373" width="700" height="3" fill="#c49a4e"/>
  <text x="92" y="437" fill="#d3a958" font-family="Arial,sans-serif" font-size="36" font-weight="700" letter-spacing="4">ESCULTURAS SOB ENCOMENDA</text>
  <text x="92" y="496" fill="#aba49b" font-family="Arial,sans-serif" font-size="25" letter-spacing="3">PERSONAGENS  ·  MODELOS  ·  COLECIONÁVEIS</text>
  <circle cx="1000" cy="314" r="112" stroke="#8e702f" stroke-width="3" fill="none"/>
  <circle cx="1000" cy="314" r="80" stroke="#8e702f" stroke-width="2" fill="none"/>
  <path d="M1000 181V447M867 314H1133" stroke="#8e702f" stroke-width="2"/>
  <circle cx="1000" cy="314" r="10" fill="#e5b752"/>
</svg>`;
await sharp(Buffer.from(svg)).png({ palette: true, quality: 90, compressionLevel: 9 })
  .toFile(output);
