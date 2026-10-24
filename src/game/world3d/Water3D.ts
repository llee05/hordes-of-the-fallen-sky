import * as THREE from 'three';
import { riverPoint } from '../assets/riverGeometry';
import type { WorldRiver } from './WorldRiver';

/** Turquoise channels and timber crossings occupy the same elevated world as the terrain. */
export class Water3D {
  readonly group = new THREE.Group();
  readonly time = { value: 0 };
  constructor(readonly river: WorldRiver) {
    this.group.name = 'world-river';
    const positions: number[] = [];
    const uv: number[] = [];
    const banks: number[] = [];
    const height = river.floor - 1.5;
    for (const channel of river.channels)
      for (let i = 0; i + 1 < channel.sections.length; i++) {
        const a = channel.sections[i]!;
        const b = channel.sections[i + 1]!;
        const leftA = riverPoint(a, -1),
          rightA = riverPoint(a, 1),
          leftB = riverPoint(b, -1),
          rightB = riverPoint(b, 1);
        for (const [p, u, distance] of [
          [leftA, 0, a.distance],
          [leftB, 0, b.distance],
          [rightB, 1, b.distance],
          [leftA, 0, a.distance],
          [rightB, 1, b.distance],
          [rightA, 1, a.distance],
        ] as const) {
          positions.push(river.center + p.x, height, river.center + p.y);
          uv.push(u, distance / 36);
        }
        for (const side of [-1, 1]) {
          const pa = riverPoint(a, side),
            pb = riverPoint(b, side),
            oa = riverPoint(a, side, 6),
            ob = riverPoint(b, side, 6);
          for (const p of [pa, pb, ob, pa, ob, oa])
            banks.push(river.center + p.x, height + 0.3, river.center + p.y);
        }
      }
    const geometry = new THREE.BufferGeometry()
      .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      .setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    const frozen = river.definition.kind === 'frozen';
    const material = new THREE.MeshLambertMaterial({
      color: frozen ? 0xa6c4c9 : river.definition.color,
      side: THREE.DoubleSide,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.flowTime = this.time;
      shader.uniforms.frozen = { value: frozen ? 1 : 0 };
      shader.vertexShader = `varying vec2 riverUv;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nriverUv=uv;',
      );
      shader.fragmentShader =
        `varying vec2 riverUv;uniform float flowTime;uniform int frozen;\n${shader.fragmentShader}`.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
        float flow=sin(riverUv.y*1.1-flowTime*1.6+sin(riverUv.x*7.0))*0.035;
        float edge=pow(abs(riverUv.x*2.0-1.0),8.0);
        diffuseColor.rgb*=0.89+flow+edge*0.22;
        if(frozen==1)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.75,0.85,0.86),0.2);
      `,
        );
    };
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.name = 'river-water';
    this.group.add(mesh);
    const shore = new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute(banks, 3),
    );
    shore.computeVertexNormals();
    this.group.add(
      new THREE.Mesh(
        shore,
        new THREE.MeshBasicMaterial({
          color: 0xc6dccb,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      ),
    );
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    const dummy = new THREE.Object3D();
    for (const bridge of river.bridges) {
      const planks = Math.ceil(bridge.length / 10);
      for (let i = 0; i < planks; i++) {
        const distance = ((i + 0.5) / planks) * bridge.length - bridge.length / 2;
        dummy.position.set(
          bridge.x + bridge.nx * distance,
          bridge.height - 2,
          bridge.z + bridge.nz * distance,
        );
        dummy.rotation.set(0, Math.atan2(bridge.nx, bridge.nz), 0);
        dummy.scale.set(bridge.width, 4, bridge.length / planks - 0.5);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
        colors.push(new THREE.Color(i % 3 ? 0xa1855b : 0xb69a6c));
      }
    }
    const deck = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      matrices.length,
    );
    matrices.forEach((matrix, index) => {
      deck.setMatrixAt(index, matrix);
      deck.setColorAt(index, colors[index]!);
    });
    deck.castShadow = deck.receiveShadow = true;
    deck.name = 'river-crossings';
    this.group.add(deck);
  }
  update(elapsed: number): void {
    this.time.value = elapsed;
  }
  destroy(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          material.dispose();
      }
    });
    this.group.removeFromParent();
  }
}
