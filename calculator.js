"use strict";

/* =========================
   CAMERA DATA
========================= */

const CAMERA_ISO = {
  arri: {
    iso: [160,200,250,320,400,500,640,800,1000,1280,1600,2000,2560,3200]
  },
  venice: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    native: [500, 2500]
  }
};

/* =========================
   CONSTANTS
========================= */

const T_SCALE = ["T1.0","T1.4","T2.0","T2.8","T4.0","T5.6","T8.0","T11","T16","T22"];
const ND_STEP = 0.3;
const REF_SHUTTER = 1 / 50; // 25fps @ 180°

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
  return Math.log2(shutterSpeed(fps, angle) / REF_SHUTTER);
}

function exposure(fps, angle, iso, tIndex, ndStops){
  return isoStops(iso) + shutterStops(fps, angle) - tIndex - ndStops;
}

function nearestISO(value, list){
  return list.reduce((a,b) =>
    Math.abs(b - value) < Math.abs(a - value) ? b : a
  );
}

/* =========================
   ISO POPULATION
========================= */

function populateISO(selectEl, cameraKey){
  const values = CAMERA_ISO[cameraKey].iso;
  const prev = +selectEl.value;

  selectEl.innerHTML = "";

  values.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });

  selectEl.value = values.includes(prev) ? prev : 800;
}

/* =========================
   UI HANDLING
========================= */

camera_a.addEventListener("change", () => {
  populateISO(a_iso, camera_a.value);
});

camera_b.addEventListener("change", () => {
  populateISO(b_iso, camera_b.value);
});

document.querySelectorAll("input[name='calc']")
  .forEach(r => r.addEventListener("change", updateUI));

function updateUI(){
  const mode = document.querySelector("input[name='calc']:checked").value;

  [b_t, b_iso, b_nd, b_shutter, b_fps].forEach(el => {
    el.classList.remove("calculated");
  });

  if (mode === "t")       b_t.classList.add("calculated");
  if (mode === "iso")     b_iso.classList.add("calculated");
  if (mode === "nd")      b_nd.classList.add("calculated");
  if (mode === "shutter") b_shutter.classList.add("calculated");
  if (mode === "fps")     b_fps.classList.add("calculated");

  result.innerHTML = "Result will appear here…";
}

/* =========================
   CORE CALCULATION
========================= */

function calculate(){

  const mode = document.querySelector("input[name='calc']:checked").value;

  // ---------- A ----------
  const EA = exposure(
    +a_fps.value,
    +a_shutter.value,
    +a_iso.value,
    +a_t.value,
    +a_nd.value
  );

  // ---------- B ----------
  const fpsB = +b_fps.value;
  const angB = +b_shutter.value;
  const isoB = +b_iso.value;
  const tB   = +b_t.value;
  const ndB  = +b_nd.value;

  // ---- T-STOP ----
  if (mode === "t"){
    const t = isoStops(isoB) + shutterStops(fpsB, angB) - ndB - EA;
    const tRounded = Math.round(t);

    if (tRounded < 0 || tRounded >= T_SCALE.length){
      result.innerHTML = "⚠️ T-stop out of range";
      return;
    }

    result.innerHTML =
      `Set B T-Stop to <strong>${T_SCALE[tRounded]}</strong>
       <br><small>(calculated offset: ${t.toFixed(2)} stops)</small>`;
    return;
  }

  // ---- ISO ----
  if (mode === "iso"){
    const isoRaw =
      800 * Math.pow(2, EA - shutterStops(fpsB, angB) + tB + ndB);

    const isoFinal = nearestISO(
      isoRaw,
      CAMERA_ISO[camera_b.value].iso
    );

    result.innerHTML =
      `Set B ISO to <strong>${isoFinal}</strong>
       <br><small>(raw: ${Math.round(isoRaw)})</small>`;
    return;
  }

  // ---- ND ----
  if (mode === "nd"){
    const ndStops = isoStops(isoB) + shutterStops(fpsB, angB) - tB - EA;

    if (ndStops < 0){
      result.innerHTML =
        "⚠️ Cannot solve with ND only<br>Open T-stop or raise ISO";
      return;
    }

    result.innerHTML =
      `Set B ND to <strong>${(ndStops * ND_STEP).toFixed(1)}</strong>`;
    return;
  }

  // ---- SHUTTER ----
  if (mode === "shutter"){
    const target = EA - isoStops(isoB) + tB + ndB;
    const angles = [360,180,90,45];

    for (let a of angles){
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
        shutterStops(f, angB) -
        tB -
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
updateUI();
