import * as THREE from 'three';
import { gsap } from 'gsap';

import * as dat from 'dat.gui';

let time = 0;
let move = 0;

const camera = new THREE.PerspectiveCamera(50, 2, 1, 1000);
camera.position.z = 1000;

const scene = new THREE.Scene();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const point = new THREE.Vector2();

const textures = [
  new THREE.TextureLoader().load('./assets/images/Illus.png'),
  new THREE.TextureLoader().load('./assets/images/Illus.png'),
];

const maskTexture = new THREE.TextureLoader().load(
  '../assets/images/particle_mask.jpg'
);

const geometry = new THREE.BufferGeometry();
const material = new THREE.ShaderMaterial({
  fragmentShader: `
  uniform float time;
  uniform float progress;
  uniform sampler2D texture1;
  uniform vec4 resolution;
  varying vec2 vUv;
  varying vec3 vPosition;
  float PI = 3.141592653589793238;
  varying float vRand;
  uniform vec3 palette[5];
  
  uniform sampler2D t1;
  uniform sampler2D t2;
  uniform sampler2D mask;
  varying vec3 vPos;
  
  varying vec2 vCoordinates;
  
  uniform float move;
  void main() {
    vec4 maskTexture = texture2D(mask, gl_PointCoord);
    vec2 myUV = vec2(vCoordinates.x / 512., vCoordinates.y / 512.);
  
    vec4 tt1 = texture2D(t1, myUV);
    vec4 tt2 = texture2D(t2, myUV);
  
    vec4 final = mix(tt1, tt2, smoothstep(0., 1., fract(move)));
  
  
    float alpha = 1. - clamp(0., 1., abs(vPos.z / 900.));
    gl_FragColor = final;
    gl_FragColor.a *= maskTexture.r * alpha;
  }
  `,
  vertexShader: `
  varying vec2 vUv1;
  varying vec3 vPosition;
  varying vec3 vPos;
  
  varying vec2 vUv;
  varying vec2 vCoordinates;
  attribute vec3 aCoordinates;
  attribute float aSpeed;
  attribute float aOffset;
  attribute float aDirection;
  attribute float aPress;
  
  uniform sampler2D texture1;
  uniform sampler2D texture2;
  uniform vec2 pixels;
  uniform vec2 uvRate1;
  
  attribute float rands;
  varying float vRand;
  float PI = 3.141592653589793238;
  
  uniform float move;
  uniform float time;
  attribute float size;
  uniform vec2 mouse;
  uniform float mousePressed;
  uniform float transition;
  
  void main() {
    vUv = uv;
    vec3 pos = position;
  
    pos.x += sin(move * aSpeed) * 3.;
    pos.y += sin(move * aSpeed) * 3.;
    pos.z = mod(position.z + move * 20. * aSpeed + aOffset, 2000.) - 1000.;
  
    vec3 stable = position;
    float dist = distance(stable.xy, mouse);
    float area = 1. - smoothstep(0., 150., dist);
  
    stable.x += 50. * sin(0.1 * time * aPress) * aDirection * area * mousePressed ;
    stable.y += 50. * sin(0.1 * time * aPress) * aDirection * area * mousePressed;
    stable.z += 200. * cos(0.1 * time * aPress) * aDirection * area * mousePressed;
  
    pos = mix(pos, stable, transition);
  
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.);
    gl_PointSize = 2500. * (1. / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  
    vCoordinates = aCoordinates.xy;
    vPos = pos;
  }
  `,
  uniforms: {
    progress: { type: 'f', value: 0 },
    t1: { type: 't', value: textures[0] },
    t2: { type: 't', value: textures[1] },
    mask: { type: 't', value: maskTexture },
    mouse: { type: ' v2', value: null },
    move: { type: 'f', value: 0 },
    time: { type: 'f', value: 0 },
    mousePressed: { type: 'f', value: 0 },
    transition: { type: 'f', value: null },
  },

  side: THREE.DoubleSide,
  transparent: true,
  depthTest: false,
  depthWrite: false,
});

let number = 512 * 512;
let positions = new THREE.BufferAttribute(new Float32Array(number * 3), 3);
let coordinates = new THREE.BufferAttribute(new Float32Array(number * 3), 3);
let speeds = new THREE.BufferAttribute(new Float32Array(number), 1);
let offset = new THREE.BufferAttribute(new Float32Array(number), 1);
let direction = new THREE.BufferAttribute(new Float32Array(number), 1);
let press = new THREE.BufferAttribute(new Float32Array(number), 1);

function rand(a, b) {
  return a + (b - a) * Math.random();
}
let index = 0;
for (let i = 0; i < 512; i++) {
  let posX = i - 256;
  for (let j = 0; j < 512; j++) {
    positions.setXYZ(index, posX * 2, (j - 256) * 2, 0);
    coordinates.setXYZ(index, i, j, 0);
    offset.setX(index, rand(-1000, 1000));
    speeds.setX(index, rand(0.4, 1));
    direction.setX(index, Math.random() > 0.5 ? 1 : -1);
    press.setX(index, rand(0.4, 1));
    index++;
  }
}
geometry.setAttribute('position', positions);
geometry.setAttribute('aCoordinates', coordinates);
geometry.setAttribute('aSpeed', speeds);
geometry.setAttribute('aOffset', offset);
geometry.setAttribute('aDirection', direction);
geometry.setAttribute('aPress', press);
const mesh = new THREE.Points(geometry, material);
scene.add(mesh);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});
// renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);

function resizeCanvasToDisplaySize() {
  const canvas = renderer.domElement;
  // look up the size the canvas is being displayed
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // adjust displayBuffer size to match
  if (canvas.width !== width || canvas.height !== height) {
    // you must pass false here or three.js sadly fights the browser
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // update any render target sizes here
  }
}

let fish = new THREE.Mesh(
  new THREE.PlaneGeometry(2000, 2000),
  new THREE.MeshBasicMaterial({
    color: 0xffffff,
  })
);
function mouseEffects() {
  renderer.domElement.addEventListener('mouseover', (e) => {
    gsap.to(material.uniforms.mousePressed, {
      duration: 1,
      value: 1,
      ease: 'power4.out',
    });
  });
  renderer.domElement.addEventListener('mouseout', (e) => {
    gsap.to(material.uniforms.mousePressed, {
      duration: 1,
      value: 0,
      ease: 'power4.out',
    });
  });
  renderer.domElement.addEventListener(
    'mousemove',
    (e) => {
      mouse.x = (e.clientX / renderer.domElement.clientWidth) * 1.5 - 2.25;
      mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1.25;
      raycaster.setFromCamera(mouse, camera);
      let intersects = raycaster.intersectObjects([fish]);
      if (intersects[0]) {
        point.x = intersects[0]?.point.x;
        point.y = intersects[0]?.point.y;
      }
    },
    false
  );
}
mouseEffects();
renderer.setAnimationLoop(animation);
// animation

let gui;
let setting = {
  progress: 1,
};
function settings() {
  gui = new dat.GUI();
  gui.add(setting, 'progress', 0, 1, 0.01);
}

function animation() {
  time++;

  resizeCanvasToDisplaySize();

  let next = Math.floor(move + 40) % 2;
  let prev = (Math.floor(move) + 1 + 40) % 2;

  material.uniforms.t1.value = textures[prev];
  material.uniforms.t2.value = textures[next];

  material.uniforms.time.value = time;
  material.uniforms.move.value = move;
  material.uniforms.mouse.value = point;
  material.uniforms.transition.value = setting.progress;

  renderer.render(scene, camera);
}

export function init() {
  document.querySelector('.right').appendChild(renderer.domElement);
}
