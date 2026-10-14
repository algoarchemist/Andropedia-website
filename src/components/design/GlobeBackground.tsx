"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function GlobeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 3.2;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "low-power" });
    // A faint wireframe does not need a full-resolution canvas: drawing it at 3/4 size and letting the browser scale it keeps the
    // hero scrolling smoothly on weaker GPUs. (setSize is called with updateStyle=false so the canvas still fills its box.)
    const SCALE = 0.75;
    renderer.setPixelRatio(1);
    const resize = (w: number, h: number) => {
      renderer.setSize(Math.max(1, Math.round(w * SCALE)), Math.max(1, Math.round(h * SCALE)), false);
      camera.aspect = w / h;
      // Portrait screens: back the camera off until the whole globe (radius 1.4 plus a margin) fits across the width.
      camera.position.z = Math.max(3.2, 1.65 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
      camera.updateProjectionMatrix();
    };
    resize(container.clientWidth, container.clientHeight);

    // Globe Container Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Wireframe Globe Sphere
    const sphereGeo = new THREE.SphereGeometry(1.4, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x0066ff,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const globe = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(globe);

    // Global Network Nodes & Connection Points
    const particleCount = 150;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.42; // Positioned right on the wireframe boundary

      particlePos[i] = r * Math.sin(phi) * Math.cos(theta);
      particlePos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePos[i + 2] = r * Math.cos(phi);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.035,
      transparent: true,
      opacity: 0.9
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    globeGroup.add(particles);

    // Draw only while the hero is on screen and the tab is visible, and at most ~30 times a second: the globe turns very slowly, and
    // a full-screen WebGL canvas drawn at 60 fps (even after scrolling past the hero) was what dragged the whole page down.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrameId = 0;
    let onScreen = true;
    let last = 0;
    function frame(now: number) {
      animationFrameId = 0;
      if (!onScreen || document.hidden) return;
      animationFrameId = requestAnimationFrame(frame);
      if (now - last < 33) return;
      const dt = Math.min(3, (now - last) / 16.7);
      last = now;
      if (!reduceMotion) {
        globeGroup.rotation.y += 0.0018 * dt;
        globeGroup.rotation.x += 0.0004 * dt;
      }
      renderer.render(scene, camera);
    }
    const start = () => {
      if (!animationFrameId && onScreen && !document.hidden) animationFrameId = requestAnimationFrame(frame);
    };
    start();

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
    });
    io.observe(container);
    document.addEventListener("visibilitychange", start);

    // Handle resizing dynamically based on the container
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) resize(width, height);
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", start);
      cancelAnimationFrame(animationFrameId);
      
      // Cleanup Three.js resources
      sphereGeo.dispose();
      sphereMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden" 
      style={{ background: "transparent" }}
    >
      <canvas ref={canvasRef} className="h-full w-full block" aria-hidden="true" />
    </div>
  );
}
