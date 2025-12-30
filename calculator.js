"use strict";

/* =========================================================
   EXPOSURE TOOL – FIXED + 1/3 STOPS + SECONDARY SUGGESTION
========================================================= */

/* =========================
   CAMERA DATA
========================= */
const FPS_OPTIONS = [12, 16, 18, 23.976, 24, 25, 30, 48, 50, 60];
const SHUTTER_OPTIONS = [360, 270, 180, 144, 90, 45];
const LENS_DATA = {
  "Cooke Panchro Classic FF": [
    { focal: 18, t: 2.2 },
    { focal: 25, t: 2.2 },
    { focal: 32, t: 2.2 },
    { focal: 50, t: 2.2 },
    { focal: 75, t: 2.2 }
  ],

  "IronGlass Zeiss Jena": [
    { focal: 20, t: 2.9 },
    { focal: 24, t: 2.9 },
    { focal: 28, t: 2.9 },
    { focal: 35, t: 2.5 },
    { focal: 50, t: 1.9 },
    { focal: 80, t: 1.9 },
    { focal: 120, t: 2.9 }
  ],

  "IronGlass Sovjet MKII": [
    { focal: 20, t: 3.6 },
    { focal: 28, t: 3.6 },
    { focal: 37, t: 2.9 },
    { focal: 58, t: 2.1 },
    { focal: 85, t: 1.6 },
    { focal: 135, t: 2.9 }
  ],

  "IronGlass RED P": [
    { focal: 37, t: 2.9 },
    { focal: 58, t: 2.1 },
    { focal: 85, t: 2.1 }
  ],

  "IronGlass Sovjet Medium Format": [
    { focal: 30, t: 3.8 },
    { focal: 35, t: 2.9 },
    { focal: 45, t: 3.9 },
    { focal: 65, t: 3.8 },
    { focal: 80, t: 2.9 },
    { focal: 90, t: 3.0 },
    { focal: 120, t: 2.9 },
    { focal: 150, t: 3.0 }
  ],

  "DZO Arles": [
    { focal: 14, t: 1.9 },
    { focal: 21, t: 1.4 },
    { focal: 25, t: 1.4 },
    { focal: 35, t: 1.4 },
    { focal: 40, t: 1.4 },
    { focal: 50, t: 1.4 },
    { focal: 75, t: 1.4 },
    { focal: 100, t: 1.4 },
    { focal: 135, t: 1.8 },
    { focal: 180, t: 2.4 }
  ],

  "Blazar Remus": [
    { focal: 35, t: 1.6 },
    { focal: 45, t: 2.0 },
    { focal: 65, t: 2.0 },
    { focal: 100, t: 2.8 }
  ],

  "Lomo Standard Speed": [
    { focal: 18, t: 3.1 },
    { focal: 22, t: 2.2 },
    { focal: 28, t: 2.3 },
    { focal: 35, t: 2.3 },
    { focal: 50, t: 2.2 },
    { focal: 75, t: 2.2 },
    { focal: 100, t: 2.3 }
  ]
};
const CAMERA_DATA = {
  arri: {
    iso: [160,200,250,320,400,500,640,800,1000,1280,1600,2000,2560,3200],
    defaultISO: 800,
    nativeISO: [800],
    nd: [0,0.3,0.6,0.9,1.2,1.5,1.8,2.1,2.4]
  },

  venice: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    defaultISO: 500,
    nativeISO: [500, 2500],
    nd: [0,0.3,0.6,0.9,1.2,1.5,1.8,2.1,2.4]
  },

  eterna: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    defaultISO: 800,
    nativeISO: [800],
    nd: (() => {
      const v = [0,0.3];
      for (let n=0.6; n<=2.1+0.0001; n+=0.05) v.push(Number(n.toFixed(2)));
      v.push(2.4);
      return v;
    })()
  }
};

/* =========================
   CONSTANTS
========================= */

const REF_T = 2.8;
const REF_SHUTTER = 1 / 50;

