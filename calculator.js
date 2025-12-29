"use strict";

// --------------------
// DISCRETE SCALES
// --------------------

const T_SCALE = [
  "T1.0",
  "T1.4",
  "T2.0",
  "T2.8",
  "T4.0",
  "T5.6",
  "T8.0",
   "T11",
   "T16",
  "T22"
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

// --------------------
// CORE CALCULATE
// --------------------

function calculate(){

  const mode = document.querySelector("input[name='calc']:checked").value;

  // ---------- A ----------
  const TA   = parseInt(a_t.value);
  const ISOA = isoStops(+a_iso.value);
  const NDA  = parseInt(a_nd.value);
  const SHA  = shutterStops(+a_fps.value, +a_shutter.value);

  // ---------- B ----------
  const TB_in  = parseInt(b_t.value);
  const ISOB  = isoStops(+b_iso.value);
  const NDB   = parseInt(b_nd.value);
  const SHB   = shutterStops(+b_fps.value, +b_shutter.value);

  /*
    exposure =
      + ISO
      + shutter
      - T-stop
      - ND
  */

  const EXP_A = ISOA + SHA - TA - NDA;

  // --------------------
  // CALCULATION MODES
  // --------------------

  // ---- T-STOP ----
  if (mode === "t"){

    const TB = ISOB + SHB - NDB - EXP_A;

    if (!Number.isInteger(TB) || TB < 0 || TB >= T_SCALE.length){
      result.innerHTML =
        "<strong>Result</strong><br>⚠️ T-stop out of range";
      return;
    }

    result.innerHTML =
      `<strong>Result</strong><br>
       Set B T-stop to: <strong>${T_SCALE[TB]}</strong>`;
    return;
  }

  // ---- ISO ----
  if (mode === "iso"){

    const ISO_B_stops = EXP_A - SHB + TB_in + NDB;
    const ISO_B = 800 * Math.pow(2, ISO_B_stops);

    result.innerHTML =
      `<strong>Result</strong><br>
       Set B ISO to: <strong>${Math.round(ISO_B)}</strong>`;
    return;
  }

  // ---- ND ----
  if (mode === "nd"){

    const ND_B_stops = ISOB + SHB - TB_in - EXP_A;

    if (ND_B_stops < 0){
      result.innerHTML =
        `<strong>Result</strong><br>
         ⚠️ Cannot compensate with ND only<br>
         Try opening T-stop or increasing ISO`;
      return;
    }

    const ndRounded = Math.round(ND_B_stops);
    const ndValue = (ndRounded * 0.3).toFixed(1);

    result.innerHTML =
      `<strong>Result</strong><br>
       Set B ND to: <strong>${ndValue}</strong>`;
    return;
  }
}
