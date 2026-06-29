/**
 * Builds a glowing 3D marker for a unit on the globe — a clean primitive shape
 * per unit type, colored to its owner, with a soft halo and a selection ring.
 * Purely cosmetic geometry; no game state.
 */

import * as THREE from 'three';
import type { UnitType } from '@/models/unit';
import { UNIT_CONFIG } from '@/config/units';

function geometryFor(kind: string, size: number): THREE.BufferGeometry {
  switch (kind) {
    case 'box':
      return new THREE.BoxGeometry(size * 1.2, size * 1.2, size * 1.2);
    case 'cone':
      return new THREE.ConeGeometry(size * 0.7, size * 1.7, 6);
    case 'cylinder':
      return new THREE.CylinderGeometry(size * 0.55, size * 0.55, size * 1.3, 10);
    case 'tetra':
      return new THREE.TetrahedronGeometry(size * 1.0);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(size * 1.0, 0);
    case 'octahedron':
    default:
      return new THREE.OctahedronGeometry(size * 1.0, 0);
  }
}

/**
 * Construct the marker Object3D for one unit.
 * @param type   unit type (selects geometry)
 * @param color  owner nation hex color
 * @param selected whether to add the bright selection ring
 */
export function buildUnitObject(type: UnitType, color: string, selected: boolean): THREE.Object3D {
  const v = UNIT_CONFIG.visual[type];
  const group = new THREE.Group();
  const c = new THREE.Color(color);

  // Solid, always-bright body (reads as a neon marker against the dark globe).
  const body = new THREE.Mesh(
    geometryFor(v.geom, v.scale),
    new THREE.MeshBasicMaterial({ color: c }),
  );
  group.add(body);

  // Soft translucent halo for the holographic glow.
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(v.scale * 1.5, 12, 12),
    new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  group.add(halo);

  if (selected) {
    // Slightly enlarge + add a bright white ring around the base.
    body.scale.setScalar(1.25);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(v.scale * 1.9, v.scale * 0.18, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    ring.rotation.x = Math.PI / 2; // lay the ring flat around the marker
    group.add(ring);
  }

  return group;
}
