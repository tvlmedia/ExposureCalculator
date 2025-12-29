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

const REF_T = 2.8;
const REF_SHUTTER = 1 / 50;

/* =========================
   PHYSICS
========================= */

function isoStops(iso){ return Math.log2(iso / 800); }
function shutterSpeed(fps, angle){ return (angle / 360) * (1 / fps); }
function shutterStops(fps, angle){ return Math.log2(shutterSpeed(fps, angle) / REF_SHUTTER); }
function tStops(t){ return -2 * Math.log2(t / REF_T); }

function exposure(fps, angle, iso, t, nd){
  return isoStops(iso) + shutterStops(fps, angle) + tStops(t) - nd;
}

/* =========================
   POPULATORS
========================= */

function populateISO(select, cam){
  select.innerHTML = "";
  CAMERA_DATA[cam].iso.forEach(v=>{
    const o=document.createElement("option");
    o.value=v; o.textContent=v;
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
    for (let v=0.6; v<=2.1+0.0001; v+=0.05){
      values.push(Number(v.toFixed(2)));
    }
    values.unshift(0);
    values.push(2.4);
  }

  values.forEach(v=>{
    const o=document.createElement("option");
    o.value=v;
    o.textContent = v===0 ? "Clear" : v.toFixed(2);
    select.appendChild(o);
  });

  select.value = 0;
}

/* =========================
   T-STOP CUSTOM
========================= */

function toggleCustomT(side){
  const sel = document.getElementById(`${side}_t`);
  const inp = document.getElementById(`${side}_t_custom`);
  inp.style.display = sel.value === "custom" ? "block" : "none";
}

function getT(side){
  const sel = document.getElementById(`${side}_t`);
  const inp = document.getElementById(`${side}_t_custom`);
  return sel.value === "custom" ? parseFloat(inp.value) : parseFloat(sel.value);
}

/* =========================
   MODE UI (FIXED)
========================= */

function updateModeUI(){
  const mode = document.querySelector("input[name='calc']:checked").value;

  // reset alles
  [b_iso, b_nd, b_shutter, b_fps].forEach(el=>{
    el.disabled = false;
    el.classList.remove("calculated");
  });

  resetTStop();

  // lock ONLY the calculated field
  if (mode === "iso") lockField(b_iso);
  if (mode === "nd") lockField(b_nd);
  if (mode === "shutter") lockField(b_shutter);
  if (mode === "fps") lockField(b_fps);

  if (mode === "t"){
    b_t.disabled = true;
    b_t.classList.add("calculated");
    b_t.innerHTML = `<option>— calculated —</option>`;
    b_t_custom.style.display = "none";
  }

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

  if (mode === "t"){
    const s = EA - isoStops(isoB) - shutterStops(fpsB, angB) + ndB;
    const t = REF_T * Math.pow(2, -s/2);
    result.innerHTML = `Set B T-Stop to <strong>T${t.toFixed(2)}</strong>`;
    return;
  }

  if (mode === "iso"){
    const iso = 800 * Math.pow(2, EA - shutterStops(fpsB, angB) - tStops(tB) + ndB);
    result.innerHTML = `Set B ISO to <strong>${Math.round(iso)}</strong>`;
    return;
  }

  if (mode === "nd"){
    const nd = isoStops(isoB) + shutterStops(fpsB, angB) + tStops(tB) - EA;
    result.innerHTML = `Set B ND to <strong>${nd.toFixed(2)}</strong>`;
    return;
  }

  if (mode === "shutter"){
    for (let a of [360,180,90,45]){
      if (Math.abs(shutterStops(fpsB,a)-(EA-isoStops(isoB)-tStops(tB)+ndB))<0.01){
        result.innerHTML = `Set B Shutter to <strong>${a}°</strong>`;
        return;
      }
    }
    result.innerHTML="⚠️ No solution";
  }

  if (mode === "fps"){
    for (let f of [25,50]){
      if (Math.abs(exposure(f,angB,isoB,tB,ndB)-EA)<0.01){
        result.innerHTML = `Set B FPS to <strong>${f}</strong>`;
        return;
      }
    }
    result.innerHTML="⚠️ No solution";
  }
}

/* =========================
   INIT
========================= */

camera_a.onchange = ()=>{ populateISO(a_iso,camera_a.value); populateND(a_nd,camera_a.value); };
camera_b.onchange = ()=>{ populateISO(b_iso,camera_b.value); populateND(b_nd,camera_b.value); };

document.querySelectorAll("input[name='calc']").forEach(r=>r.onchange=updateModeUI);

populateISO(a_iso,camera_a.value);
populateISO(b_iso,camera_b.value);
populateND(a_nd,camera_a.value);
populateND(b_nd,camera_b.value);
updateModeUI();
