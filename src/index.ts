import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { initGUI } from './utils/gui';
import { BoxBufferGeometry, MeshPhongMaterial } from 'three';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 3;
camera.position.z = 5;
camera.position.x = -3;

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
dLight.position.x = 3;
dLight.position.y = 10;
dLight.castShadow = true;
scene.add(dLight);

// ANIMATE
document.body.appendChild(renderer.domElement);

// RESIZE HANDLER
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);


function generateHeight(width: number, depth: number, minHeight: number, maxHeight: number) {

    // Generates the height data (a sinus wave)

    const size = width * depth;
    const data = new Float32Array(size);

    const hRange = maxHeight - minHeight;
    const w2 = width / 2;
    const d2 = depth / 2;
    const phaseMult = 12;

    let p = 0;

    for (let j = 0; j < depth; j++) {

        for (let i = 0; i < width; i++) {

            const radius = Math.sqrt(
                Math.pow((i - w2) / w2, 2.0) +
                Math.pow((j - d2) / d2, 2.0));

            const height = (Math.sin(radius * phaseMult) + 1) * 0.5 * hRange + minHeight;

            data[p] = height;

            p++;

        }

    }

    return data;

}
const terrainWidthExtents = 50;
const terrainDepthExtents = 50;
const terrainWidth = 128;
const terrainDepth = 128;
const terrainHalfWidth = terrainWidth / 2;
const terrainHalfDepth = terrainDepth / 2;
const terrainMaxHeight = 1;
const terrainMinHeight = -1;
const heightData = generateHeight(terrainWidth, terrainDepth, terrainMinHeight, terrainMaxHeight);
const heights: number[] = [];

const geometry = new THREE.PlaneGeometry(terrainWidthExtents, terrainDepthExtents, terrainWidth - 1, terrainDepth - 1);
geometry.rotateX(- Math.PI / 2);
const vertices = geometry.attributes.position.array;
for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
    // j + 1 because it is the y component that we modify
    (vertices as any)[j + 1] = heightData[i];
    heights.push(heightData[i])
}
geometry.computeVertexNormals();
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xC7C7C7 });
const terrainMesh = new THREE.Mesh(geometry, groundMaterial);
terrainMesh.receiveShadow = true;
terrainMesh.castShadow = true;
scene.add(terrainMesh);


import('@dimforge/rapier3d').then(RAPIER => {
    // Use the RAPIER module here.
    let gravity = { x: 0.0, y: -9.81, z: 0.0 };
    let world = new RAPIER.World(gravity);

    // Create the ground
    const floor = {
        dimension: {
            hx: 10,
            hy: 0.1,
            hz: 10
        },
        translation: {
            x: 0,
            y: -1,
            z: 0
        }
    }
    let groundColliderDesc = RAPIER.ColliderDesc
        .cuboid(floor.dimension.hx, floor.dimension.hy, floor.dimension.hz)
        .setTranslation(floor.translation.x, floor.translation.y, floor.translation.z);
    world.createCollider(groundColliderDesc);
    const threeGround = new THREE.Mesh(
        new BoxBufferGeometry(floor.dimension.hx * 2, floor.dimension.hy * 2, floor.dimension.hz * 2),
        new MeshPhongMaterial({ color: 'green' }));
    threeGround.position.x = floor.translation.x;
    threeGround.position.y = floor.translation.y;
    threeGround.position.z = floor.translation.z;
    threeGround.receiveShadow = true;
    scene.add(threeGround);


    let bodyDesc = RAPIER.RigidBodyDesc.fixed();
    bodyDesc.translation.x = 0;
    bodyDesc.translation.y = -6;
    bodyDesc.translation.z = 0;
    let body = world.createRigidBody(bodyDesc);
    //height field
    // const heightField = RAPIER
    //     .ColliderDesc
    //     .heightfield(terrainWidth,
    //         terrainDepth,
    //         new Float32Array(heights),
    //         { x: terrainWidthExtents, y: terrainDepthExtents, z: terrainMaxHeight - terrainMinHeight })
    // world.createCollider(heightField, body.handle);

    // Create a dynamic rigid-body.
    const cube = {
        dimension: {
            hx: 0.5,
            hy: 0.5,
            hz: 0.5
        },
        translation: {
            x: 0,
            y: 2,
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