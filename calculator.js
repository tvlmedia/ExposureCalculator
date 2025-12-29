"use strict";

/* =========================
   CAMERA DATA
========================= */

const CAMERA_DATA = {
  arri: {
    iso: [160,200,250,320,400,500,640,800,1000,1280,1600,2000,2560,3200],
    native: [800],
    nd: { values: [0,0.3,0.6,0.9,1.2,1.5,1.8,2.1,2.4] }
  },

  venice: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    native: [500,2500],
    nd: { values: [0,0.3,0.6,0.9,1.2,1.5,1.8,2.1,2.4] }
  },

  eterna: {
    iso: [
      125,160,200,250,320,400,500,
      640,800,1000,1250,1600,2000,
      2500,3200,4000,5000,6400,8000,10000
    ],
    native: [800,3200],
    nd: {
      values: (() => {
        const arr = [];
        for (let v = 0.6; v <= 2.1 + 0.0001; v += 0.05) {
          arr.push(+v.toFixed(2));
        }
        arr.push(2.4); // fysieke ND
        return arr;
      })()
    }
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
function shutterStops(fps, angle){
  return Math.log2(shutterSpeed(fps, angle) / REF_SHUTTER);
}
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
}

function populateND(select, cam){
  select.innerHTML = "";
  CAMERA_DATA[cam].nd.values.forEach(v=>{
    const o=document.createElement("option");
    o.value=v;
    o.textContent = v===0 ? "Clear" : v.toFixed(2);
    select.appendChild(o);
  });
}

/* =========================
   T-STOP
========================= */

function getTValue(sel, input){
  return sel.value === "custom" ? parseFloat(input.value) : parseFloat(sel.value);
}

function toggleCustomT(side){
  const sel = document.getElementById(`${side}_t`);
  const inp = document.getElementById(`${side}_t_custom`);
  inp.style.display = sel.value === "custom" ? "block" : "none";
  if (sel.value === "custom") inp.focus();
}

/* =========================
   CALCULATED FIELD UX
========================= */

const storedValues = new Map();

function setCalculated(select){
  if (!storedValues.has(select)) {
    storedValues.set(select, select.value);
  }

  select.innerHTML = "";
  const opt = document.createElement("option");
  opt.textContent = "— calculated —";
  opt.value = "";
  select.appendChild(opt);

  select.disabled = true;
  select.classList.add("calculated");
}

function restoreSelect(select){
  if (!storedValues.has(select)) return;

  const old = storedValues.get(select);
  storedValues.delete(select);

  // repopulate
  if (select === b_iso) populateISO(select, camera_b.value);
  if (select === b_nd)  populateND(select, camera_b.value);

  select.value = old;
  select.disabled = false;
  select.classList.remove("calculated");
}

/* =========================
   UI MODE SWITCH
========================= */

function updateUI(){
  const mode = document.querySelector("input[name='calc']:checked").value;

  // herstel alles eerst
  [b_t, b_iso, b_nd, b_shutter, b_fps].forEach(restoreSelect);

  // lock exact 1 veld — nooit meer
  switch (mode){
    case "t":
      setCalculated(b_t);
      break;
    case "iso":
      setCalculated(b_iso);
      break;
    case "nd":
      setCalculated(b_nd);
      break;
    case "shutter":
      setCalculated(b_shutter);
      break;
    case "fps":
      setCalculated(b_fps);
      break;
  }

  result.innerHTML = "Result will appear here…";
}

/* =========================
   CALCULATION
========================= */

function calculate(){

  const mode = document.querySelector("input[name='calc']:checked").value;

  const tA = getTValue(a_t,a_t_custom);
  const EA = exposure(+a_fps.value,+a_shutter.value,+a_iso.value,tA,+a_nd.value);

  const tB = getTValue(b_t,b_t_custom);
  const fpsB = +b_fps.value;
  const angB = +b_shutter.value;
  const isoB = +b_iso.value;
  const ndB  = +b_nd.value;

  if (mode === "t"){
    const target = EA - isoStops(isoB) - shutterStops(fpsB,angB) + ndB;
    const t = REF_T * Math.pow(2,-target/2);
    result.innerHTML = `Set B T-Stop to <strong>T${t.toFixed(2)}</strong>`;
  }

  if (mode === "iso"){
    const iso = 800 * Math.pow(2, EA - shutterStops(fpsB,angB) - tStops(tB) + ndB);
    result.innerHTML = `Set B ISO to <strong>${Math.round(iso)}</strong>`;
  }

  if (mode === "nd"){
    const nd = isoStops(isoB) + shutterStops(fpsB,angB) + tStops(tB) - EA;
    if (nd < 0){ result.innerHTML="⚠️ Cannot solve with ND only"; return; }
    const list = CAMERA_DATA[camera_b.value].nd.values;
    const closest = list.reduce((a,b)=>Math.abs(b-nd)<Math.abs(a-nd)?b:a);
    result.innerHTML = `Set B ND to <strong>${closest.toFixed(2)}</strong>`;
  }

  if (mode === "shutter"){
    const target = EA - isoStops(isoB) - tStops(tB) + ndB;
    for (let a of [360,180,90,45]){
      if (Math.abs(shutterStops(fpsB,a)-target)<0.01){
        result.innerHTML = `Set B Shutter Angle to <strong>${a}°</strong>`;
      }
    }
  }

  if (mode === "fps"){
    for (let f of [25,50]){
      const e = isoStops(isoB)+shutterStops(f,angB)+tStops(tB)-ndB;
      if (Math.abs(e-EA)<0.01){
        result.innerHTML = `Set B Frame Rate to <strong>${f} fps</strong>`;
      }
    }
  }
}

/* =========================
   INIT
========================= */

camera_a.onchange = ()=>{ populateISO(a_iso,camera_a.value); populateND(a_nd,camera_a.value); };
camera_b.onchange = ()=>{ populateISO(b_iso,camera_b.value); populateND(b_nd,camera_b.value); };

document.querySelectorAll("input[name='calc']").forEach(r=>r.onchange=updateUI);

populateISO(a_iso,camera_a.value);
populateISO(b_iso,camera_b.value);
populateND(a_nd,camera_a.value);
populateND(b_nd,camera_b.value);
updateUI();