/* =========================
   PHYSICS (EXACT)
========================= */

const isoStops = iso => Math.log2(iso / 800);

const shutterSpeed = (fps, angle) => (angle / 360) * (1 / fps);

const shutterStops = (fps, angle) =>
  Math.log2(shutterSpeed(fps, angle) / REF_SHUTTER);

const tStops = t => -2 * Math.log2(t / REF_T);

const ndStops = nd => nd / 0.3;

const exposure = (fps, angle, iso, t, nd) =>
  isoStops(iso) +
  shutterStops(fps, angle) +
  tStops(t) -
  ndStops(nd);

/* =========================
   HELPERS – 1/3 STOP SYSTEM
========================= */

const apertureStops = t => 2 * Math.log2(t / REF_T);

const snapStopsThirds = stops => Math.round(stops * 3) / 3;

const stopsToT = apStops => REF_T * Math.pow(2, apStops / 2);

function toThirdLabel(apStopsSnapped) {
  const full = Math.floor(apStopsSnapped + 1e-9);
  let frac = apStopsSnapped - full;

  if (Math.abs(frac) < 1e-9) frac = 0;

  const baseT = stopsToT(full);

  let fracLabel = "";
  if (Math.abs(frac - 1/3) < 1e-6) fracLabel = "+1/3";
  else if (Math.abs(frac - 2/3) < 1e-6) fracLabel = "+2/3";
  else if (Math.abs(frac + 1/3) < 1e-6) fracLabel = "-1/3";
  else if (Math.abs(frac + 2/3) < 1e-6) fracLabel = "-2/3";

  return { baseT, fracLabel };
}

function formatTThirds(tExact) {
  const apExact = apertureStops(tExact);
  const apSnapped = snapStopsThirds(apExact);
  const tSnapped = stopsToT(apSnapped);
  const lbl = toThirdLabel(apSnapped);

  return {
    exact: tExact,
    snapped: tSnapped,
    apExact,
    apSnapped,
    label: `T${lbl.baseT.toFixed(1)}${lbl.fracLabel ? " " + lbl.fracLabel : ""}`,
  };
}

/* =========================
   HELPERS – SNAP ISO / ND
========================= */

function snapISO(isoExact, cam) {
  const list = CAMERA_DATA[cam].iso;
  let best = list[0];
  let bestDiff = Infinity;

  for (const v of list) {
    const d = Math.abs(v - isoExact);
    if (d < bestDiff) {
      bestDiff = d;
      best = v;
    }
  }
  return { snapped: best, exact: isoExact };
}

function snapNDClosest(ndExact, cam, minND = 0) {
  const list = CAMERA_DATA[cam].nd;
  let best = list[0];
  let bestErr = Infinity;

  for (const v of list) {
    if (v < minND) continue;
    const err = Math.abs(v - ndExact);
    if (err < bestErr) {
      bestErr = err;
      best = v;
    }
  }
  return { snapped: best, exact: ndExact };
}

/* =========================
   SECONDARY SUGGESTION (ISO)
========================= */

function isoCompSuggestion(currentIso, cam, errorStops) {
  const isoExact = currentIso * Math.pow(2, errorStops);
  const iso = snapISO(isoExact, cam);

  const dir = errorStops > 0 ? "increase" : "decrease";
  const abs = Math.abs(errorStops);

  return {
    text:
      `Secondary suggestion: ${dir} B ISO to <strong>${iso.snapped}</strong>` +
      ` <small>(exact: ${iso.exact.toFixed(0)})</small>` +
      ` <small>— to compensate ${abs.toFixed(2)} stop error</small>`,
  };
}

/* =========================
   DOM (safe getters)
========================= */

const $ = (id) => document.getElementById(id);

const camera_a = window.camera_a || $("camera_a");
const camera_b = window.camera_b || $("camera_b");

const a_lens_series = $("a_lens_series");
const a_lens_focal  = $("a_lens_focal");
const b_lens_series = $("b_lens_series");
const b_lens_focal  = $("b_lens_focal");

