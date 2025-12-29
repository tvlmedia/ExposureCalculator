"use strict";

// ====================
// DISCRETE SCALES
// ====================

const T_SCALE = [
  "T1.0","T1.4","T2.0","T2.8","T4.0",
  "T5.6","T8.0","T11","T16","T22"
];

// ====================
// STOP HELPERS
// ====================

// ISO stops relative to ISO 800
function isoStops(iso){
  return Math.log2(iso / 800);
}

// Shutter stops (cinematography logic)
function shutterStops(fps, angle){
  let stops = 0;
  if (fps === 50) stops -= 1;
  if (angle === 360) stops += 1;
  if (angle === 90)  stops -= 1;
  if (angle === 45)  stops -= 2;
  return stops;
}

// ====================
// SHUTTER OPTIONS
// ====================

const SHUTTER_OPTIONS = [
  { fps:25, angle:180, stops:0 },
  { fps:25, angle:360, stops:+1 },
  { fps:25, angle:90,  stops:-1 },
  { fps:25, angle:45,  stops:-2 },
  { fps:50, angle:180, stops:-1 },
  { fps:50, angle:360, stops:0 }
];

// ====================
// CORE CALCULATE
// ====================

function calculate(){

  const mode = document.querySelector("input[name='calc']:checked").value;

  // ---------- A ----------
  const TA   = parseInt(a_t.value);
  const ISOA = isoStops(+a_iso.value);
  const NDA  = parseInt(a_nd.value);
  const SHA  = shutterStops(+a_fps.value, +a_shutter.value);

  // Exposure A (absolute reference)
  const EXP_A = ISOA + SHA - TA - NDA;

  // ---------- B (inputs) ----------
  const ISOB = isoStops(+b_iso.value);
  const NDB  = parseInt(b_nd.value);
  const SHB  = shutterStops(+b_fps.value, +b_shutter.value);

  // TB only needed if NOT calculating T
  const TB_in = isNaN(parseInt(b_t.value)) ? null : parseInt(b_t.value);

  // ====================
  // T-STOP
  // ====================
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

  // ====================
  // ISO
  // ====================
  if (mode === "iso"){

    if (TB_in === null){
      result.innerHTML =
        "<strong>Result</strong><br>⚠️ Set B T-stop first";
      return;
    }

    const ISO_B_stops = EXP_A - SHB + TB_in + NDB;
    const ISO_B = 800 * Math.pow(2, ISO_B_stops);

    result.innerHTML =
      `<strong>Result</strong><br>
       Set B ISO to: <strong>${Math.round(ISO_B)}</strong>`;
    return;
  }

  // ====================
  // ND
  // ====================
  if (mode === "nd"){

    if (TB_in === null){
      result.innerHTML =
        "<strong>Result</strong><br>⚠️ Set B T-stop first";
      return;
    }

    const ND_B_stops = ISOB + SHB - TB_in - EXP_A;

    if (ND_B_stops < 0){
      result.innerHTML =
        `<strong>Result</strong><br>
         ⚠️ Cannot compensate with ND only<br>
         Use ISO or T-stop`;
      return;
    }

    const ndRounded = Math.round(ND_B_stops);
    const ndValue = (ndRounded * 0.3).toFixed(1);

    result.innerHTML =
      `<strong>Result</strong><br>
       Set B ND to: <strong>${ndValue}</strong>`;
    return;
  }

  // ====================
  // SHUTTER (DISCRETE)
  // ====================
  if (mode === "shutter"){

    if (TB_in === null){
      result.innerHTML =
        "<strong>Result</strong><br>⚠️ Set B T-stop first";
      return;
    }

    let best = null;
    let smallestDiff = Infinity;

    SHUTTER_OPTIONS.forEach(opt => {

      const EXP_B =
        ISOB + opt.stops - TB_in - NDB;

      const diff = Math.abs(EXP_B - EXP_A);

      if (diff < smallestDiff){
        smallestDiff = diff;
        best = opt;
      }
    });

    result.innerHTML =
      `<strong>Result</strong><br>
       Set B shutter to: <strong>${best.angle}° @ ${best.fps}fps</strong><br>
       Δ ${smallestDiff.toFixed(2)} stop`;
    return;
  }
}
