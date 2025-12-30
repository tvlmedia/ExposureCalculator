"use strict";

/* =========================================================
   EXPOSURE TOOL – FIXED + 1/3 STOPS + SECONDARY SUGGESTION
   - No more "— calculated —" options (caused weird greyed UI)
   - Correct 1/3-stop snapping direction for T-stops
   - ND uses 0.30 = 1 stop (optical density)
   - If snap error > 1/3 stop → suggest ISO compensation
   - Native ISO’s marked with *
========================================================= */

/* =========================
   CAMERA DATA
========================= */

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
    nd: [0,0.3,0.6,0.9,1.2,1.5,1.8,2.1,2.4] // Venice internal ND
  },

  eterna: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    defaultISO: 800,
    nativeISO: [800],
    // ETERNA: 0.60..2.10 in 0.05 steps + 0.30 and 2.40
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

// your reference point in the math (doesn't need to be "real", just consistent)
const REF_T = 2.8;
const REF_SHUTTER = 1 / 50;

/* =========================
   PHYSICS (EXACT)
========================= */

const isoStops = iso => Math.log2(iso / 800);

const shutterSpeed = (fps, angle) => (angle / 360) * (1 / fps);

const shutterStops = (fps, angle) =>
  Math.log2(shutterSpeed(fps, angle) / REF_SHUTTER);

// Exposure contribution of aperture relative to REF_T.
// Bigger T => darker => negative contribution.
const tStops = t => -2 * Math.log2(t / REF_T);

// 0.3 ND = 1 stop
const ndStops = nd => nd / 0.3;

const exposure = (fps, angle, iso, t, nd) =>
  isoStops(iso) +
  shutterStops(fps, angle) +
  tStops(t) -
  ndStops(nd);

/* =========================
   HELPERS – 1/3 STOP SYSTEM
========================= */

// Aperture "darkness stops" relative to REF_T (positive when T is bigger/darker)
const apertureStops = t => 2 * Math.log2(t / REF_T);

const snapStopsThirds = stops => Math.round(stops * 3) / 3;

const stopsToT = apStops => REF_T * Math.pow(2, apStops / 2);

function toThirdLabel(apStopsSnapped) {
  // decompose into full stops + thirds
  const full = Math.floor(apStopsSnapped + 1e-9);
  let frac = apStopsSnapped - full;

  // normalize -0 to 0
  if (Math.abs(frac) < 1e-9) frac = 0;

  // base full-stop T
  const baseT = stopsToT(full);

  // label for thirds
  let fracLabel = "";
  if (Math.abs(frac - 1/3) < 1e-6) fracLabel = "+1/3";
  else if (Math.abs(frac - 2/3) < 1e-6) fracLabel = "+2/3";
  else if (Math.abs(frac + 1/3) < 1e-6) fracLabel = "-1/3";
  else if (Math.abs(frac + 2/3) < 1e-6) fracLabel = "-2/3";
  else fracLabel = ""; // should not happen

  return {
    baseT,
    fracLabel,
    apStopsFull: full,
    apStopsFrac: frac
  };
}

