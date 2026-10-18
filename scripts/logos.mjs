// Parody client logos, 120x80 viewBox. Run `node scripts/logos.mjs` to rebuild src/content/logos.json.
// Fonts (loaded in index.html): Pacifico, Alfa Slab One, Oswald, Playfair Display, Shrikhand.
import { writeFileSync } from "node:fs";
const S = (body, bg = "") => `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">${bg}${body}</svg>`;
const T = (x, y, txt, font, size, fill, extra = "") =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-size="${size}" fill="${fill}" ${extra}>${txt}</text>`;
const crown = (cx, cy, s, fill) =>
  `<path transform="translate(${cx} ${cy}) scale(${s})" d="M-10 4 L-12 -6 L-5 -1 L0 -9 L5 -1 L12 -6 L10 4 Z" fill="${fill}"/>`;
const star = (cx, cy, r, fill) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
};

const LOGOS = {
  // ---- Soft drinks
  "Lola Coca": S(
    T(60, 49, "Lola Coca", "Pacifico", 22, "#fff") +
      `<path d="M22 58 Q60 52 98 58" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    `<rect x="4" y="10" width="112" height="60" rx="10" fill="#C8102E"/>`),
  "Pepso Cola": S(
    `<clipPath id="pc"><circle cx="60" cy="40" r="32"/></clipPath>
     <g clip-path="url(#pc)"><rect x="20" y="0" width="80" height="30" fill="#D22630"/><rect x="20" y="30" width="80" height="20" fill="#fff"/><rect x="20" y="50" width="80" height="40" fill="#1F4E9C"/></g>
     <circle cx="60" cy="40" r="32" fill="none" stroke="#1F4E9C" stroke-width="2"/>` +
      T(60, 46, "PEPSO", "Alfa Slab One", 15, "#1F4E9C")),
  "Dr. Pepperton": S(
    T(60, 40, "Dr Pepperton", "Playfair Display", 17, "#fff", `font-style="italic" font-weight="800"`) +
      `<path d="M30 50 H90" stroke="#E7C873" stroke-width="2"/>` + T(60, 62, "EST. 1885", "Oswald", 8, "#E7C873", `letter-spacing="2"`),
    `<ellipse cx="60" cy="40" rx="56" ry="34" fill="#6E1423"/>`),
  "Shasty Soda": S(
    T(52, 55, "S", "Shrikhand", 40, "#fff") +
      `<circle cx="80" cy="26" r="5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="88" cy="40" r="3" fill="none" stroke="#fff" stroke-width="2"/><circle cx="78" cy="50" r="2" fill="#fff"/>`,
    `<circle cx="60" cy="40" r="34" fill="#F28C28"/>`),
  // ---- Beer & spirits
  "Budwiser": S(
    crown(60, 18, 1, "#C9A227") +
      `<path d="M8 32 H112 L104 44 L112 56 H8 L16 44 Z" fill="#C8102E"/>` +
      T(60, 50, "BUDWISER", "Oswald", 16, "#fff", `font-weight="700" letter-spacing="2"`) +
      T(60, 70, "KING OF LAGERS", "Oswald", 7, "#7a1020", `letter-spacing="2"`)),
  "Schlitzer Brewing": S(
    `<circle cx="60" cy="40" r="32" fill="#6B3E1E"/><ellipse cx="60" cy="40" rx="14" ry="32" fill="none" stroke="#E7B44C" stroke-width="1.5"/>
     <path d="M28 40 H92" stroke="#E7B44C" stroke-width="1.5"/>
     <rect x="14" y="31" width="92" height="18" rx="3" fill="#E7B44C"/>` +
      T(60, 45, "Schlitzer", "Playfair Display", 15, "#6B3E1E", `font-weight="800" font-style="italic"`)),
  "Smirnow Vodka": S(
    `<rect x="10" y="6" width="100" height="68" fill="#fff" stroke="#B5121B" stroke-width="2"/>` + crown(60, 20, 0.9, "#C9A227") +
      `<rect x="10" y="32" width="100" height="18" fill="#B5121B"/>` +
      T(60, 46, "SMIRNOW", "Playfair Display", 15, "#fff", `font-weight="800" letter-spacing="2"`) +
      T(60, 64, "VODKA", "Oswald", 9, "#B5121B", `letter-spacing="4"`)),
  "Cours Banquet Beer": S(
    `<path d="M10 58 L38 22 L52 40 L68 14 L110 58 Z" fill="#2E3B55"/><path d="M38 22 L44 30 L34 30 Z M68 14 L76 25 L60 25 Z" fill="#fff"/>` +
      T(60, 73, "COURS", "Alfa Slab One", 13, "#2E3B55", `letter-spacing="2"`),
    `<rect x="4" y="4" width="112" height="72" rx="6" fill="#E9C46A"/>`),
  // ---- Tobacco
  "Marlbrow": S(
    `<rect x="14" y="6" width="92" height="68" fill="#fff" stroke="#ddd"/><path d="M14 6 H106 V34 L60 18 L14 34 Z" fill="#C8102E"/>` +
      T(60, 56, "MARLBROW", "Playfair Display", 13, "#111", `font-weight="800" letter-spacing="1"`)),
  "Winstone": S(
    T(60, 46, "Winstone", "Playfair Display", 22, "#C8102E", `font-weight="800"`) +
      `<rect x="20" y="52" width="80" height="3" fill="#C9A227"/><rect x="20" y="22" width="80" height="1.5" fill="#C9A227"/>`,
    `<rect x="4" y="10" width="112" height="60" rx="4" fill="#fff" stroke="#e5d8b8"/>`),
  "Camelot Cigarettes": S(
    `<path d="M38 52 V30 h5 v-5 h4 v5 h4 v-5 h4 v5 h4 v-12 h4 v-5 h4 v5 h4 v12 h4 v-5 h4 v5 h4 v-5 h4 v5 h5 V52 Z" fill="#5B3A1E"/><path d="M56 52 v-8 a4 4 0 0 1 8 0 v8 Z" fill="#D8B26E"/>` +
      T(60, 68, "CAMELOT", "Alfa Slab One", 13, "#5B3A1E", `letter-spacing="2"`),
    `<rect x="4" y="4" width="112" height="72" rx="6" fill="#D8B26E"/>`),
  "Virginia Slender": S(
    T(60, 47, "VS", "Playfair Display", 26, "#6A2C70", `font-style="italic"`) +
      `<path d="M24 54 H96" stroke="#6A2C70" stroke-width="1"/>` + T(60, 63, "VIRGINIA SLENDER", "Oswald", 5.5, "#6A2C70", `letter-spacing="2"`),
    `<ellipse cx="60" cy="40" rx="54" ry="34" fill="#F6EAF0" stroke="#6A2C70" stroke-width="1"/>`),
  // ---- Fast food
  "McDougal's": S(
    `<path d="M44 52 V34 a16 16 0 0 1 32 0 V52 h-9 V34 a7 7 0 0 0 -14 0 V52 Z" fill="#FFC72C"/>` +
      T(60, 67, "McDougal's", "Oswald", 11, "#fff", `font-weight="700"`),
    `<rect x="4" y="4" width="112" height="72" rx="8" fill="#DA291C"/>`),
  "Burger Monarch": S(
    crown(60, 12, 0.8, "#C9A227") +
      `<path d="M14 36 a46 18 0 0 1 92 0 Z" fill="#F5A623"/><path d="M14 52 h92 a46 14 0 0 1 -92 0 Z" fill="#F5A623"/>` +
      T(60, 49, "BURGER MONARCH", "Alfa Slab One", 9, "#C8102E")),
  "Colonel's Fried Chicken": S(
    `<path d="M32 18 H88 L80 72 H40 Z" fill="#fff" stroke="#C8102E" stroke-width="2"/>
     <path d="M40 18 h8 l-3 54 h-6 Z M56 18 h8 v54 h-8 Z M72 18 h8 l-5 54 h-6 Z" fill="#C8102E"/>
     <rect x="28" y="34" width="64" height="16" fill="#C8102E"/>` +
      T(60, 46, "COLONEL'S", "Oswald", 11, "#fff", `font-weight="700" letter-spacing="1"`)),
  "Wendell's Burgers": S(
    T(60, 44, "Wendell's", "Pacifico", 20, "#C8102E") +
      Array.from({ length: 10 }, (_, i) => `<rect x="${20 + i * 8}" y="54" width="8" height="5" fill="${i % 2 ? "#fff" : "#C8102E"}"/><rect x="${20 + i * 8}" y="59" width="8" height="5" fill="${i % 2 ? "#C8102E" : "#fff"}"/>`).join(""),
    `<rect x="4" y="8" width="112" height="64" rx="6" fill="#fff" stroke="#e5d8b8"/>`),
  // ---- Airlines
  "Pan Americana": S(
    `<circle cx="34" cy="40" r="24" fill="#1C75BC"/>
     <path d="M12 32 Q34 24 56 32 M10 40 H58 M12 48 Q34 56 56 48" stroke="#fff" stroke-width="2.5" fill="none"/>` +
      T(88, 38, "PAN", "Oswald", 14, "#1C75BC", `font-weight="700" letter-spacing="1"`) + T(88, 52, "AMERICANA", "Oswald", 9, "#1C75BC", `font-weight="700"`)),
  "Braniffic Airways": S(
    `<clipPath id="br"><rect x="4" y="8" width="112" height="64" rx="6"/></clipPath>
     <g clip-path="url(#br)" transform="skewX(-20)">${["#F58220", "#FFD200", "#E5007E", "#00A3E0", "#7AC143"].map((c, i) => `<rect x="${30 + i * 22}" y="0" width="22" height="80" fill="${c}"/>`).join("")}</g>` +
      T(60, 55, "B", "Alfa Slab One", 40, "#fff", `stroke="#222" stroke-width="1.5"`)),
  "Eastward Airlines": S(
    `<path d="M18 40 H74 V28 L102 44 L74 60 V48 H18 Z" fill="#3BB3C3"/>` + T(60, 72, "EASTWARD", "Oswald", 10, "#fff", `letter-spacing="3"`),
    `<rect x="4" y="4" width="112" height="72" rx="6" fill="#0B2545"/>`),
  "Southwestly Air": S(
    `<clipPath id="sw"><path d="M20 52 a40 40 0 0 1 80 0 Z"/></clipPath>
     <g clip-path="url(#sw)">${["#F9B612", "#F2711C", "#D9262C"].map((c, i) => `<rect x="10" y="${12 + i * 14}" width="100" height="14" fill="${c}"/>`).join("")}</g>` +
      T(60, 68, "SOUTHWESTLY", "Oswald", 11, "#304CB2", `font-weight="700" letter-spacing="1"`)),
  // ---- Household
  "Procter & Gambit": S(
    `<circle cx="60" cy="40" r="34" fill="#1B2A55"/><circle cx="60" cy="40" r="31" fill="none" stroke="#E7C873" stroke-width="1"/>
     <mask id="pg"><rect width="120" height="80" fill="#fff"/><circle cx="62" cy="36" r="19" fill="#000"/></mask><circle cx="52" cy="40" r="22" fill="#E7C873" mask="url(#pg)"/>` +
      star(74, 26, 4, "#E7C873") + star(82, 40, 3.5, "#E7C873") + star(72, 54, 4, "#E7C873")),
  "Leaver Bros.": S(
    `<path d="M60 6 L98 16 V40 Q98 64 60 76 Q22 64 22 40 V16 Z" fill="#1F4E9C"/>` +
      T(60, 54, "L", "Playfair Display", 40, "#fff", `font-style="italic" font-weight="800"`)),
  "Colgait-Palmer": S(
    T(60, 46, "COLGAIT", "Alfa Slab One", 19, "#fff", `letter-spacing="1"`) + T(60, 60, "PALMER", "Oswald", 8, "#fff", `letter-spacing="4"`),
    `<rect x="4" y="16" width="112" height="50" rx="4" fill="#D2232A"/>`),
  "Ajaks Cleanser": S(
    `<path d="M60 6 L108 40 L60 74 L12 40 Z" fill="#fff" stroke="#00843D" stroke-width="3"/><path d="M66 12 L52 42 H62 L54 68 L74 36 H64 L72 12 Z" fill="#00A3E0" opacity="0.35"/>` +
      T(60, 47, "AJAKS", "Alfa Slab One", 17, "#00843D", `letter-spacing="1"`)),
  // ---- Automobiles
  "General Motorworks": S(
    T(60, 46, "GMW", "Oswald", 28, "#fff", `font-weight="700" letter-spacing="2"`) + `<rect x="30" y="52" width="60" height="4" fill="#fff"/>`,
    `<rect x="24" y="6" width="72" height="68" rx="4" fill="#0057A8"/>`),
  "Fard Motor Co.": S(
    T(60, 50, "Fard", "Pacifico", 26, "#fff"),
    `<rect x="6" y="12" width="108" height="56" rx="20" fill="#133A7C" stroke="#C0C7D6" stroke-width="3"/>`),
  "Volksauto": S(
    `<circle cx="60" cy="40" r="34" fill="#1E3F8F"/><circle cx="60" cy="40" r="29" fill="none" stroke="#fff" stroke-width="3"/>
` + T(60, 40, "V", "Oswald", 24, "#fff", `font-weight="700"`) + T(60, 64, "A", "Oswald", 24, "#fff", `font-weight="700"`)),
  "Datsan": S(
    `<circle cx="60" cy="40" r="30" fill="#F04E23"/><rect x="6" y="30" width="108" height="20" fill="#1B2F6B"/>` +
      T(60, 46, "DATSAN", "Oswald", 15, "#fff", `font-weight="700" letter-spacing="4"`)),
  // ---- Tech
  "IBN Business Machines": S(
    `<mask id="ibn"><rect width="120" height="80" fill="#fff"/>${[24, 31, 38, 45, 52].map((y) => `<rect x="0" y="${y}" width="120" height="2.6" fill="#000"/>`).join("")}</mask>` +
      `<g mask="url(#ibn)">${T(60, 58, "IBN", "Alfa Slab One", 40, "#1F70C1")}</g>`),
  "Zeroxx Copiers": S(
    T(52, 50, "ZEROX", "Oswald", 26, "#111", `font-weight="700" font-style="italic"`) + T(100, 50, "X", "Oswald", 26, "#D2232A", `font-weight="700"`),
    `<rect x="4" y="14" width="112" height="52" rx="4" fill="#fff" stroke="#ddd"/>`),
  "Polaroyd": S(
    ["#E4322B", "#F58220", "#FFD200", "#3AB54A", "#1C75BC"].map((c, i) => `<rect x="${18 + i * 6}" y="14" width="6" height="40" fill="${c}"/>`).join("") +
      T(80, 40, "Pola", "Playfair Display", 15, "#222", `font-weight="800"`) + T(80, 55, "royd", "Playfair Display", 15, "#222", `font-weight="800"`) +
      T(60, 70, "LAND CAMERA", "Oswald", 6, "#555", `letter-spacing="2"`),
    `<rect x="8" y="6" width="104" height="68" rx="4" fill="#fff" stroke="#ddd"/>`),
  "Apricot Computer": S(
    `<clipPath id="apc"><circle cx="60" cy="44" r="27"/></clipPath>
     <g clip-path="url(#apc)">${["#7AC143", "#FFD200", "#F58220", "#E4322B", "#9B4F96", "#1C75BC"].map((c, i) => `<rect x="30" y="${17 + i * 9}" width="60" height="9" fill="${c}"/>`).join("")}</g>
     <path d="M60 17 Q60 10 64 6" stroke="#5B3A1E" stroke-width="3" fill="none"/><path d="M63 12 Q76 4 80 14 Q70 18 63 12 Z" fill="#7AC143"/>
     <path d="M60 19 Q57 44 60 70" stroke="#fff" stroke-width="1.5" fill="none" opacity="0.6"/>`),
  // ---- Cosmetics
  "Revlorn": S(
    T(60, 47, "REVLORN", "Playfair Display", 18, "#fff", `letter-spacing="3"`),
    `<rect x="4" y="14" width="112" height="52" fill="#111"/>`),
  "Avonne Calling": S(
    T(56, 46, "Avonne", "Pacifico", 22, "#C2185B") + `<circle cx="100" cy="30" r="7" fill="none" stroke="#C2185B" stroke-width="2"/><circle cx="100" cy="30" r="2.5" fill="#C2185B"/>` +
      T(60, 64, "DING DONG", "Oswald", 7, "#C2185B", `letter-spacing="3"`),
    `<rect x="4" y="8" width="112" height="64" rx="32" fill="#FCE4EC"/>`),
  "Clairall": S(
    T(60, 48, "Clairall", "Playfair Display", 22, "#fff", `font-style="italic"`) + `<path d="M28 56 Q60 62 92 56" stroke="#fff" stroke-width="1.5" fill="none"/>`,
    `<rect x="4" y="12" width="112" height="56" rx="6" fill="#00897B"/>`),
  "Maybelle": S(
    T(60, 46, "maybelle", "Playfair Display", 20, "#E91E63", `font-weight="800"`) + T(60, 60, "OF NEW YORK", "Oswald", 7, "#fff", `letter-spacing="3"`),
    `<rect x="4" y="14" width="112" height="52" rx="4" fill="#111"/>`),
  // ---- Toys
  "Mattle": S(
    T(60, 45, "MATTLE", "Alfa Slab One", 12, "#fff", `letter-spacing="1"`),
    `<circle cx="60" cy="40" r="34" fill="#D6001C"/><circle cx="60" cy="40" r="30" fill="none" stroke="#fff" stroke-width="1.5"/>`),
  "Hasbrow": S(
    T(60, 44, "HASBROW", "Alfa Slab One", 16, "#fff") + `<path d="M38 52 Q60 64 82 52" stroke="#FFD200" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<rect x="4" y="12" width="112" height="56" rx="10" fill="#0072CE"/>`),
  "Atarii": S(
    `<path d="M54 10 h4 v44 h-4 Z M62 10 h4 v44 h-4 Z" fill="#E4322B"/><path d="M50 10 h4 v8 q-2 30 -20 36 v-5 q14 -6 16 -31 Z M70 10 h-4 v8 q2 30 20 36 v-5 q-14 -6 -16 -31 Z" fill="#E4322B"/>` +
      T(60, 72, "ATARII", "Oswald", 12, "#fff", `font-weight="700" letter-spacing="5"`),
    `<rect x="4" y="4" width="112" height="72" rx="6" fill="#111"/>`),
  "Whammo": S(
    star(60, 40, 38, "#FFD200") + T(60, 45, "WHAMMO!", "Shrikhand", 11, "#D6001C")),
  // ---- Banking
  "Chaste Manhattan": S(
    `<path d="M60 4 L88 20 V52 L60 68 L32 52 V20 Z M60 26 L49 32 V44 L60 50 L71 44 V32 Z" fill="#0F4C97" fill-rule="evenodd"/>` +
      T(60, 78, "CHASTE", "Oswald", 9, "#0F4C97", `letter-spacing="3"`)),
  "American Expressly": S(
    T(60, 34, "AMERICAN", "Oswald", 13, "#fff", `font-weight="700" letter-spacing="2"`) + T(60, 52, "EXPRESSLY", "Oswald", 13, "#fff", `font-weight="700" letter-spacing="2"`),
    `<rect x="8" y="8" width="104" height="64" fill="#2671B9"/><rect x="12" y="12" width="96" height="56" fill="none" stroke="#fff" stroke-width="1"/>`),
  "Prudentious Insurance": S(
    `<path d="M14 62 L34 34 L42 40 L60 12 L72 26 L86 22 L106 62 Z" fill="#1F4E9C"/><path d="M60 12 L66 20 L58 26 Z" fill="#fff" opacity="0.5"/>` +
      T(60, 75, "PRUDENTIOUS", "Oswald", 10, "#1F4E9C", `font-weight="700" letter-spacing="2"`)),
  "First Savings of Queens": S(
    `<path d="M30 26 L60 10 L90 26 Z" fill="#fff"/><rect x="30" y="56" width="60" height="5" fill="#fff"/>` +
      [36, 48, 60, 72, 84].map((x) => `<rect x="${x - 2.5}" y="30" width="5" height="24" fill="#fff"/>`).join("") +
      T(60, 72, "FIRST SAVINGS", "Oswald", 8, "#fff", `letter-spacing="2"`),
    `<rect x="4" y="4" width="112" height="72" rx="6" fill="#2E6B3F"/>`),
  // ---- Oil & gas
  "Exxo": S(
    T(60, 50, "EXXO", "Oswald", 30, "#D2232A", `font-weight="700" letter-spacing="2"`),
    `<rect x="10" y="14" width="100" height="52" rx="4" fill="#fff" stroke="#1F4E9C" stroke-width="4"/>`),
  "Texacko": S(
    `<circle cx="60" cy="40" r="34" fill="#fff" stroke="#111" stroke-width="2"/>` + star(60, 42, 30, "#D2232A") + T(60, 52, "T", "Oswald", 26, "#fff", `font-weight="700" stroke="#2E7D32" stroke-width="1.5"`)),
  "Shellby Oil": S(
    `<path d="M60 70 C30 70 18 46 30 28 C42 10 76 8 88 26 C100 44 90 70 60 70 Z" fill="#FFD200" stroke="#D2232A" stroke-width="3"/>
     <path d="M60 64 C44 62 38 44 50 34 C60 26 76 32 74 44 C72 54 60 54 58 46 C56 40 64 38 66 42" fill="none" stroke="#D2232A" stroke-width="3" stroke-linecap="round"/>`),
  "Sunny Oil": S(
    `<clipPath id="sun"><rect x="4" y="4" width="112" height="50"/></clipPath><circle cx="60" cy="54" r="26" fill="#FFD200" clip-path="url(#sun)"/>` +
      [-60, -30, 0, 30, 60].map((a) => `<rect x="58.5" y="12" width="3" height="10" fill="#FFD200" transform="rotate(${a} 60 54)"/>`).join("") +
      `<rect x="4" y="54" width="112" height="2" fill="#FFD200"/>` + T(60, 70, "SUNNY", "Alfa Slab One", 12, "#FFD200", `letter-spacing="3"`),
    `<rect x="4" y="4" width="112" height="72" rx="6" fill="#1B3A6B"/>`),
};

writeFileSync(new URL("../src/content/logos.json", import.meta.url), JSON.stringify(LOGOS, null, 0) + "\n");
