"use strict";

// T-stop scale as stop indices
const T_SCALE = [
  "T1.0",
  "T1.4",
  "T2.0",
  "T2.8",
  "T4.0",
  "T5.6",
  "T8.0",
  "T11"
];

// ISO to stop offset relative to ISO 800
function isoStops(iso){
  return Math.log2(iso / 800);
}

// Shutter stop offsets (set-logic, not physics)
function shutterStops(fps, angle){
  let stops = 0;

  if (fps === 50) stops -= 1;
  if (angle === 360) stops += 1;
  if (angle === 90) stops -= 1;
  if (angle === 45) stops -= 2;

  return stops;
}

function calculate(){

  // --- A ---
  const TA  = parseInt(a_t.value);
  const ISOA = isoStops(+a_iso.value);
  const NDA  = parseInt(a_nd.value);
  const SHA  = shutterStops(+a_fps.value, +a_shutter.value);

  // --- B (unknown T) ---
  const ISOB = isoStops(+b_iso.value);
  const NDB  = parseInt(b_nd.value);
  const SHB  = shutterStops(+b_fps.value, +b_shutter.value);

  // Total exposure in stops
  const TOTAL_A = TA + ISOA + SHA + NDA;

  // Solve T for B
 const TB = TOTAL_A - (ISOB + SHB + NDB);

  if (TB < 0 || TB >= T_SCALE.length){
    result.innerHTML =
      "<strong>Result</strong><br>⚠️ Out of T-stop range";
    return;
  }

  result.innerHTML =
    `<strong>Result</strong><br>
     Set B T-stop to: <strong>${T_SCALE[TB]}</strong>`;
}
