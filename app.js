// === app.js ===
// Kalkyl, autosave och rendering

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

// --- LocalStorage helpers ---

function saveState() {
  const inputs = Array.from(document.querySelectorAll("input, select"));
  const obj = {};
  inputs.forEach(
    (i) => (obj[i.id] = i.type === "checkbox" ? i.checked : i.value)
  );
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

function loadState() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;
  const obj = JSON.parse(raw);
  Object.entries(obj).forEach(([k, v]) => {
    const i = el(k);
    if (!i) return;
    if (i.type === "checkbox") i.checked = !!v;
    else i.value = v;
  });
}

// --- Bind autosave ---
function bindAutoSave() {
  console.log("Saved")
  document.querySelectorAll("input, select").forEach((i) => {
    const handler = () => {
      saveState();
      compute();
    };
    i.addEventListener("input", handler);
    i.addEventListener("change", handler);
  });
}

// --- Core calculation helpers ---
function readPrice(id) {
  return Number.parseFloat(el(id)?.value) ?? 0;
}

function qty(id) {
  return Number.parseFloat(el(id)?.value) ?? 0;
}

// --- Special computation ---
function computeSpecial() {
  const typ = el("spec_typ").value;

  // areas in m²
  const ant = ~~qty("spec_antal");
  const b = ~~qty("spec_b");
  const d = ~~qty("spec_d");
  const h = ~~qty("spec_h");

  // TODO: check how to calc this
  console.log(b, h);
  const shelves = qty("spec_hyll");
  const surfaceCalc = typ === "skiva" ? b * h : 2 * (b * h + b * d + d * h);
  const m2 = (surfaceCalc / 1e6) * ant; // front area
  console.log(m2);

  setText("spec_m2", m2 ? m2.toFixed(2) : "—");

  const p_m2 = readPrice(
    typ === "skiva" ? "p_spec_skiva_m2" : "p_spec_mobel_m2"
  );
  const p_hyll = readPrice("p_hyllplan");
  const sidePct = readPrice("p_paslag_side_pct") / 100;

  const sideCount = ["spec_utv", "spec_bak", "spec_under", "spec_inv"]
    .map((id) => (el(id).checked ? 1 : 0))
    .reduce((a, b) => a + b, 0);

  let sum = m2 * p_m2;
  sum += shelves * p_hyll;
  sum *= 1 + sideCount * sidePct;

  setText("spec_sum", SEK(sum));

  return sum;
}

// --- Main compute() function ---
function compute() {
  // material lines
  const map = [
    ["lucka_u1000", "p_lucka_u1000"],
    ["lucka_1000_1500", "p_lucka_1000_1500"],
    ["lucka_spegel", "p_lucka_spegel"],
    ["skafferidor", "p_skafferidor"],
    ["garderob_o1500", "p_garderob_o1500"],
    ["ladfront_45", "p_ladfront_45"],
    ["ladfront_stor", "p_ladfront_stor"],
    ["innerdor", "p_innerdor"],
    ["innerdor_glas", "p_innerdor_glas"],
    ["stol", "p_stol"],
    ["kryddhylla", "p_kryddhylla"],
    ["bord", "p_bord"],
    ["ytterdor_1", "p_ytterdor_1"],
    ["ytterdor_2", "p_ytterdor_2"],
    ["karm", "p_karm"],
    ["sidoljus", "p_sidoljus"],
    ["sockel_m", "p_sockel_m"],
  ];

  let material = 0;
  for (const [qtyId, priceId] of map) {
    const q = qty(qtyId);
    const p = readPrice(priceId);
    const line = !Number.isNaN(q) ? q * p : 0;
    setText("line_" + qtyId, q > 0 ? SEK(line) : "—");
    material += line;
  }

  const spec_sum = computeSpecial();
  const belopp = material + spec_sum;
  setText("belopp", SEK(belopp));

  // extras
  const spack = ~~qty("spackling")*readPrice("p_spackling");
  const stall = ~~qty("stallkostnad")*readPrice("p_stallkostnad");

  setText("res_spackling", SEK(spack));
  setText("res_stallkostnad", SEK(stall));

  const besok = ~~qty("besok");
  const prisBesok = ~~readPrice("p_besok");
  const resor = besok * prisBesok;

  // subtotal before discount
  let subtotal = belopp + spack + stall + resor;
  
  // discount
  const rabattPct = ~~(Number.parseFloat(el("rabatt").value) ?? 0) / 100;
  const rabattBelopp = subtotal * rabattPct;
  setText("res_rabatt", rabattPct ? "− " + SEK(rabattBelopp) : SEK(0));
  subtotal -= rabattBelopp;

  // VAT and ROT
  setText("summa", SEK(subtotal));
  setText("exkl_rot", SEK(subtotal * 0.7));

  const vatPct = (Number.parseFloat(el("vat").value) ?? 0) / 100;
  const inklMoms = subtotal * (1 + vatPct);
  setText("inkl_moms", SEK(inklMoms));
}

// --- Init ---
loadState();
compute();