const a_fps      = window.a_fps      || $("a_fps");
const a_shutter  = window.a_shutter  || $("a_shutter");
const a_iso      = window.a_iso      || $("a_iso");
const a_t        = window.a_t        || $("a_t");
const a_t_custom = window.a_t_custom || $("a_t_custom");
const a_nd       = window.a_nd       || $("a_nd");

const b_fps      = window.b_fps      || $("b_fps");
const b_shutter  = window.b_shutter  || $("b_shutter");
const b_iso      = window.b_iso      || $("b_iso");
const b_t        = window.b_t        || $("b_t");
const b_t_custom = window.b_t_custom || $("b_t_custom");
const b_nd       = window.b_nd       || $("b_nd");

const result     = window.result     || $("result");

/* =========================
   POPULATORS
========================= */

function populateISO(select, cam) {
  select.innerHTML = "";
  const native = CAMERA_DATA[cam].nativeISO || [];

  CAMERA_DATA[cam].iso.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = native.includes(v) ? `${v} *` : `${v}`;
    select.appendChild(o);
  });

  select.value = CAMERA_DATA[cam].defaultISO;
}

function populateND(select, cam) {
  select.innerHTML = "";
  CAMERA_DATA[cam].nd.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v === 0 ? "Clear" : v.toFixed(2);
    select.appendChild(o);
  });
  select.value = 0;
}
function populateFPS(select) {
  select.innerHTML = "";
  FPS_OPTIONS.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  });

  const custom = document.createElement("option");
  custom.value = "custom";
  custom.textContent = "Custom…";
  select.appendChild(custom);

  select.value = select.dataset.default || FPS_OPTIONS[0];
}

function populateShutter(select) {
  select.innerHTML = "";

  SHUTTER_OPTIONS.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = `${v}°`;
    select.appendChild(o);
  });

  const custom = document.createElement("option");
  custom.value = "custom";
  custom.textContent = "Custom…";
  select.appendChild(custom);

  select.value = select.dataset.default || SHUTTER_OPTIONS[0];
}

function populateLensSeries(select){
  select.innerHTML = `<option value="">Select lens series…</option>`;
  Object.keys(LENS_DATA).forEach(series=>{
    const o = document.createElement("option");
    o.value = series;
    o.textContent = series;
    select.appendChild(o);
  });
}

function onLensSeriesChange(side){
  const seriesSelect = $(`${side}_lens_series`);
  const focalSelect  = $(`${side}_lens_focal`);

  const series = seriesSelect.value;

  focalSelect.innerHTML = `<option value="">Select focal length…</option>`;
  focalSelect.disabled = !series;

  if (!series) return;

  LENS_DATA[series].forEach(l=>{
    const o = document.createElement("option");
    o.value = String(l.focal);
    o.textContent = `${l.focal}mm (T${l.t})`;
    o.dataset.t = String(l.t);
    focalSelect.appendChild(o);
  });
}

function onLensFocalChange(side){
  const focalSelect = $(`${side}_lens_focal`);
  const tSelect     = $(`${side}_t`);

  const opt = focalSelect.selectedOptions[0];
  if (!opt || !opt.dataset.t) return;

  // Force T-stop to CUSTOM
  tSelect.value = "custom";
  toggleCustomT(side);

  const customInput = $(`${side}_t_custom`);
  customInput.value = opt.dataset.t;

  calculate();
}
/* =========================
   T-STOP UI
========================= */

function toggleCustomT(side){
  const sel = $( `${side}_t` );
  const inp = $( `${side}_t_custom` );
  if (!sel || !inp) return;
  inp.style.display = sel.value === "custom" ? "block" : "none";
}
function toggleCustomFPS(side){
  const sel = $( `${side}_fps` );
  const inp = $( `${side}_fps_custom` );
  if (!sel || !inp) return;
  inp.style.display = sel.value === "custom" ? "block" : "none";
}

