"use strict";

/* =========================
   CAMERA DATA
========================= */

const CAMERA_DATA = {
  arri: {
    iso: [160,200,250,320,400,500,640,800,1000,1280,1600,2000,2560,3200],
    defaultISO: 800,
    nd: [0,0.3,0.6,0.9,1.2,1.5,1.8,2.1,2.4]
  },

  venice: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    defaultISO: 500,
    nd: [0,0.3,0.6,0.9,1.2,1.5,1.8,2.1,2.4]
  },

  eterna: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    defaultISO: 800,
    nd: (() => {
      const v = [0,0.3];
      for (let n = 0.6; n <= 2.1 + 0.0001; n += 0.05) {
        v.push(Number(n.toFixed(2)));
      }
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
   PHYSICS
========================= */

const isoStops = iso => Math.log2(iso / 800);

const shutterSpeed = (fps, angle) =>
  (angle / 360) * (1 / fps);

const shutterStops = (fps, angle) =>
  Math.log2(shutterSpeed(fps, angle) / REF_SHUTTER);

const tStops = t =>
  -2 * Math.log2(t / REF_T);

// 0.3 ND = 1 stop
const ndStops = nd => nd / 0.3;

const exposure = (fps, angle, iso, t, nd) =>
  isoStops(iso) +
  shutterStops(fps, angle) +
  tStops(t) -
  ndStops(nd);

/* =========================
   POPULATORS
========================= */

function populateISO(select, cam) {
  select.innerHTML = "";
  CAMERA_DATA[cam].iso.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
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
   T-STOP
========================= */

function toggleCustomT(side) {
  const sel = document.getElementById(`${side}_t`);
  const inp = document.getElementById(`${side}_t_custom`);
  inp.style.display = sel.value === "custom" ? "block" : "none";
}

function getT(side) {
  const sel = document.getElementById(`${side}_t`);
  const inp = document.getElementById(`${side}_t_custom`);
  return sel.value === "custom"
    ? parseFloat(inp.value)
    : parseFloat(sel.value);
}

/* =========================
   MODE UI
========================= */

function updateModeUI() {
  const mode = document.querySelector("input[name='calc']:checked").value;

  // reset B
  [b_iso, b_nd, b_shutter, b_fps, b_t].forEach(el => {
    el.disabled = false;
    el.classList.remove("calculated");
  });

  if (mode === "iso") lock(b_iso);
  if (mode === "nd")  lock(b_nd);
  if (mode === "fps") lock(b_fps);
  if (mode === "shutter") lock(b_shutter);

  if (mode === "t") {
    b_t.disabled = true;
    b_t.classList.add("calculated");
    b_t_custom.style.display = "none";
  }

  calculate();
}

function lock(el) {
  el.disabled = true;
  el.classList.add("calculated");
}

/* =========================
   CALCULATION
========================= */

function calculate() {
  const mode = document.querySelector("input[name='calc']:checked").value;
  const camB = camera_b.value;

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

  // ---- ND ----
  if (mode === "nd") {
    const stops =
      isoStops(isoB) +
      shutterStops(fpsB, angB) +
      tStops(tB) -
      EA;

    if (stops < 1) {
      result.innerHTML =
        "⚠️ ND must be ≥ 1 stop (0.3 ND)";
      return;
    }

    const neededND = stops * 0.3;
    const options = CAMERA_DATA[camB].nd;

    let best = options[options.length - 1];
    for (let v of options) {
      if (v >= neededND) {
        best = v;
        break;
      }
    }

    result.innerHTML = `Set B ND to <strong>${best.toFixed(2)}</strong>`;
    return;
  }

  // ---- ISO ----
  if (mode === "iso") {
    const iso =
      800 * Math.pow(
        2,
        EA -
        shutterStops(fpsB, angB) -
        tStops(tB) +
        ndStops(ndB)
      );

    result.innerHTML = `Set B ISO to <strong>${Math.round(iso)}</strong>`;
    return;
  }

  // ---- T-STOP ----
  if (mode === "t") {
    const s =
      EA -
      isoStops(isoB) -
      shutterStops(fpsB, angB) +
      ndStops(ndB);

    const t = REF_T * Math.pow(2, -s / 2);
    result.innerHTML = `Set B T-Stop to <strong>T${t.toFixed(2)}</strong>`;
    return;
  }
}

/* =========================
   AUTO RECALC
========================= */

document.querySelectorAll(
  "select, input[type='number']"
).forEach(el => {
  el.addEventListener("change", calculate);
  el.addEventListener("input", calculate);
});

/* =========================
   INIT
========================= */

camera_a.onchange = () => {
  populateISO(a_iso, camera_a.value);
  populateND(a_nd, camera_a.value);
  calculate();
};

camera_b.onchange = () => {
  populateISO(b_iso, camera_b.value);
  populateND(b_nd, camera_b.value);
  calculate();
};

document
  .querySelectorAll("input[name='calc']")
  .forEach(r => r.onchange = updateModeUI);

populateISO(a_iso, camera_a.value);
populateISO(b_iso, camera_b.value);
populateND(a_nd, camera_a.value);
populateND(b_nd, camera_b.value);
updateModeUI();
