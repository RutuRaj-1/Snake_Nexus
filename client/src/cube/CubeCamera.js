/**
 * Snake Nexus — 3D Cube Camera & Orbital Controls
 */

import * as THREE from 'three';

export class CubeCamera {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.targetRotation = { x: 0.35, y: -0.6 };
    this.currentRotation = { x: 0.35, y: -0.6 };
    this.distance = 2.8;
    this.targetDistance = 2.8;
    this.autoRotate = false;

    this.setupListeners();
    this.updateCameraTransform();
  }

  setupListeners() {
    const el = this.domElement;

    el.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.targetRotation.y += deltaX * 0.007;
      this.targetRotation.x += deltaY * 0.007;

      // Clamp vertical pitch to avoid flipping
      this.targetRotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.targetRotation.x));

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetDistance += e.deltaY * 0.002;
      this.targetDistance = Math.max(1.8, Math.min(5.5, this.targetDistance));
    }, { passive: false });
  }

  focusFace(face) {
    switch (face) {
      case 'FRONT':
        this.targetRotation = { x: 0, y: 0 };
        break;
      case 'BACK':
        this.targetRotation = { x: 0, y: Math.PI };
        break;
      case 'LEFT':
        this.targetRotation = { x: 0, y: Math.PI / 2 };
        break;
      case 'RIGHT':
        this.targetRotation = { x: 0, y: -Math.PI / 2 };
        break;
      case 'TOP':
        this.targetRotation = { x: -Math.PI / 2 + 0.001, y: 0 };
        break;
      case 'BOTTOM':
        this.targetRotation = { x: Math.PI / 2 - 0.001, y: 0 };
        break;
      case 'RESET':
      default:
        this.targetRotation = { x: 0.35, y: -0.6 };
        this.targetDistance = 2.8;
        break;
    }
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  update() {
    if (this.autoRotate && !this.isDragging) {
      this.targetRotation.y += 0.005;
    }

    // Smooth spherical interpolation (LERP)
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.1;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.1;
    this.distance += (this.targetDistance - this.distance) * 0.1;

    this.updateCameraTransform();
  }

  updateCameraTransform() {
    const rx = this.currentRotation.x;
    const ry = this.currentRotation.y;
    const d = this.distance;

    this.camera.position.x = d * Math.cos(rx) * Math.sin(ry);
    this.camera.position.y = d * Math.sin(rx);
    this.camera.position.z = d * Math.cos(rx) * Math.cos(ry);

    this.camera.lookAt(0, 0, 0);
  }
}

