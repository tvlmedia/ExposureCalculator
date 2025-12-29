"use strict";

// Discrete T-stop ladder (index = stops darker)
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

// ISO stops relative to ISO 800
function isoStops(iso){
  return Math.log2(iso / 800);
}

// Shutter stops (practical cinematography logic)
function shutterStops(fps, angle){
  let stops = 0;

  if (fps === 50) stops -= 1;
  if (angle === 360) stops += 1;
  if (angle === 90)  stops -= 1;
  if (angle === 45)  stops -= 2;

  return stops;
}

function calculate(){

  // ---------- A ----------
  const TA   = parseInt(a_t.value);     // T-stop index (darker = higher)
  const ISOA = isoStops(+a_iso.value);
  const NDA  = parseInt(a_nd.value);    // ND in stops
  const SHA  = shutterStops(+a_fps.value, +a_shutter.value);

  // ---------- B ----------
  const ISOB = isoStops(+b_iso.value);
  const NDB  = parseInt(b_nd.value);
  const SHB  = shutterStops(+b_fps.value, +b_shutter.value);

  /*
    Exposure logic in stops:

    exposure =
      + ISO
      + shutter
      - T-stop
      - ND
  */

  const EXPOSURE_A =
    ISOA + SHA - TA - NDA;

  // Solve T for B:
  // EXPOSURE_A = ISOB + SHB - TB - NDB
  const TB = ISOB + SHB - NDB - EXPOSURE_A;

  if (!Number.isInteger(TB) || TB < 0 || TB >= T_SCALE.length){
    result.innerHTML =
      "<strong>Result</strong><br>⚠️ Out of T-stop range";
    return;
  }

  result.innerHTML =
    `<strong>Result</strong><br>
     Set B T-stop to: <strong>${T_SCALE[TB]}</strong>`;
}
