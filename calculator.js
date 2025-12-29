"use strict";

/* =========================
   CAMERA DATA
========================= */

const CAMERA_DATA = {
  arri: {
    iso: [160,200,250,320,400,500,640,800,1000,1280,1600,2000,2560,3200],
    nd: { type: "fixed", values: [0,0.3,0.6,0.9,1.2,1.5] }
  },

  venice: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    nd: { type: "fixed", values: [0,0.3,0.6,0.9,1.2,1.5] }
  },

  eterna: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    nd: { type: "eterna" }
  }
};

/* =========================
   CONSTANTS
========================= */

const REF_T = 2.8;          // reference T-stop
const REF_SHUTTER = 1 / 50; // 25fps @ 180°

/* =========================
   PHYSICS
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

function exposure(fps, angle, iso, t, nd){
  return isoStops(iso) + shutterStops(fps, angle) + tStops(t) - nd;
}

/* =========================
   POPULATORS
========================= */

function populateISO(select, cam){
  select.innerHTML = "";
  CAMERA_DATA[cam].iso.forEach(v=>{
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  });
  select.value = CAMERA_DATA[cam].iso[0];
}

function populateND(select, cam){
  select.innerHTML = "";
  let values = [];

  if (CAMERA_DATA[cam].nd.type === "fixed"){
    values = CAMERA_DATA[cam].nd.values;
  } else {
    // Fuji GFX Eterna
    values.push(0);      // Clear
    values.push(0.3);    // first ND

    for (let v = 0.6; v <= 2.1 + 0.0001; v += 0.05){
      values.push(Number(v.toFixed(2)));
    }

    values.push(2.4); // physical continuation
  }

  values.forEach(v=>{
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v === 0 ? "Clear" : v.toFixed(2);
    select.appendChild(o);
  });

  select.value = 0;
}

/* =========================
   T-STOP (CUSTOM)
========================= */

function toggleCustomT(side){
  const sel = document.getElementById(`${side}_t`);
  const inp = document.getElementById(`${side}_t_custom`);
  inp.style.display = sel.value === "custom" ? "block" : "none";
}

function getT(side){
  const sel = document.getElementById(`${side}_t`);
  const inp = document.getElementById(`${side}_t_custom`);
  return sel.value === "custom"
    ? parseFloat(inp.value)
    : parseFloat(sel.value);
}

/* =========================
   CALCULATED UI HELPERS
========================= */

function setCalculated(field){
  field.innerHTML = `<option>— calculated —</option>`;
  field.disabled = true;
  field.classList.add("calculated");
}

function restoreField(field, html){
  field.innerHTML = html;
  field.disabled = false;
  field.classList.remove("calculated");
}

/* =========================
   MODE UI
========================= */

let bIsoHTML, bTHTML, bNDHTML, bShutterHTML, bFPSHTML;

function cacheOriginalUI(){
  bIsoHTML = b_iso.innerHTML;
  bTHTML = b_t.innerHTML;
  bNDHTML = b_nd.innerHTML;
  bShutterHTML = b_shutter.innerHTML;
  bFPSHTML = b_fps.innerHTML;
}

function updateModeUI(){
  const mode = document.querySelector("input[name='calc']:checked").value;

  restoreField(b_iso, bIsoHTML);
  restoreField(b_t, bTHTML);
  restoreField(b_nd, bNDHTML);
  restoreField(b_shutter, bShutterHTML);
  restoreField(b_fps, bFPSHTML);

  b_t_custom.style.display = "none";

  if (mode === "iso") setCalculated(b_iso);
  if (mode === "t")   setCalculated(b_t);
  if (mode === "nd")  setCalculated(b_nd);
  if (mode === "shutter") setCalculated(b_shutter);
  if (mode === "fps") setCalculated(b_fps);

  result.innerHTML = "Result will appear here…";
}

/* =========================
   CALCULATION
========================= */

function calculate(){

  const mode = document.querySelector("input[name='calc']:checked").value;

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

  // ---- T-STOP ----
  if (mode === "t"){
    const s = EA - isoStops(isoB) - shutterStops(fpsB, angB) + ndB;
    const t = REF_T * Math.pow(2, -s / 2);
    result.innerHTML = `Set B T-Stop to <strong>T${t.toFixed(2)}</strong>`;
    return;
  }

  // ---- ISO ----
  if (mode === "iso"){
    const iso = 800 * Math.pow(
      2,
      EA - shutterStops(fpsB, angB) - tStops(tB) + ndB
    );
    result.innerHTML = `Set B ISO to <strong>${Math.round(iso)}</strong>`;
    return;
  }

  // ---- ND ----
  if (mode === "nd"){
    const ndNeeded =
      isoStops(isoB) +
      shutterStops(fpsB, angB) +
      tStops(tB) -
      EA;

    if (ndNeeded <= 0){
      result.innerHTML =
        "⚠️ ND cannot be negative.<br>" +
        "<small>Camera B is already darker — change ISO, T-Stop or Shutter.</small>";
      return;
    }

    result.innerHTML =
      `Set B ND to <strong>${ndNeeded.toFixed(2)}</strong> stops`;
    return;
  }

  // ---- SHUTTER ----
  if (mode === "shutter"){
    const target = EA - isoStops(isoB) - tStops(tB) + ndB;
    for (let a of [360,180,90,45]){
      if (Math.abs(shutterStops(fpsB,a) - target) < 0.01){
        result.innerHTML = `Set B Shutter Angle to <strong>${a}°</strong>`;
        return;
      }
    }
    result.innerHTML = "⚠️ No valid shutter angle";
    return;
  }

  // ---- FPS ----
  if (mode === "fps"){
    for (let f of [25,50]){
      if (Math.abs(exposure(f,angB,isoB,tB,ndB) - EA) < 0.01){
        result.innerHTML = `Set B Frame Rate to <strong>${f} fps</strong>`;
        return;
      }
    }
    result.innerHTML = "⚠️ No valid FPS";
  }
}

/* =========================
   INIT
========================= */

camera_a.onchange = ()=>{
  populateISO(a_iso, camera_a.value);
  populateND(a_nd, camera_a.value);
};

camera_b.onchange = ()=>{
  populateISO(b_iso, camera_b.value);
  populateND(b_nd, camera_b.value);
  cacheOriginalUI();
  updateModeUI();
};

document
  .querySelectorAll("input[name='calc']")
  .forEach(r => r.addEventListener("change", updateModeUI));

populateISO(a_iso, camera_a.value);
populateISO(b_iso, camera_b.value);
populateND(a_nd, camera_a.value);
populateND(b_nd, camera_b.value);
cacheOriginalUI();
updateModeUI();