function toggleCustomShutter(side){
  const sel = $( `${side}_shutter` );
  const inp = $( `${side}_shutter_custom` );
  if (!sel || !inp) return;
  inp.style.display = sel.value === "custom" ? "block" : "none";
}
function getT(side){
  const sel = $( `${side}_t` );
  const inp = $( `${side}_t_custom` );
  if (!sel) return NaN;
  return sel.value === "custom"
    ? parseFloat(inp.value)
    : parseFloat(sel.value);
}
function getFPS(side){
  const sel = $(`${side}_fps`);
  const inp = $(`${side}_fps_custom`);
  if (!sel) return NaN;

  if (sel.value === "custom") {
    const v = parseFloat(inp.value);
    return isNaN(v) ? parseFloat(sel.dataset.default || 25) : v;
  }

  return parseFloat(sel.value);
}

function getShutter(side){
  const sel = $(`${side}_shutter`);
  const inp = $(`${side}_shutter_custom`);
  if (!sel) return NaN;

  if (sel.value === "custom") {
    const v = parseFloat(inp.value);
    return isNaN(v) ? parseFloat(sel.dataset.default || 180) : v;
  }

  return parseFloat(sel.value);
}

/* =========================
   MODE UI
========================= */

function updateModeUI(){
  const mode = document.querySelector("input[name='calc']:checked").value;

  [b_iso, b_nd, b_shutter, b_fps, b_t].forEach(el => {
    if (!el) return;
    el.disabled = false;
    el.classList.remove("calculated");
  });

  if (mode === "iso")    { b_iso.disabled = true; b_iso.classList.add("calculated"); }
  if (mode === "nd")     { b_nd.disabled  = true; b_nd.classList.add("calculated"); }
  if (mode === "fps")    { b_fps.disabled = true; b_fps.classList.add("calculated"); }
  if (mode === "shutter"){ b_shutter.disabled = true; b_shutter.classList.add("calculated"); }
  if (mode === "t") {
    b_t.disabled = true;
    b_t.classList.add("calculated");
    if (b_t_custom) b_t_custom.style.display = "none";
  }

  calculate();
}

/* =========================
   CALCULATION
========================= */

