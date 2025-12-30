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
   CINE HELPERS
========================= */

// snap to nearest 1/3 stop
const snapStops = stops => Math.round(stops * 3) / 3;

// stops → T-stop
const stopsToT = stops =>
  REF_T * Math.pow(2, -stops / 2);

// format cine T-stop (T2.8 +1/3)
function formatTstop(stops) {
  const base = Math.floor(stops);
  const thirds = Math.round((stops - base) * 3);
  const baseT = stopsToT(base);

  if (thirds === 0) return `T${baseT.toFixed(1)}`;
  return `T${baseT.toFixed(1)} +${thirds}/3`;
}

// snap ISO
function snapISO(isoExact, cam) {
  const list = CAMERA_DATA[cam].iso;
  let best = list[0];
  let diff = Infinity;

  list.forEach(v => {
    const d = Math.abs(v - isoExact);
    if (d < diff) {
      diff = d;
      best = v;
    }
  });

  return { snapped: best, exact: isoExact };
}

// snap ND
function snapND(ndExact, cam) {
  const list = CAMERA_DATA[cam].nd;
  let best = list[list.length - 1];

  for (let v of list) {
    if (v >= ndExact) {
      best = v;
      break;
    }
  }

  return { snapped: best, exact: ndExact };
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
   T-STOP INPUT
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

  [b_iso, b_nd, b_shutter, b_fps, b_t].forEach(el => el.disabled = false);

  if (mode === "iso") b_iso.disabled = true;
  if (mode === "nd") b_nd.disabled = true;
  if (mode === "fps") b_fps.disabled = true;
  if (mode === "shutter") b_shutter.disabled = true;
  if (mode === "t") {
    b_t.disabled = true;
    b_t_custom.style.display = "none";
  }

  calculate();
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

  /* ---- T ---- */
  if (mode === "t") {
    const stops =
      EA -
      isoStops(isoB) -
      shutterStops(fpsB, angB) +
      ndStops(ndB);

    const snappedStops = snapStops(stops);
    const tExact = stopsToT(stops);
    const tSnapped = stopsToT(snappedStops);

    let html =
      `Set B T-Stop to <strong>${formatTstop(snappedStops)}</strong>
       <br><small>(exact: T${tExact.toFixed(2)})</small>`;

    if (Math.abs(snappedStops - stops) > 0.33) {
      const isoFix = snapISO(
        isoB * Math.pow(2, snappedStops - stops),
        camB
      );

      html +=
        `<br><br><small>More accurate:</small><br>
         ISO ${isoFix.snapped}
         <small>(exact ${isoFix.exact.toFixed(0)})</small>`;
    }

    result.innerHTML = html;
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

    result.innerHTML =
      `Set B ISO to <strong>${iso.snapped}</strong>
       <br><small>(exact: ${iso.exact.toFixed(0)})</small>`;
    return;
  }

  /* ---- ND ---- */
  if (mode === "nd") {
    const stops =
      isoStops(isoB) +
      shutterStops(fpsB, angB) +
      tStops(tB) -
      EA;

    const snappedStops = snapStops(stops);
    if (snappedStops < 1) {
      result.innerHTML = "⚠️ ND must be ≥ 1 stop (0.3 ND)";
      return;
    }

    const ndExact = snappedStops * 0.3;
    const nd = snapND(ndExact, camB);

    let html =
      `Set B ND to <strong>${nd.snapped.toFixed(2)}</strong>
       <br><small>(exact: ${ndExact.toFixed(2)} ND / ${snappedStops.toFixed(2)} stops)</small>`;

    if (Math.abs(snappedStops - stops) > 0.33) {
      const isoFix = snapISO(
        isoB * Math.pow(2, snappedStops - stops),
        camB
      );

      html +=
        `<br><br><small>More accurate:</small><br>
         ND ${nd.snapped.toFixed(2)} + ISO ${isoFix.snapped}
         <small>(exact ISO ${isoFix.exact.toFixed(0)})</small>`;
    }

    result.innerHTML = html;
  }
}

/* =========================
   AUTO RECALC
========================= */

document.querySelectorAll("select, input[type='number']").forEach(el => {
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

document.querySelectorAll("input[name='calc']")
  .forEach(r => r.onchange = updateModeUI);

populateISO(a_iso, camera_a.value);
populateISO(b_iso, camera_b.value);
populateND(a_nd, camera_a.value);
populateND(b_nd, camera_b.value);
updateModeUI();
