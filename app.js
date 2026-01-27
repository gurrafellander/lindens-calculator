// === app.js ===
// Stateless kalkyl – live beräkning utan persistens

// ===== Prices (loaded once from prices.json) =====
let PRICES = {};

// --- Helpers ---
const el = (id) => document.getElementById(id);

const setText = (id, v) => {
  const element = el(id);
  if (element) element.textContent = v;
};

const SEK = (v) =>
  Number.isFinite(v)
    ? new Intl.NumberFormat("sv-SE", {
        style: "currency",
        currency: "SEK",
      }).format(v)
    : "—";

// --- Safe numeric readers ---
function readNumber(id) {
  const v = Number.parseFloat(el(id)?.value);
  return Number.isFinite(v) ? v : 0;
}

function readInt(id) {
  return Math.floor(readNumber(id));
}

async function loadPriceDefaults() {
  try {
    const res = await fetch("prices.json");
    PRICES = await res.json();
    compute(); // first valid compute
  } catch (err) {
    console.error("Failed to load prices.json", err);
  }
}

// --- Special computation ---
function computeSpecial() {
  const typ = el("spec_typ").value;

  const ant = readInt("spec_antal");
  const b = readInt("spec_b");
  const d = readInt("spec_d");
  const h = readInt("spec_h");
  const shelves = readInt("spec_hyll");

  const surfaceCalc =
    typ === "skiva"
      ? b * h
      : 2 * (b * h + b * d + d * h);

  const m2 = (surfaceCalc / 1e6) * ant;

  setText("spec_m2", m2 > 0 ? m2.toFixed(2) : "—");

  const p_m2 = readNumber(
    typ === "skiva" ? "p_spec_skiva_m2" : "p_spec_mobel_m2"
  );
  const p_hyll = readNumber("p_hyllplan");

  const sideCount = ["spec_utv", "spec_bak", "spec_under", "spec_inv"]
    .map((id) => (el(id)?.checked ? 1 : 0))
    .reduce((a, b) => a + b, 0);

  let sum = m2 * p_m2;
  sum += shelves * p_hyll;
  sum *= 1 + sideCount;

  setText("spec_sum", sum > 0 ? SEK(sum) : "—");

  return sum;
}

// --- Main compute ---
function compute() {
  const type = el("typ_material").value;

  const items = [
    "lucka_u1000",
    "lucka_1000_1500",
    "lucka_spegel",
    "skafferidor",
    "garderob_o1500",
    "ladfront_45",
    "ladfront_stor",
    "innerdor",
    "innerdor_glas",
    "stol",
    "kryddhylla",
    "bord",
    "ytterdor_1",
    "ytterdor_2",
    "karm",
    "sidoljus",
    "sockel_m",
  ];

  let material = 0;

  for (const id of items) {
    const q = readNumber(id);
    const key = `${type}_p_${id}`;
    const p = PRICES[key] ?? 0;

    // console.log(key, "qty:", q, "price:", p);

    const line = q * p;
    setText("line_" + id, q > 0 ? SEK(line) : "—");
    material += line;
  }

  const specSum = computeSpecial();
  const belopp = material + specSum;

  setText("belopp", SEK(belopp));

  // --- Extras ---
  console.log(readInt("spackling"), `${type}_p_spackling`)
  const spack = readInt("spackling") * PRICES[`${type}_p_spackling`];
  const stall = readInt("stallkostnad") * PRICES[`${type}_p_stallkostnad`];
  const color = readInt("color") * PRICES[`${type}_p_color`];

  setText("res_spackling", SEK(spack));
  setText("res_stallkostnad", SEK(stall));
  setText("res_color", SEK(color));

  const subtotal = belopp + spack + stall + color;

  setText("summa", SEK(subtotal));
  setText("exkl_rot", SEK(subtotal * 0.7));

  const vatPct = el("vat")?.checked ? 0.25 : 0;
  const inklMoms = subtotal * (1 + vatPct);

  setText("inkl_moms", SEK(inklMoms));
}

// ===== Init =====
loadPriceDefaults();

document.querySelectorAll("input, select").forEach((node) => {
  node.addEventListener("input", compute);
  node.addEventListener("change", compute);
});
