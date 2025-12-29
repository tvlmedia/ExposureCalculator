"use strict";

/* =========================
   DISCRETE SCALES
========================= */

const T_SCALE = ["T1.0","T1.4","T2.0","T2.8","T4.0","T5.6","T8.0","T11","T16","T22"];
const ND_STEP = 0.3;
const REF_SHUTTER = 1 / 50; // reference: 25fps @ 180°

/* =========================
   HELPERS
========================= */

function isoStops(iso){
  return Math.log2(iso / 800);
}

function shutterSpeed(fps, angle){
  return (angle / 360) * (1 / fps);
}

function shutterStops(fps, angle){
  const s = shutterSpeed(fps, angle);
  return Math.log2(s / REF_SHUTTER);
}

/* =========================
   UI MODE HANDLING
========================= */

const targets = {
  t: "b_t",
  iso: "b_iso",
  nd: "b_nd",
  shutter: "b_shutter",
  fps: "b_fps"
};

document.querySelectorAll("input[name='calc']").forEach(r =>
  r.addEventListener("change", updateUI)
);

function updateUI(){
  const mode = document.querySelector("input[name='calc']:checked").value;

  Object.values(targets).forEach(id => {
    const el = document.getElementById(id);
    el.disabled = false;
  });

  document.getElementById(targets[mode]).disabled = true;
}

/* =========================
   CORE CALCULATION
========================= */

function exposure(fps, angle, iso, tIndex, ndStops){
  return (
    isoStops(iso) +
    shutterStops(fps, angle) -
    tIndex -
    ndStops
  );
}

function calculate(){

  const mode = document.querySelector("input[name='calc']:checked").value;

  // ---- A ----
  const EA = exposure(
    +a_fps.value,
    +a_shutter.value,
    +a_iso.value,
    +a_t.value,
    +a_nd.value
  );

  // ---- B known ----
  const fpsB = +b_fps.value;
  const angB = +b_shutter.value;
  const isoB = +b_iso.value;
  const tB   = +b_t.value;
  const ndB  = +b_nd.value;

  // ---------------- T-STOP ----------------
  if (mode === "t"){
    const t = isoStops(isoB)
            + shutterStops(fpsB, angB)
            - ndB
            - EA;

    if (!Number.isInteger(t) || t < 0 || t >= T_SCALE.length){
      result.innerHTML = "⚠️ T-stop out of range";
      return;
    }

    result.innerHTML = `Set B T-Stop to <strong>${T_SCALE[t]}</strong>`;
    return;
  }

  // ---------------- ISO ----------------
  if (mode === "iso"){
    const isoStopsB =
      EA -
      shutterStops(fpsB, angB) +
      tB +
      ndB;

    const iso = 800 * Math.pow(2, isoStopsB);
    result.innerHTML = `Set B ISO to <strong>${Math.round(iso)}</strong>`;
    return;
  }

  // ---------------- ND ----------------
  if (mode === "nd"){
    const ndStops =
      isoStops(isoB) +
      shutterStops(fpsB, angB) -
      tB -
      EA;

    if (ndStops < 0){
      result.innerHTML = "⚠️ Cannot solve with ND only";
      return;
    }

    result.innerHTML =
      `Set B ND to <strong>${(ndStops * ND_STEP).toFixed(1)}</strong>`;
    return;
  }

  // ---------------- SHUTTER ----------------
  if (mode === "shutter"){
    const targetStops =
      EA -
      isoStops(isoB) +
      tB +
      ndB;

    const options = [
      {angle:360, stops: Math.log2(shutterSpeed(fpsB,360)/REF_SHUTTER)},
      {angle:180, stops: Math.log2(shutterSpeed(fpsB,180)/REF_SHUTTER)},
      {angle:90,  stops: Math.log2(shutterSpeed(fpsB,90 )/REF_SHUTTER)},
      {angle:45,  stops: Math.log2(shutterSpeed(fpsB,45 )/REF_SHUTTER)}
    ];

    const match = options.find(o => Math.abs(o.stops - targetStops) < 0.01);

    if (!match){
      result.innerHTML = "⚠️ No valid shutter angle";
      return;
    }

    result.innerHTML =
      `Set B Shutter Angle to <strong>${match.angle}°</strong>`;
    return;
  }

  // ---------------- FPS ----------------
  if (mode === "fps"){
    const fpsOptions = [25, 50];

    for (let f of fpsOptions){
      const s = shutterStops(f, angB);
      const e =
        isoStops(isoB) +
        s -
        tB -
        ndB;

      if (Math.abs(e - EA) < 0.01){
        result.innerHTML = `Set B Frame Rate to <strong>${f} fps</strong>`;
        return;
      }
    }

    result.innerHTML = "⚠️ No valid FPS solution";
  }
}

// init
updateUI();
