import * as T from '../runtime/three.js';
import {patrolMuzzle} from '../content/patrol-pistol.js';

const up = new T.Vector3(0, 1, 0), palm = new T.Vector3(.052, -.010, 0);
const triggerHand = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, -1, 0), new T.Vector3(1, 0, 0));
const vector = ({x, y, h}) => new T.Vector3(x, h, y);
const ease = value => {
  const t = T.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

function rotateWorld(bone, rotation) {
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));
  bone.updateWorldMatrix(false, true);
}

// Adapted from the Fighters idle rig's two-link solve. Preserve the native
// bend-plane twist and lengths when fitting the right palm to the TT-33 grip.
function solveArm(upper, forearm, hand, target, rotation, pole) {
  const a = upper.getWorldPosition(new T.Vector3()), b = forearm.getWorldPosition(new T.Vector3());
  const c = hand.getWorldPosition(new T.Vector3()), ab = b.clone().sub(a), bc = c.sub(b);
  const qa = upper.getWorldQuaternion(new T.Quaternion()), qb = forearm.getWorldQuaternion(new T.Quaternion());
  const la = ab.length(), lb = bc.length(), axis = target.clone().sub(a), reach = axis.length();
  if (reach < 1e-8) return;
  axis.divideScalar(reach);
  const d = T.MathUtils.clamp(reach, Math.abs(la - lb) + .002, la + lb - .002);
  const bend = pole.clone().addScaledVector(axis, -pole.dot(axis)).normalize();
  const along = (la * la - lb * lb + d * d) / (2 * d);
  const toA = axis.clone().multiplyScalar(along).addScaledVector(bend, Math.sqrt(Math.max(0, la * la - along * along)));
  const toB = axis.clone().multiplyScalar(d).sub(toA);
  const oldNormal = ab.clone().cross(bc), newNormal = toA.clone().cross(toB);
  if (oldNormal.lengthSq() < 1e-12) oldNormal.copy(ab).cross(bend);
  const frame = (along, normal) => {
    const x = along.clone().normalize(), z = normal.clone().normalize();
    return new T.Matrix4().makeBasis(x, z.clone().cross(x).normalize(), z);
  };
  const change = (from, to) => new T.Quaternion().setFromRotationMatrix(frame(to, newNormal).multiply(frame(from, oldNormal).invert()));
  rotateWorld(upper, change(ab, toA).multiply(qa));
  rotateWorld(forearm, change(bc, toB).multiply(qb));
  rotateWorld(hand, rotation);
}

export function createPatrolPistolPose(worker, pistol) {
  const {root: gun, anchors} = pistol, hip = gun.parent;
  const bone = name => worker.skeleton.getBoneByName(name + '1');
  const upper = bone('upperArm'), forearm = bone('forearm'), hand = bone('hand'), fingers = bone('fingers');
  const beltPosition = gun.position.clone(), beltRotation = gun.quaternion.clone();
  return (actor, aim) => {
    gun.position.copy(beltPosition);
    gun.quaternion.copy(beltRotation);
    gun.updateWorldMatrix(false, true);
    if (!(aim?.progress > 0)) return null;

    const muzzle = vector(patrolMuzzle(actor)), forward = new T.Vector3(Math.cos(actor.heading), 0, Math.sin(actor.heading));
    const bore = vector(aim).sub(muzzle);
    if (bore.dot(forward) < .1) bore.copy(forward);
    bore.normalize();
    const right = bore.clone().cross(up).normalize();
    const aimRotation = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(bore, right.clone().cross(bore), right));
    const aimPosition = muzzle.sub(anchors.muzzle.position.clone().applyQuaternion(aimRotation));
    // Reach for the still-stowed grip, then draw the same pistol and raise it.
    const reach = ease(aim.progress / .28), lift = ease((aim.progress - .28) / .72);
    const gunPosition = gun.getWorldPosition(new T.Vector3()).lerp(aimPosition, lift);
    const gunRotation = gun.getWorldQuaternion(new T.Quaternion()).slerp(aimRotation, lift);
    gun.position.copy(hip.worldToLocal(gunPosition.clone()));
    gun.quaternion.copy(hip.getWorldQuaternion(new T.Quaternion()).invert().multiply(gunRotation));
    gun.updateWorldMatrix(false, true);

    const grip = anchors.grip.getWorldPosition(new T.Vector3()), handRotation = gunRotation.clone().multiply(triggerHand);
    const wrist = grip.clone().sub(palm.clone().applyQuaternion(handRotation));
    const pole = new T.Vector3(-.16, -1, .55).applyAxisAngle(up, -actor.heading);
    solveArm(upper, forearm, hand, hand.getWorldPosition(new T.Vector3()).lerp(wrist, reach),
      hand.getWorldQuaternion(new T.Quaternion()).slerp(handRotation, reach), pole);
    fingers.rotation.z = -.9 * reach;
    worker.root.updateMatrixWorld(true);
    worker.skeleton.update();
    return {progress: aim.progress, gripError: hand.localToWorld(palm.clone()).distanceTo(grip),
      muzzle: anchors.muzzle.getWorldPosition(new T.Vector3()).toArray()};
  };
}