function formatTThirds(tExact) {
  const ap = apertureStops(tExact);          // + = darker
  const apSnapped = snapStopsThirds(ap);     // snapped to thirds
  const tSnapped = stopsToT(apSnapped);

  const lbl = toThirdLabel(apSnapped);

  return {
    exact: tExact,
    snapped: tSnapped,
    apExact: ap,
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
  // errorStops: + means "too dark" relative to exact target → increase ISO
  //            - means "too bright" → decrease ISO
  const isoExact = currentIso * Math.pow(2, errorStops);
  const iso = snapISO(isoExact, cam);

  const dir = errorStops > 0 ? "increase" : "decrease";
  const abs = Math.abs(errorStops);

  return {
    text:
      `Secondary suggestion: ${dir} B ISO to <strong>${iso.snapped}</strong>` +
      ` <small>(exact: ${iso.exact.toFixed(0)})</small>` +
      ` <small>— to compensate ${abs.toFixed(2)} stop error</small>`,
    isoExact,
    isoSnapped: iso.snapped
  };
}

/* =========================
   DOM (safe getters)
========================= */

const $ = (id) => document.getElementById(id);

// If your HTML already exposes globals like camera_a, a_iso etc.,
// this still works because we’ll prefer existing globals.
const camera_a = window.camera_a || $("camera_a");
const camera_b = window.camera_b || $("camera_b");

const a_fps     = window.a_fps     || $("a_fps");
const a_shutter = window.a_shutter || $("a_shutter");
const a_iso     = window.a_iso     || $("a_iso");
const a_t       = window.a_t       || $("a_t");
const a_t_custom= window.a_t_custom|| $("a_t_custom");
const a_nd      = window.a_nd      || $("a_nd");

const b_fps     = window.b_fps     || $("b_fps");
const b_shutter = window.b_shutter || $("b_shutter");
const b_iso     = window.b_iso     || $("b_iso");
const b_t       = window.b_t       || $("b_t");
const b_t_custom= window.b_t_custom|| $("b_t_custom");
const b_nd      = window.b_nd      || $("b_nd");

const result    = window.result    || $("result");

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

/* =========================
   T-STOP UI
========================= */

function toggleCustomT(side){
  const sel = $( `${side}_t` );
  const inp = $( `${side}_t_custom` );
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

/* =========================
   MODE UI  (disable ONLY, don’t nuke options)
========================= */

function updateModeUI(){
  const mode = document.querySelector("input[name='calc']:checked").value;

  // enable all B fields first
  [b_iso, b_nd, b_shutter, b_fps, b_t].forEach(el => {
    if (!el) return;
    el.disabled = false;
    el.classList.remove("calculated");
  });

  // disable ONLY the field being solved for (B side)
  if (mode === "iso")   { b_iso.disabled = true;   b_iso.classList.add("calculated"); }
  if (mode === "nd")    { b_nd.disabled  = true;   b_nd.classList.add("calculated"); }
  if (mode === "fps")   { b_fps.disabled = true;   b_fps.classList.add("calculated"); }
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

  // Exposure A (reference)
  const EA = exposure(
    +a_fps.value,
    +a_shutter.value,
    +a_iso.value,
    getT("a"),
    +a_nd.value
  );

  const fpsB = +b_fps.value;
  const angB = +b_shutter.value;
  const isoB = +b_iso.value;
  const tB   = getT("b");
  const ndB  = +b_nd.value;

  // Helper: show secondary suggestion only if error > 1/3
  const showSecondaryIfNeeded = (errorStops, currentIso) => {
    if (Math.abs(errorStops) <= (1/3 + 1e-9)) return "";
    const sug = isoCompSuggestion(currentIso, camB, errorStops);
    return `<div style="margin-top:6px;"><small>${sug.text}</small></div>`;
  };

  /* ---- T-STOP (solve T for B) ---- */
  if (mode === "t") {
    // Solve for aperture contribution s (as exposure contribution)
    const s =
      EA -
      isoStops(isoB) -
      shutterStops(fpsB, angB) +
      ndStops(ndB);

    // Convert exposure-contribution s -> T
    // Since tStops(t) = -2 log2(t/REF_T), we invert:
    const tExact = REF_T * Math.pow(2, -s / 2);

    const t = formatTThirds(tExact);

    // Error in aperture "darkness stops" between snapped and exact
    const apErrStops = (t.apSnapped - t.apExact); // + means snapped darker than exact

    const secondary = showSecondaryIfNeeded(apErrStops, isoB);

    result.innerHTML =
      `Set B T-Stop to <strong>${t.label}</strong>` +
      `<br><small>(snapped: T${t.snapped.toFixed(2)} · exact: T${t.exact.toFixed(2)})</small>` +
      secondary;
    return;
  }

  /* ---- ISO (solve ISO for B) ---- */
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

    // error in stops between snapped ISO and exact ISO
    const isoErrStops = Math.log2(iso.snapped / isoExact);

    // Secondary suggestion: ND compensation (if error > 1/3)
    // (ISO already snapped; suggest ND tweak to compensate)
    let secondary = "";
    if (Math.abs(isoErrStops) > (1/3 + 1e-9)) {
      // if snapped ISO is higher than exact -> too bright, add ND
      // if snapped ISO is lower -> too dark, reduce ND (but never below 0)
      const ndExact2 = Math.max(0, ndB + (isoErrStops * 0.3)); // +stops => add ND
      const nd2 = snapNDClosest(ndExact2, camB, 0);
      secondary =
        `<div style="margin-top:6px;"><small>` +
        `Secondary suggestion: set B ND to <strong>${nd2.snapped === 0 ? "Clear" : nd2.snapped.toFixed(2)}</strong>` +
        ` <small>(exact: ${nd2.exact.toFixed(2)})</small>` +
        ` <small>— to compensate ${Math.abs(isoErrStops).toFixed(2)} stop error</small>` +
        `</small></div>`;
    }

    result.innerHTML =
      `Set B ISO to <strong>${iso.snapped}${(CAMERA_DATA[camB].nativeISO || []).includes(iso.snapped) ? " *" : ""}</strong>` +
      `<br><small>(exact: ${iso.exact.toFixed(0)})</small>` +
      secondary;
    return;
  }

  /* ---- ND (solve ND for B) ---- */
  if (mode === "nd") {
    // How many ND stops B needs to match A given B iso/shutter/T
    const neededStops =
      isoStops(isoB) +
      shutterStops(fpsB, angB) +
      tStops(tB) -
      EA;

    // enforce minimum 1 stop (0.30 ND)
    if (neededStops < 1) {
      result.innerHTML = "⚠️ ND must be ≥ 1 stop (0.30 ND)";
      return;
    }

    // We snap neededStops to 1/3 stop FIRST (cine logic),
    // then convert to ND optical density.
    const neededStopsSnapped = snapStopsThirds(neededStops);
    const ndExact = neededStopsSnapped * 0.3;

    // Choose ND that is CLOSEST (most accurate) but never below 0.30
    const nd = snapNDClosest(ndExact, camB, 0.3);

    // Residual error in stops after choosing actual ND option:
    // + means chosen ND is stronger than needed => darker
    const errStops = ndStops(nd.snapped) - neededStopsSnapped;

    const secondary = showSecondaryIfNeeded(errStops, isoB);

    result.innerHTML =
      `Set B ND to <strong>${nd.snapped.toFixed(2)}</strong>` +
      `<br><small>(exact: ${nd.exact.toFixed(2)} ND · ${neededStopsSnapped.toFixed(2)} stops)</small>` +
      secondary;
    return;
  }

  // fps / shutter modes not implemented here (yet). Keep quiet.
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

document.querySelectorAll("input[name='calc']")
  .forEach(r => r.onchange = updateModeUI);

populateISO(a_iso, camera_a.value);
populateISO(b_iso, camera_b.value);
populateND(a_nd, camera_a.value);
populateND(b_nd, camera_b.value);
updateModeUI();
