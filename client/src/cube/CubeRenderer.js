/**
 * Snake Nexus — Genuine Three.js 3D Cube Renderer
 */

import * as THREE from 'three';
import { CubeFace } from './CubeFace.js';
import { CubeCamera } from './CubeCamera.js';
import { CUBE_FACES, CUBE_FACE_LIST } from '../../../shared/constants.js';

export class CubeRenderer {
  constructor(container) {
    this.container = container;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    // 3. Orbital Camera Controller
    this.cubeCamera = new CubeCamera(this.camera, this.renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 1.2);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xff007f, 0.8);
    dirLight2.position.set(-5, -5, -5);
    this.scene.add(dirLight2);

    // 5. Starfield background particles
    this.createStarfield();

    // 6. Faces and Mesh
    this.faces = {};
    this.textures = {};
    this.materials = [];

    this.createCubeMesh();

    // Resize handling
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    this.isRunning = false;
  }

  createStarfield() {
    const count = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 30;
      positions[i + 1] = (Math.random() - 0.5) * 30;
      positions[i + 2] = (Math.random() - 0.5) * 30;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.08,
      transparent: true,
      opacity: 0.5
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  createCubeMesh() {
    // Three.js BoxGeometry material order:
    // 0: +X (RIGHT)
    // 1: -X (LEFT)
    // 2: +Y (TOP)
    // 3: -Y (BOTTOM)
    // 4: +Z (FRONT)
    // 5: -Z (BACK)
    const faceOrder = [
      CUBE_FACES.RIGHT,
      CUBE_FACES.LEFT,
      CUBE_FACES.TOP,
      CUBE_FACES.BOTTOM,
      CUBE_FACES.FRONT,
      CUBE_FACES.BACK
    ];

    this.materials = faceOrder.map((faceName) => {
      const face = new CubeFace(faceName, 16, 512);
      this.faces[faceName] = face;

      const texture = new THREE.CanvasTexture(face.canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures[faceName] = texture;

      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3,
        metalness: 0.1
      });
    });

    // Main Cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.cubeMesh = new THREE.Mesh(geometry, this.materials);
    this.scene.add(this.cubeMesh);

    // Glowing wireframe border
    const edgesGeom = new THREE.EdgesGeometry(geometry);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });
    this.edgesMesh = new THREE.LineSegments(edgesGeom, edgesMat);
    this.scene.add(this.edgesMesh);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const animate = () => {
      if (!this.isRunning) return;
      requestAnimationFrame(animate);

      this.cubeCamera.update();

      // Check if any face canvas needs texture upload
      for (const faceName of CUBE_FACE_LIST) {
        const face = this.faces[faceName];
        if (face && face.needsUpdate) {
          this.textures[faceName].needsUpdate = true;
          face.needsUpdate = false;
        }
      }

      if (this.stars) {
        this.stars.rotation.y += 0.0003;
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  stop() {
    this.isRunning = false;
  }

  updateFace(faceName, snakes, foods, isFinalStage) {
    const face = this.faces[faceName];
    if (face) {
      face.render(snakes, foods, isFinalStage);
    }
  }

  onResize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

