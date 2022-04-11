import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { initGUI } from './utils/gui';
import { BoxBufferGeometry, MeshPhongMaterial } from 'three';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 5;
camera.position.z = 10;
camera.position.x = -13;

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true

// ORBIT CAMERA CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true
orbitControls.minDistance = 10
orbitControls.maxDistance = 30
// orbitControls.maxPolarAngle = Math.PI / 2 - 0.05 // prevent camera below ground
// orbitControls.minPolarAngle = Math.PI / 4        // prevent top down view
orbitControls.update();

const dLight = new THREE.DirectionalLight();
dLight.position.x = 10;
dLight.position.y = 30;
dLight.castShadow = true;
dLight.shadow.mapSize.width = 4096;
dLight.shadow.mapSize.height = 4096;
const d = 25;
dLight.shadow.camera.left = - d;
dLight.shadow.camera.right = d;
dLight.shadow.camera.top = d;
dLight.shadow.camera.bottom = - d;
scene.add(dLight);
const helper = new THREE.CameraHelper(dLight.shadow.camera);
scene.add(helper);

// ANIMATE
document.body.appendChild(renderer.domElement);

// RESIZE HANDLER
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

function generateHeightfield(nsubdivs: number) {
    let heights = [];

    let i, j;
    for (i = 0; i <= nsubdivs; ++i) {
        for (j = 0; j <= nsubdivs; ++j) {
            heights.push(Math.random());
        }
    }

    return heights;
}

import('@dimforge/rapier3d').then(RAPIER => {
    // Use the RAPIER module here.
    let gravity = { x: 0.0, y: -9.81, z: 0.0 };
    let world = new RAPIER.World(gravity);

    // Create Ground.
    let nsubdivs = 20;
    let scale = new RAPIER.Vector3(70.0, 2.0, 70.0);
    let bodyDesc = RAPIER.RigidBodyDesc.fixed();
    let body = world.createRigidBody(bodyDesc);
    let heights = generateHeightfield(nsubdivs)
    let groundColliderDesc = RAPIER.ColliderDesc.heightfield(nsubdivs, nsubdivs, new Float32Array(heights), scale);
    world.createCollider(groundColliderDesc, body.handle);
    const threeFloor = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(scale.x, scale.z, nsubdivs, nsubdivs),
        new THREE.MeshPhongMaterial( {color: 'green'} ));
    threeFloor.rotateX( - Math.PI / 2 );
    threeFloor.receiveShadow = true;
    scene.add(threeFloor);


    // Create a dynamic rigid-body.
    const cube = {
        dimension: {
            hx: 0.5,
            hy: 0.5,
            hz: 0.5
        },
        translation: {
            x: 0,
            y: 5,
            z: 0
        },
        rotation: {
            x: 0,
            y: 0.4,
            z: 0.7,
            w: 1.0
        }
    }
    let rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(cube.translation.x, cube.translation.y, cube.translation.z)
        .setRotation({ x: cube.rotation.x, y: cube.rotation.y, z: cube.rotation.z, w: cube.rotation.w });
    let rigidBody = world.createRigidBody(rigidBodyDesc);
    // Create a cuboid collider attached to the dynamic rigidBody.
    let colliderDesc = RAPIER.ColliderDesc.cuboid(cube.dimension.hx, cube.dimension.hy, cube.dimension.hz);
    let collider = world.createCollider(colliderDesc, rigidBody.handle);
    const threeBox = new THREE.Mesh(
        new BoxBufferGeometry(cube.dimension.hx * 2, cube.dimension.hy * 2, cube.dimension.hz * 2),
        new MeshPhongMaterial({ color: 'orange' })
    );
    threeBox.castShadow = true
    scene.add(threeBox);

    // Game loop. Replace by your own game loop system.
    let gameLoop = () => {
        // Ste the simulation forward.  
        world.step();

        // Get and print the rigid-body's position.
        let position = rigidBody.translation();
        let rotation = rigidBody.rotation();
        threeBox.position.x = position.x
        threeBox.position.y = position.y
        threeBox.position.z = position.z
        threeBox.setRotationFromQuaternion(
            new THREE.Quaternion(rigidBody.rotation().x,
                rotation.y,
                rotation.z,
                rotation.w));

        orbitControls.update()
        renderer.render(scene, camera);

        setTimeout(gameLoop, 16);
    };

    gameLoop();

    window.addEventListener('click', event => {
        console.log('click')
        rigidBody.applyImpulse({ x: 0.01, y: 3, z: -0.08 }, true);
    })
})