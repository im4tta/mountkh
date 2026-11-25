// Phone orientation → look direction for the summit view.
//
// Maths follows the W3C DeviceOrientation frame (alpha about up, counter-clockwise from
// north when absolute; beta front/back tilt; gamma left/right tilt). The result is the
// direction the BACK of the phone points, which is what "point at a mountain" means.
//   yaw   – scene yaw in degrees (compass heading = -yaw)
//   pitch – degrees above the horizon (positive = looking up)
import * as THREE from 'three';

const D2R = Math.PI / 180;
const zee = new THREE.Vector3(0, 0, 1);
const euler = new THREE.Euler();
const q = new THREE.Quaternion();
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // camera looks out of the back of the screen
const fwd = new THREE.Vector3();

export function lookFromOrientation(alpha, beta, gamma, screenAngle = 0) {
  euler.set(beta * D2R, alpha * D2R, -gamma * D2R, 'YXZ');
  q.setFromEuler(euler);
  q.multiply(q1);
  q.multiply(q0.setFromAxisAngle(zee, -screenAngle * D2R));
  fwd.set(0, 0, -1).applyQuaternion(q);
  return {
    yaw: Math.atan2(-fwd.x, -fwd.z) / D2R,
    pitch: Math.asin(Math.max(-1, Math.min(1, fwd.y))) / D2R,
  };
}

const screenAngle = () => {
  if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle;
  return typeof window !== 'undefined' && typeof window.orientation === 'number' ? window.orientation : 0;
};

/**
 * Subscribe to device orientation. `start()` must be called from a user gesture
 * (iOS asks for permission). Samples are low-pass filtered; yaw is unwrapped.
 * onSample({ yaw, pitch, absolute }) – absolute=false means no compass reference.
 */
export function createOrientationTracker(onSample) {
  let gotAbsolute = false;
  let smooth = null;
  let listening = false;

  const handler = (e) => {
    const ios = typeof e.webkitCompassHeading === 'number' && e.webkitCompassHeading >= 0;
    if (e.beta == null && !ios) return; // empty reading (no sensor): never let it count as a compass
    if (e.type === 'deviceorientationabsolute') gotAbsolute = true;
    else if (gotAbsolute) return; // prefer the compass-referenced stream
    const look = lookFromOrientation(e.alpha || 0, e.beta || 0, e.gamma || 0, screenAngle());
    let { yaw } = look;
    let absolute = e.absolute === true || e.type === 'deviceorientationabsolute';
    if (ios) { yaw = -e.webkitCompassHeading; absolute = true; } // true heading, tilt compensated by iOS
    if (!smooth) smooth = { yaw, pitch: look.pitch };
    else {
      const d = ((yaw - smooth.yaw + 540) % 360) - 180;
      smooth.yaw += d * 0.35;
      smooth.pitch += (look.pitch - smooth.pitch) * 0.35;
    }
    onSample({ yaw: smooth.yaw, pitch: smooth.pitch, absolute });
  };

  return {
    /** @returns {Promise<'granted'|'denied'|'unsupported'>} */
    async start() {
      if (typeof DeviceOrientationEvent === 'undefined') return 'unsupported';
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return 'denied';
        } catch { return 'denied'; }
      }
      if (!listening) {
        window.addEventListener('deviceorientationabsolute', handler, true);
        window.addEventListener('deviceorientation', handler, true);
        listening = true;
      }
      return 'granted';
    },
    stop() {
      window.removeEventListener('deviceorientationabsolute', handler, true);
      window.removeEventListener('deviceorientation', handler, true);
      listening = false; smooth = null; gotAbsolute = false;
    },
  };
}

/** Keep the screen awake while pointing. Returns a release function. */
export async function requestWakeLock() {
  try {
    const lock = await navigator.wakeLock?.request('screen');
    return () => { lock?.release().catch(() => {}); };
  } catch { return () => {}; }
}
