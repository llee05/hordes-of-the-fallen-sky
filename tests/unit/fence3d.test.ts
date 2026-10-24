import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type Phaser from 'phaser';
import { Fence3D, type FenceSegment } from '../../src/game/world3d/Fence3D';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { composedRegion } from '../../src/game/data/worldRegions';

describe('portable hurdles in an elevated scene', () => {
  it('anchors posts to terrain and refreshes positions and visibility when the camp moves', () => {
    const root = new THREE.Group();
    const terrain = new ComposedTerrain(composedRegion('otgontenger'));
    const fence = new Fence3D(root, terrain);
    let segment: FenceSegment = {
      ax: 2600,
      az: 2600,
      bx: 2630,
      bz: 2600,
      height: 25,
      wood: 0x856342,
      cloth: 0x315d64,
    };
    const object = { visible: true, getData: () => segment };
    const objects = [object as unknown as Phaser.GameObjects.GameObject];
    const post = () => {
      const matrix = new THREE.Matrix4();
      fence.mesh.getMatrixAt(0, matrix);
      return new THREE.Vector3(0, -0.5, 0).applyMatrix4(matrix);
    };
    fence.update(objects);
    expect(fence.mesh.count).toBe(6);
    expect(post().y).toBeCloseTo(terrain.actorHeight(segment.ax, segment.az) * 1000, 4);
    segment = { ...segment, ax: 3600, bx: 3630 };
    fence.update(objects);
    expect(post().x).toBeCloseTo(3600);
    expect(post().y).toBeCloseTo(terrain.actorHeight(segment.ax, segment.az) * 1000, 4);
    object.visible = false;
    fence.update(objects);
    expect(fence.mesh.count).toBe(0);
    fence.destroy();
    expect(root.children).toHaveLength(0);
  });
});
