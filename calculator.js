"use strict";

/* =========================
   DISCRETE SCALES
========================= */

const T_SCALE = ["T1.0","T1.4","T2.0","T2.8","T4.0","T5.6","T8.0","T11","T16","T22"];
const SHUTTER_ANGLES = [360,180,90,45];
const FPS_VALUES = [25,50];

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
   UI STATE HANDLING
========================= */

const calcRadios = document.querySelectorAll("input[name='calc']");

calcRadios.forEach(radio => {
  radio.addEventListener("change", updateUI);
});

function updateUI(){
  const mode = document.querySelector("input[name='calc']:checked").value;

  // enable all first
  [b_t, b_iso, b_nd, b_shutter, b_fps].forEach(el=>{
    el.disabled = false;
    el.classList.remove("calculated");
  });

  // disable selected target
  if (mode === "t")      b_t.disabled = true;
  if (mode === "iso")    b_iso.disabled = true;
  if (mode === "nd")     b_nd.disabled = true;
  if (mode === "shutter")b_shutter.disabled = true;
  if (mode === "fps")    b_fps.disabled = true;
}

/* =========================
   CORE CALCULATION
========================= */

function calculate(){

  const mode = document.querySelector("input[name='calc']:checked").value;

  // ---- A ----
  const TA   = parseInt(a_t.value);
  const ISOA = isoStops(+a_iso.value);
  const NDA  = parseInt(a_nd.value);
  const SHA  = shutterStops(+a_fps.value, +a_shutter.value);

  const EXP_A = ISOA + SHA - TA - NDA;

  // ---- B known values ----
  const ISOB = isoStops(+b_iso.value);
  const NDB  = parseInt(b_nd.value);
  const SHB  = shutterStops(+b_fps.value, +b_shutter.value);
  const TB   = parseInt(b_t.value);

  /* =====================
     SOLVE MODES
  ===================== */

  // ---- T-STOP ----
  if (mode === "t"){
    const t = ISOB + SHB - NDB - EXP_A;
    if (!Number.isInteger(t) || t < 0 || t >= T_SCALE.length){
      result.innerHTML = "⚠️ T-stop out of range";
      return;
    }
    result.innerHTML = `Set B T-Stop to <strong>${T_SCALE[t]}</strong>`;
    return;
  }

  // ---- ISO ----
  if (mode === "iso"){
    const isoStopsB = EXP_A - SHB + TB + NDB;
    const iso = 800 * Math.pow(2, isoStopsB);
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
    result.innerHTML =
      `Set B ND to <strong>${(ndStops*0.3).toFixed(1)}</strong>`;
    return;
  }

  // ---- SHUTTER ----
  if (mode === "shutter"){
    const neededStops = EXP_A - ISOB + TB + NDB;
    const options = [
      {angle:360, stops: +1},
      {angle:180, stops: 0},
      {angle:90,  stops:-1},
      {angle:45,  stops:-2},
    ];
    const match = options.find(o => o.stops === neededStops);
    if (!match){
      result.innerHTML = "⚠️ No valid shutter angle";
      return;
    }
    result.innerHTML =
      `Set B Shutter Angle to <strong>${match.angle}°</strong>`;
    return;
  }

  // ---- FPS ----
  if (mode === "fps"){
    if (EXP_A === ISOB + SHB - TB - NDB){
      result.innerHTML = "Frame rate unchanged";
      return;
    }
    result.innerHTML =
      "⚠️ FPS compensation ambiguous<br>Use shutter or ISO instead";
  }
}

// init
updateUI();
