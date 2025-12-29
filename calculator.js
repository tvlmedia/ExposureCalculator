"use strict";

/* =========================
   CAMERA DATA
========================= */

const CAMERA_DATA = {
  arri: {
    iso: [160,200,250,320,400,500,640,800,1000,1280,1600,2000,2560,3200],
    native: [800],
    nd: {
      internal: null,
      externalStep: 0.3
    }
  },

  venice: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    native: [500, 2500],
    nd: {
      internal: null,
      externalStep: 0.3
    }
  },

  eterna: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    native: [800, 3200],
    nd: {
      internal: {
        start: 0.6,
        end: 2.1,
        step: 0.05
      },
      externalStep: 0.3
    }
  }
};

/* =========================
   CONSTANTS
========================= */

const REF_T = 2.8;          // T2.8 = 0.00 stop
const REF_SHUTTER = 1 / 50; // 25fps @ 180°

/* =========================
   PHYSICS (CORRECT)
========================= */

function isoStops(iso){
  return Math.log2(iso / 800);
}

function shutterSpeed(fps, angle){
  return (angle / 360) * (1 / fps);
}

function shutterStops(fps, angle){
  return Math.log2(shutterSpeed(fps, angle) / REF_SHUTTER);
}

function tStops(t){
  return -2 * Math.log2(t / REF_T);
}

function exposure(fps, angle, iso, t, ndStops){
  return (
    isoStops(iso) +
    shutterStops(fps, angle) +
    tStops(t) -
    ndStops
  );
}

/* =========================
   ISO POPULATION
========================= */

function populateISO(selectEl, cameraKey){
  const values = CAMERA_DATA[cameraKey].iso;
  const prev = +selectEl.value;

  selectEl.innerHTML = "";

  values.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });

  selectEl.value = values.includes(prev) ? prev : values[0];
}

/* =========================
   T-STOP UI
========================= */

function getTValue(selectEl, inputEl){
  if (selectEl.value === "custom"){
    return parseFloat(inputEl.value);
  }
  return parseFloat(selectEl.value);
}

function toggleCustomT(side){
  const select = document.getElementById(`${side}_t`);
  const input  = document.getElementById(`${side}_t_custom`);

  if (select.value === "custom"){
    input.style.display = "block";
    input.focus();
  } else {
    input.style.display = "none";
  }
}

/* =========================
   ND SOLVER (CAMERA AWARE)
========================= */

function solveND(cameraKey, ndStops){
  const nd = CAMERA_DATA[cameraKey].nd;

  // Geen interne ND (ARRI / VENICE)
  if (!nd.internal){
    const value =
      Math.round(ndStops / nd.externalStep) * nd.externalStep;
    return value;
  }

  // EERST: interne ND proberen
  const internal = nd.internal;
  const internalValue = internal.start + ndStops;

  if (internalValue <= internal.end){
    return (
      Math.round(internalValue / internal.step) * internal.step
    );
  }

  // DAARNA: fysieke ND’s
  const remaining =
    internalValue - internal.end;

  return (
    internal.end +
    Math.round(remaining / nd.externalStep) * nd.externalStep
  );
}

/* =========================
   CALCULATION
========================= */

function calculate(){

  const mode = document.querySelector("input[name='calc']:checked").value;
  const camB = camera_b.value;

  // ---- A ----
  const tA = getTValue(a_t, a_t_custom);

  const EA = exposure(
    +a_fps.value,
    +a_shutter.value,
    +a_iso.value,
    tA,
    +a_nd.value
  );

  // ---- B ----
  const tB   = getTValue(b_t, b_t_custom);
  const fpsB = +b_fps.value;
  const angB = +b_shutter.value;
  const isoB = +b_iso.value;
  const ndB  = +b_nd.value;

  /* =====================
     MODES
  ===================== */

  // ---- T-STOP ----
  if (mode === "t"){
    const targetStops =
      EA -
      isoStops(isoB) -
      shutterStops(fpsB, angB) +
      ndB;

    const tSolved =
      REF_T * Math.pow(2, -targetStops / 2);

    result.innerHTML =
      `Set B T-Stop to <strong>T${tSolved.toFixed(2)}</strong>
       <br><small>(offset: ${targetStops.toFixed(2)} stops)</small>`;
    return;
  }

  // ---- ISO ----
  if (mode === "iso"){
    const iso =
      800 * Math.pow(
        2,
        EA -
        shutterStops(fpsB, angB) -
        tStops(tB) +
        ndB
      );

    result.innerHTML =
      `Set B ISO to <strong>${Math.round(iso)}</strong>`;
    return;
  }

  // ---- ND ----
  if (mode === "nd"){
    const ndStops =
      isoStops(isoB) +
      shutterStops(fpsB, angB) +
      tStops(tB) -
      EA;

    if (ndStops < 0){
      result.innerHTML = "⚠️ Cannot solve with ND only";
      return;
    }

    const ndValue = solveND(camB, ndStops);

    result.innerHTML =
      `Set B ND to <strong>${ndValue.toFixed(2)}</strong>
       <br><small>(${ndStops.toFixed(2)} stops)</small>`;
    return;
  }

  // ---- SHUTTER ----
  if (mode === "shutter"){
    const target =
      EA -
      isoStops(isoB) -
      tStops(tB) +
      ndB;

    for (let a of [360,180,90,45]){
      if (Math.abs(shutterStops(fpsB, a) - target) < 0.01){
        result.innerHTML =
          `Set B Shutter Angle to <strong>${a}°</strong>`;
        return;
      }
    }

    result.innerHTML = "⚠️ No valid shutter angle";
    return;
  }

  // ---- FPS ----
  if (mode === "fps"){
    for (let f of [25,50]){
      const e =
        isoStops(isoB) +
        shutterStops(f, angB) +
        tStops(tB) -
        ndB;

      if (Math.abs(e - EA) < 0.01){
        result.innerHTML =
          `Set B Frame Rate to <strong>${f} fps</strong>`;
        return;
      }
    }

    result.innerHTML = "⚠️ No valid FPS solution";
  }
}

/* =========================
   INIT
========================= */

populateISO(a_iso, camera_a.value);
populateISO(b_iso, camera_b.value);
