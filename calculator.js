"use strict";

/* =========================
   CAMERA DATA
========================= */

const CAMERA_DATA = {
  arri: {
    iso: [160,200,250,320,400,500,640,800,1000,1280,1600,2000,2560,3200],
    ndValues: [0,0.3,0.6,0.9,1.2,1.5,1.8,2.1,2.4]
  },
  venice: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    ndValues: [0,0.3,0.6,0.9,1.2,1.5,1.8,2.1,2.4]
  },
  eterna: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    ndValues: (() => {
      const v = [0,0.3];
      for (let n=0.6; n<=2.1+0.0001; n+=0.05) {
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

function isoStops(iso) {
  return Math.log2(iso / 800);
}

function shutterSpeed(fps, angle) {
  return (angle / 360) * (1 / fps);
}

function shutterStops(fps, angle) {
  return Math.log2(shutterSpeed(fps, angle) / REF_SHUTTER);
}

function tStops(t) {
  return -2 * Math.log2(t / REF_T);
}

// ND optical density → stops
function ndStops(nd) {
  return nd / 0.3;
}

function exposure(fps, angle, iso, t, nd) {
  return (
    isoStops(iso) +
    shutterStops(fps, angle) +
    tStops(t) -
    ndStops(nd)
  );
}

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
  select.value = CAMERA_DATA[cam].iso[0];
}

function populateND(select, cam) {
  select.innerHTML = "";
  CAMERA_DATA[cam].ndValues.forEach(v => {
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

  [b_iso, b_nd, b_shutter, b_fps, b_t].forEach(el => {
    el.disabled = false;
    el.innerHTML = el.dataset.original || el.innerHTML;
  });

  if (mode === "t") {
    b_t.dataset.original = b_t.innerHTML;
    b_t.innerHTML = `<option>— calculated —</option>`;
    b_t.disabled = true;
    b_t_custom.style.display = "none";
  }

  if (mode === "iso") b_iso.disabled = true;
  if (mode === "nd") b_nd.disabled = true;
  if (mode === "shutter") b_shutter.disabled = true;
  if (mode === "fps") b_fps.disabled = true;

  result.innerHTML = "Result will appear here…";
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

  if (mode === "nd") {

    const neededStops =
      isoStops(isoB) +
      shutterStops(fpsB, angB) +
      tStops(tB) -
      EA;

    if (neededStops < 1) {
      result.innerHTML =
        "⚠️ ND must be at least 1 stop (0.3 ND).<br>" +
        "<small>Use ISO, T-Stop or Shutter instead.</small>";
      return;
    }

    const neededND = neededStops * 0.3;
    const options = CAMERA_DATA[camB].ndValues;

    let best = options[options.length - 1];
    for (let v of options) {
      if (v >= neededND) {
        best = v;
        break;
      }
    }

    result.innerHTML =
      `Set B ND to <strong>${best.toFixed(2)}</strong>`;
    return;
  }

  if (mode === "iso") {
    const iso =
      800 * Math.pow(
        2,
        EA -
        shutterStops(fpsB, angB) -
        tStops(tB) +
        ndStops(ndB)
      );

    result.innerHTML =
      `Set B ISO to <strong>${Math.round(iso)}</strong>`;
    return;
  }

  if (mode === "t") {
    const s =
      EA -
      isoStops(isoB) -
      shutterStops(fpsB, angB) +
      ndStops(ndB);

    const t =
      REF_T * Math.pow(2, -s / 2);

    result.innerHTML =
      `Set B T-Stop to <strong>T${t.toFixed(2)}</strong>`;
    return;
  }
}

/* =========================
   INIT
========================= */

camera_a.onchange = () => {
  populateISO(a_iso, camera_a.value);
  populateND(a_nd, camera_a.value);
};

camera_b.onchange = () => {
  populateISO(b_iso, camera_b.value);
  populateND(b_nd, camera_b.value);
};

document
  .querySelectorAll("input[name='calc']")
  .forEach(r => r.onchange = updateModeUI);

populateISO(a_iso, camera_a.value);
populateISO(b_iso, camera_b.value);
populateND(a_nd, camera_a.value);
populateND(b_nd, camera_b.value);
updateModeUI();
