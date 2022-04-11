import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { initGUI } from './utils/gui';
import { BoxBufferGeometry, MeshPhongMaterial } from 'three';
import { RigidBody, World } from '@dimforge/rapier3d';

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
orbitControls.enablePan = true
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
const d = 35;
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

import('@dimforge/rapier3d').then(RAPIER => {

    function body(scene: THREE.Scene, world: World,
        type: 'cube' | 'sphere', dimension: any,
        translation: { x: number, y: number, z: number },
        rotation: { x: number, y: number, z: number, w: number },
        color: string): { rigid: RigidBody, mesh: THREE.Mesh } {
    
        let dynamic = RAPIER.RigidBodyDesc
            .dynamic()
            .setTranslation(translation.x, translation.y, translation.z)
            .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
    
        let dynamicBody = world.createRigidBody(dynamic);
    
        let dynamicCollider;
        if (type === 'cube') {
            dynamicCollider = RAPIER.ColliderDesc.cuboid(dimension.hx, dimension.hy, dimension.hz);
        } else if (type === 'sphere') {
            dynamicCollider = RAPIER.ColliderDesc.ball(dimension.radius);
        }
        world.createCollider(dynamicCollider, dynamicBody.handle);
    
        let bufferGeometry;
        if (type === 'cube') {
            bufferGeometry = new BoxBufferGeometry(dimension.hx * 2, dimension.hy * 2, dimension.hz * 2);
        } else if (type === 'sphere') {
            bufferGeometry = new THREE.SphereBufferGeometry(dimension.radius, 32, 32);
        }
    
        const threeMesh = new THREE.Mesh(bufferGeometry, new MeshPhongMaterial({ color: color }));
        threeMesh.castShadow = true;
        threeMesh.receiveShadow = true;
        scene.add(threeMesh);
    
        return { rigid: dynamicBody, mesh: threeMesh };
    }

    // Use the RAPIER module here.
    let gravity = { x: 0.0, y: -9.81, z: 0.0 };
    let world = new RAPIER.World(gravity);

    // Bodys
    const bodys: { rigid: RigidBody, mesh: THREE.Mesh }[] = []

    // Create Ground.
    let nsubdivs = 20;
    let scale = new RAPIER.Vector3(70.0, 3.0, 70.0);
    let heights: number[] = []

    const threeFloor = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(scale.x, scale.z, nsubdivs, nsubdivs),
        new THREE.MeshPhongMaterial({ color: 'green' }));
    threeFloor.rotateX(- Math.PI / 2);
    threeFloor.receiveShadow = true;
    threeFloor.castShadow = true;
    scene.add(threeFloor);

    const vertices = threeFloor.geometry.attributes.position.array;
    const dx = scale.x / nsubdivs;
    const dy = scale.z / nsubdivs;
    const columsRows = new Map();
    for (let i = 0; i < vertices.length; i += 3) {

        let x = Math.abs((vertices as any)[i] + (scale.x / 2));
        x = Math.floor(x / dx);
        let y = Math.abs((vertices as any)[i + 1] - (scale.z / 2));
        y = Math.floor(y / dy);
        const rng = Math.random();
        // console.log(`${heights[ Math.floor((x/dx)) * nsubdivs +  Math.floor((y/dy))]}`);
        // j + 2 because it is the z component that we modify
        (vertices as any)[i + 2] = scale.y * rng;

        if (!columsRows.get(y)) {
            columsRows.set(y, new Map());
        }
        columsRows.get(y).set(x, rng);
    }
    console.log(columsRows)
    let i, j;
    for (i = 0; i <= nsubdivs; ++i) {
        for (j = 0; j <= nsubdivs; ++j) {
            console.log(`${i} - ${j}`)
            heights.push(columsRows.get(j).get(i));
        }
    }
    threeFloor.geometry.computeVertexNormals();

    let groundBodyDesc = RAPIER.RigidBodyDesc.fixed();
    let groundBody = world.createRigidBody(groundBodyDesc);
    let groundCollider = RAPIER.ColliderDesc.heightfield(nsubdivs, nsubdivs, new Float32Array(heights), scale);
    world.createCollider(groundCollider, groundBody.handle);


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
    const cubeBody = body(scene, world, 'cube', cube.dimension, cube.translation, cube.rotation, 'orange');
    bodys.push(cubeBody);

    // kinematic body
    const ball = {
        dimension: {
            radius: 0.5
        },
        translation: {
            x: 4,
            y: 5,
            z: 2
        },
        rotation: {
            x: 0,
            y: 1,
            z: 0,
            w: 0
        }
    }
    const sphereBody = body(scene, world, 'sphere', ball.dimension, ball.translation,
        ball.rotation, 'blue');
    bodys.push(sphereBody);

    // Game loop. Replace by your own game loop system.
    let gameLoop = () => {
        // Ste the simulation forward.  
        world.step();

        // update 3d world with physical world
        bodys.forEach(body => {
            let position = body.rigid.translation();
            let rotation = body.rigid.rotation();

            body.mesh.position.x = position.x
            body.mesh.position.y = position.y
            body.mesh.position.z = position.z

            body.mesh.setRotationFromQuaternion(
                new THREE.Quaternion(rotation.x,
                    rotation.y,
                    rotation.z,
                    rotation.w));
        });

        orbitControls.update()
        renderer.render(scene, camera);

        setTimeout(gameLoop, 16);
    };

    gameLoop();

    window.addEventListener('click', event => {
        // cubeBody.rigid.applyImpulse({ x: 0, y: 3, z: 1 }, true);
        // sphereBody.rigid.applyImpulse({ x: 0, y: 2, z: -0.4 }, true);
    })
})