import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import('@dimforge/rapier3d').then(RAPIER => {

  createFloor();
  createBox();
  createSphere();
  createCylinder();

  animate();
})

// CAMERA
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 1500);
camera.position.set(-35, 70, 100);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// RENDERER
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// SCENE
const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfd1e5);

// CONTROLS 

const controls = new OrbitControls(camera, renderer.domElement);

export function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

var clock: THREE.Clock = new THREE.Clock();

export function animate() {

  let deltaTime = clock.getDelta();
  // updatePhysics(deltaTime);
  // dragObject();
  // resetBodys();

  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.1)
hemiLight.color.setHSL(0.6, 0.6, 0.6);
hemiLight.groundColor.setHSL(0.1, 1, 0.4);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight)

let dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.color.setHSL(0.1, 1, 0.95);
dirLight.position.set(-1, 1.75, 1);
dirLight.position.multiplyScalar(100);
scene.add(dirLight);

dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
let d = 50;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.camera.far = 13500;

function createFloor() {
  let pos = { x: 0, y: -1, z: 0 };
  let scale = { x: 100, y: 2, z: 100 };
  let quat = { x: 0, y: 0, z: 0, w: 1 };
  let mass = 0;

  let blockPlane = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({ color: 0xf9c834 }));
  blockPlane.position.set(pos.x, pos.y, pos.z);
  blockPlane.scale.set(scale.x, scale.y, scale.z);
  blockPlane.castShadow = true;
  blockPlane.receiveShadow = true;
  scene.add(blockPlane)
}

function createBox() {
  let pos = { x: -10, y: 6, z: 0 }
  let scale = { x: 6, y: 6, z: 6 }

  let box = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({ color: 0xDC143C }));
  box.position.set(pos.x, pos.y, pos.z);
  box.scale.set(scale.x, scale.y, scale.z);
  box.castShadow = true;
  box.receiveShadow = true;
  scene.add(box);
}

function createSphere() {
  let pos = { x: 10, y: 6, z: 0 };
  let radius = 4;

  let sphere = new THREE.Mesh(new THREE.SphereBufferGeometry(radius, 32, 32), new THREE.MeshPhongMaterial({ color: 0x43a1f4 }))
  sphere.position.set(pos.x, pos.y, pos.z)
  sphere.castShadow = true
  sphere.receiveShadow = true
  scene.add(sphere)
}

function createCylinder() {
  let pos = { x: -25, y: 6, z: 0 };
  let radius = 4;
  let height = 6
  let quat = { x: 0, y: 0, z: 0, w: 1 };
  let mass = 1;

  let cylinder = new THREE.Mesh(new THREE.CylinderBufferGeometry(radius, radius, height, 32), new THREE.MeshPhongMaterial({ color: 0x90ee90 }))
  cylinder.position.set(pos.x, pos.y, pos.z)
  cylinder.castShadow = true
  cylinder.receiveShadow = true
  scene.add(cylinder)

}


// function updatePhysics(deltaTime: number) {

//   // Step world
//   physicsWorld.stepSimulation(deltaTime, 10);

//     // Update rigid bodies
//     for (let i = 0; i < rigidBodies.length; i++) {
//       let objThree = rigidBodies[i];
//       let objAmmo = objThree.userData.physicsBody as Ammo.btRigidBody;
//       let ms = objAmmo.getMotionState() as Ammo.btDefaultMotionState;
//       if (ms) {
//         ms.getWorldTransform(tmpTrans);
//         let p = tmpTrans.getOrigin();
//         let q = tmpTrans.getRotation();
//         objThree.position.set(p.x(), p.y(), p.z());
//         objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
//       }
//     }
// }

// function dragObject () {
//   if (draggable != null) {
//     let physicsBody = draggable.userData.physicsBody as Ammo.btRigidBody;
//     let currentPosition = draggable.position;

//     const found = intersect(moveMouse);

//     if (found.length > 0) {
//       for (let i = 0; i < found.length; i++) {
//         if (found[i].object.userData.draggable)
//           continue
        
//         let target = found[i].point;
//         target.y = 10;
//         target = target.sub(currentPosition);
  
//         resultantImpulse.setX(target.x)
//         resultantImpulse.setY(target.y)
//         resultantImpulse.setZ(target.z)
//         physicsBody.setLinearVelocity(resultantImpulse);

//         break;
//       }
//     }
//   }
// }

// function resetBodys () {
//   for (let i = 0; i < rigidBodies.length; i++) {
//     let objThree = rigidBodies[i];
//     let objAmmo = objThree.userData.physicsBody as Ammo.btRigidBody;

//     if (objThree.position.y < -10) {
//       // RESET OBJECT
//       objThree.position.set(0, 4, 0);
//       let transform = new Ammo.btTransform();
//       transform.setIdentity();
//       transform.setOrigin(new Ammo.btVector3(0, 4, 0));
//       transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));
//       objAmmo.setWorldTransform(transform);
//       objAmmo.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
//     }
//   }
// }

const raycaster = new THREE.Raycaster(); // create once
const clickMouse = new THREE.Vector2(); // create once
const moveMouse = new THREE.Vector2(); // create once
var draggable: THREE.Object3D;

function intersect(pos: THREE.Vector2) {
  // update the picking ray with the camera and mouse position
  raycaster.setFromCamera(pos, camera);

  return raycaster.intersectObjects(scene.children);
}

window.addEventListener('click', event => {
  if (draggable != null) {
    draggable = null as any
    return;
  }

  // THREE RAYCASTER
  clickMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  clickMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  const found = intersect(clickMouse);
  if (found.length > 0) {
    if (found[0].object.userData.draggable && found[0].object.userData.draggable == true) {
      draggable = found[0].object
    }
  }
});

window.addEventListener('mousemove', event => {
  moveMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  moveMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});