function calculate(){
  const mode = document.querySelector("input[name='calc']:checked").value;
  const camB = camera_b.value;

  const EA = exposure(
  getFPS("a"),
  getShutter("a"),
  +a_iso.value,
  getT("a"),
  +a_nd.value
);

  const fpsB = getFPS("b");
const angB = getShutter("b");
  const isoB = +b_iso.value;
  const tB   = getT("b");
  const ndB  = +b_nd.value;

  const showSecondaryIfNeeded = (errorStops, currentIso) => {
    if (Math.abs(errorStops) <= (1/3 + 1e-9)) return "";
    const sug = isoCompSuggestion(currentIso, camB, errorStops);
    return `<div style="margin-top:6px;"><small>${sug.text}</small></div>`;
  };

  /* ---- T-STOP ---- */
  if (mode === "t") {
    const s =
      EA -
      isoStops(isoB) -
      shutterStops(fpsB, angB) +
      ndStops(ndB);

    const tExact = REF_T * Math.pow(2, -s / 2);
    const t = formatTThirds(tExact);

    const apErrStops = (t.apSnapped - t.apExact);
    const secondary = showSecondaryIfNeeded(apErrStops, isoB);

    result.innerHTML =
      `Set B T-Stop to <strong>${t.label}</strong>` +
      `<br><small>(snapped: T${t.snapped.toFixed(2)} · exact: T${t.exact.toFixed(2)})</small>` +
      secondary;
    return;
  }

  /* ---- ISO ---- */
  if (mode === "iso") {
    const isoExact =
      800 * Math.pow(
        2,
        EA -
        shutterStops(fpsB, angB) -
        tStops(tB) +
        ndStops(ndB)
      );

    const iso = snapISO(isoExact, camB);
    const isoErrStops = Math.log2(iso.snapped / isoExact);

    let secondary = "";
    if (Math.abs(isoErrStops) > (1/3 + 1e-9)) {
      const ndExact2 = Math.max(0, ndB + (isoErrStops * 0.3));
      const nd2 = snapNDClosest(ndExact2, camB, 0);
      secondary =
        `<div style="margin-top:6px;"><small>` +
        `Secondary suggestion: set B ND to <strong>${nd2.snapped === 0 ? "Clear" : nd2.snapped.toFixed(2)}</strong>` +
        ` <small>(exact: ${nd2.exact.toFixed(2)})</small>` +
        ` <small>— to compensate ${Math.abs(isoErrStops).toFixed(2)} stop error</small>` +
        `</small></div>`;
    }

    const isNative = (CAMERA_DATA[camB].nativeISO || []).includes(iso.snapped);

    result.innerHTML =
      `Set B ISO to <strong>${iso.snapped}${isNative ? " *" : ""}</strong>` +
      `<br><small>(exact: ${iso.exact.toFixed(0)})</small>` +
      secondary;
    return;
  }

  /* ---- ND ---- */
  if (mode === "nd") {
    const neededStopsExact =
      isoStops(isoB) +
      shutterStops(fpsB, angB) +
      tStops(tB) -
      EA;

    // ✅ FIX: snap FIRST, then enforce minimum
    const neededStopsSnapped = snapStopsThirds(neededStopsExact);

    if (neededStopsSnapped < 1) {
      result.innerHTML = "⚠️ ND must be ≥ 1 stop (0.30 ND)";
      return;
    }

    const ndExact = neededStopsSnapped * 0.3;

    // choose closest ND (most accurate), but never below 0.30
    const nd = snapNDClosest(ndExact, camB, 0.3);

    // residual error after picking an actual ND option
    const errStops = ndStops(nd.snapped) - neededStopsSnapped;

    const secondary = showSecondaryIfNeeded(errStops, isoB);

    result.innerHTML =
      `Set B ND to <strong>${nd.snapped.toFixed(2)}</strong>` +
      `<br><small>(snapped target: ${neededStopsSnapped.toFixed(2)} stops · exact target: ${(neededStopsExact * 0.3).toFixed(2)} ND)</small>` +
      secondary;
    return;
  }

  result.innerHTML = "";
}

/* =========================
   AUTO RECALC
========================= */

document.querySelectorAll("select, input[type='number']").forEach(el=>{
  el.addEventListener("change", calculate);
  el.addEventListener("input", calculate);
});

/* =========================
   INIT
========================= */

camera_a.onchange = ()=>{
  populateISO(a_iso, camera_a.value);
  populateND(a_nd, camera_a.value);
  calculate();
};

camera_b.onchange = ()=>{
  populateISO(b_iso, camera_b.value);
  populateND(b_nd, camera_b.value);
  calculate();
};

a_lens_series.onchange = () => onLensSeriesChange("a");
b_lens_series.onchange = () => onLensSeriesChange("b");

a_lens_focal.onchange  = () => onLensFocalChange("a");
b_lens_focal.onchange  = () => onLensFocalChange("b");
a_fps.onchange = () => { toggleCustomFPS("a"); calculate(); };
b_fps.onchange = () => { toggleCustomFPS("b"); calculate(); };

a_shutter.onchange = () => { toggleCustomShutter("a"); calculate(); };
b_shutter.onchange = () => { toggleCustomShutter("b"); calculate(); };

document.querySelectorAll("input[name='calc']")
  .forEach(r => r.onchange = updateModeUI);

populateISO(a_iso, camera_a.value);
populateISO(b_iso, camera_b.value);
populateND(a_nd, camera_a.value);
populateND(b_nd, camera_b.value);

populateFPS(a_fps);
populateFPS(b_fps);
populateShutter(a_shutter);
populateShutter(b_shutter);
populateLensSeries(a_lens_series);
populateLensSeries(b_lens_series);

toggleCustomFPS("a");
toggleCustomFPS("b");
toggleCustomShutter("a");
toggleCustomShutter("b");

updateModeUI();
