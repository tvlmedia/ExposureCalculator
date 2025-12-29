"use strict";

/* =========================
   DISCRETE SCALES
========================= */

const T_SCALE = ["T1.0","T1.4","T2.0","T2.8","T4.0","T5.6","T8.0","T11","T16","T22"];
const SHUTTER_OPTIONS = [
  { angle: 360, stops: +1 },
  { angle: 180, stops:  0 },
  { angle: 90,  stops: -1 },
  { angle: 45,  stops: -2 }
];

/* =========================
   STOP HELPERS
========================= */

function isoStops(iso){
  return Math.log2(iso / 800);
}

function shutterStops(fps, angle){
  let s = 0;
  if (fps === 50) s -= 1;
  if (angle === 360) s += 1;
  if (angle === 90)  s -= 1;
  if (angle === 45)  s -= 2;
  return s;
}

/* =========================
   UI STATE
========================= */

document.querySelectorAll("input[name='calc']")
  .forEach(r => r.addEventListener("change", updateUI));

function updateUI(){
  const mode = document.querySelector("input[name='calc']:checked").value;

  // reset all to calculated placeholder
  [b_t, b_iso, b_nd, b_shutter, b_fps].forEach(el => {
    el.value = "";
  });

  result.innerHTML = "Result will appear here…";
}

/* =========================
   CORE CALC
========================= */

function calculate(){

  const mode = document.querySelector("input[name='calc']:checked").value;

  // ---------- A ----------
  const TA   = parseInt(a_t.value);
  const ISOA = isoStops(+a_iso.value);
  const NDA  = parseInt(a_nd.value);
  const SHA  = shutterStops(+a_fps.value, +a_shutter.value);

  const EXP_A = ISOA + SHA - TA - NDA;

  // ---------- B common ----------
  const ISOB = b_iso.value ? isoStops(+b_iso.value) : null;
  const NDB  = b_nd.value  ? parseInt(b_nd.value) : null;
  const SHB  = (b_fps.value && b_shutter.value)
    ? shutterStops(+b_fps.value, +b_shutter.value)
    : null;
  const TB   = b_t.value ? parseInt(b_t.value) : null;

  /* =====================
     MODES
  ===================== */

  // ---- T-STOP ----
  if (mode === "t"){
    const t = ISOB + SHB - NDB - EXP_A;

    if (!Number.isInteger(t) || t < 0 || t >= T_SCALE.length){
      result.innerHTML = "⚠️ T-stop out of range";
      return;
    }

    b_t.value = t;
    result.innerHTML = `Set B T-Stop to <strong>${T_SCALE[t]}</strong>`;
    return;
  }

  // ---- ISO ----
  if (mode === "iso"){
    const isoStopsB = EXP_A - SHB + TB + NDB;
    const iso = 800 * Math.pow(2, isoStopsB);

    b_iso.value = Math.round(iso);
    result.innerHTML = `Set B ISO to <strong>${Math.round(iso)}</strong>`;
    return;
  }

  // ---- ND ----
  if (mode === "nd"){
    const ndStops = ISOB + SHB - TB - EXP_A;

    if (ndStops < 0){
      result.innerHTML =
        "⚠️ Cannot solve with ND only<br>Open T-stop or raise ISO";
      return;
    }

    const ndValue = Math.round(ndStops * 10) / 10;
    b_nd.value = Math.round(ndStops);
    result.innerHTML = `Set B ND to <strong>${(ndValue*0.3).toFixed(1)}</strong>`;
    return;
  }

  // ---- SHUTTER ----
  if (mode === "shutter"){
    const needed = EXP_A - ISOB + TB + NDB;

    const match = SHUTTER_OPTIONS.find(o => o.stops === needed);

    if (!match){
      result.innerHTML = "⚠️ No valid shutter angle";
      return;
    }

    b_shutter.value = match.angle;
    result.innerHTML = `Set B Shutter Angle to <strong>${match.angle}°</strong>`;
    return;
  }

  // ---- FPS ----
  if (mode === "fps"){
    result.innerHTML =
      "⚠️ FPS compensation ambiguous<br>Use shutter or ISO instead";
  }
}

// init
updateUI();
