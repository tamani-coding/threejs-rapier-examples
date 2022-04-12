import { Ray, RigidBody, World } from '@dimforge/rapier3d';
import * as THREE from 'three';
import { AmbientLight, BoxBufferGeometry, MeshPhongMaterial } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

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

const dLight = new THREE.DirectionalLight('white', 0.6);
dLight.position.x = 20;
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

const aLight = new THREE.AmbientLight('white', 0.4);
scene.add(aLight);

// ANIMATE
document.body.appendChild(renderer.domElement);

// RESIZE HANDLER
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

function loadTexture(path: string): THREE.Texture {
    const texture = new THREE.TextureLoader().load(path);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.x = 10;
    texture.repeat.y = 10;
    return texture;
}

import('@dimforge/rapier3d').then(RAPIER => {

    function body(scene: THREE.Scene, world: World,
        bodyType: 'dynamic' | 'kinematicPositionBased',
        colliderType: 'cube' | 'sphere', dimension: any,
        translation: { x: number, y: number, z: number },
        rotation: { x: number, y: number, z: number, w: number },
        color: string): { rigid: RigidBody, mesh: THREE.Mesh } {

        let bodyDesc

        if (bodyType === 'dynamic') {
            bodyDesc = RAPIER.RigidBodyDesc.dynamic();
        } else if (bodyType === 'kinematicPositionBased') {
            bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
        }
        bodyDesc.setTranslation(translation.x, translation.y, translation.z)
            .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w })
            .setCanSleep(false);


        let rigidBody = world.createRigidBody(bodyDesc);

        let dynamicCollider;
        if (colliderType === 'cube') {
            dynamicCollider = RAPIER.ColliderDesc.cuboid(dimension.hx, dimension.hy, dimension.hz);
        } else if (colliderType === 'sphere') {
            dynamicCollider = RAPIER.ColliderDesc.ball(dimension.radius);
        }
        world.createCollider(dynamicCollider, rigidBody.handle);

        let bufferGeometry;
        if (colliderType === 'cube') {
            bufferGeometry = new BoxBufferGeometry(dimension.hx * 2, dimension.hy * 2, dimension.hz * 2);
        } else if (colliderType === 'sphere') {
            bufferGeometry = new THREE.SphereBufferGeometry(dimension.radius, 32, 32);
        }

        const threeMesh = new THREE.Mesh(bufferGeometry, new MeshPhongMaterial({ color: color }));
        threeMesh.castShadow = true;
        threeMesh.receiveShadow = true;
        scene.add(threeMesh);

        return { rigid: rigidBody, mesh: threeMesh };
    }

    function generateGround() {
        let nsubdivs = 20;
        let scale = new RAPIER.Vector3(70.0, 2.0, 70.0);
        let heights: number[] = []
    
        // three plane
        const threeFloor = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(scale.x, scale.z, nsubdivs, nsubdivs),
            new THREE.MeshStandardMaterial({
                 map: loadTexture('/textures/grass/Grass_005_BaseColor.jpg'),
                 normalMap: loadTexture('/textures/grass/Grass_005_Normal.jpg'),
                 aoMap: loadTexture('/textures/grass/Grass_005_AmbientOcclusion.jpg'),
                 roughnessMap: loadTexture('/textures/grass/Grass_005_Roughness.jpg'),
                 roughness: 0.6
            }));
        threeFloor.rotateX(- Math.PI / 2);
        threeFloor.receiveShadow = true;
        threeFloor.castShadow = true;
        scene.add(threeFloor);
    
        // add height data to plane
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
        threeFloor.geometry.computeVertexNormals();
        // store height data into column-major-order matrix array
        let i, j;
        for (i = 0; i <= nsubdivs; ++i) {
            for (j = 0; j <= nsubdivs; ++j) {
                heights.push(columsRows.get(j).get(i));
            }
        }
    
        let groundBodyDesc = RAPIER.RigidBodyDesc.fixed();
        let groundBody = world.createRigidBody(groundBodyDesc);
        let groundCollider = RAPIER.ColliderDesc.heightfield(
            nsubdivs, nsubdivs, new Float32Array(heights), scale
        );
        world.createCollider(groundCollider, groundBody.handle);
    }

    // Use the RAPIER module here.
    let gravity = { x: 0.0, y: -9.81, z: 0.0 };
    let world = new RAPIER.World(gravity);

    // Bodys
    const bodys: { rigid: RigidBody, mesh: THREE.Mesh }[] = []

    // Create Ground.
    generateGround();

    const cubeBody = body(scene, world, 'dynamic', 'cube',
        { hx: 0.5, hy: 0.5, hz: 0.5 }, { x: 0, y: 7, z: 0 },
        { x: 0, y: 0.4, z: 0.7, w: 1.0 }, 'orange');
    bodys.push(cubeBody);

    const sphereBody = body(scene, world, 'dynamic', 'sphere',
        { radius: 0.7 }, { x: 4, y: 5, z: 2 },
        { x: 0, y: 1, z: 0, w: 0 }, 'blue');
    bodys.push(sphereBody);

    const kinematicSphere = body(scene, world, 'kinematicPositionBased', 'sphere',
        { radius: 0.7 }, { x: 0, y: 5, z: 0 },
        { x: 0, y: 1, z: 0, w: 0 }, 'red');
    bodys.push(kinematicSphere);

    const ray = new RAPIER.Ray( 
        { x: 0, y: 0, z: 0 },
        { x: 0, y: -1, z: 0} 
    );

    const clock = new THREE.Clock();
    // Game loop. Replace by your own game loop system.
    let gameLoop = () => {
        let deltaTime = clock.getDelta();
        move(world, ray, kinematicSphere.rigid, deltaTime);

        // Step the simulation forward.  
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


const keysPressed: any = {}
document.addEventListener('keydown', (event) => {
    keysPressed[event.key.toLowerCase()] = true
}, false);
document.addEventListener('keyup', (event) => {
    keysPressed[event.key.toLowerCase()] = false
}, false);


const rotateYAxis = new THREE.Vector3(0, 1, 0);
const walkDirection  = new THREE.Vector3();
const rotateWalkDirection = new THREE.Quaternion();
const MOVEMENT_SPEED_PER_SECOND = 4;
function move(world: World, ray: Ray, rigid: RigidBody, delta: number) {
    const w = keysPressed['w'];
    const a = keysPressed['a'];
    const s = keysPressed['s'];
    const d = keysPressed['d'];

    walkDirection.x = 0;
    walkDirection.y = 0;
    walkDirection.z = 0;

    if (w || a || s || d) {
        const offset = directionOffset(w,a,s,d);
        camera.getWorldDirection(walkDirection );
        walkDirection.y = 0;
        rotateWalkDirection.setFromAxisAngle(rotateYAxis, offset);
        walkDirection.applyQuaternion(rotateWalkDirection);
    }
    
    const translation = rigid.translation();

    walkDirection.normalize();
    walkDirection.multiplyScalar(MOVEMENT_SPEED_PER_SECOND * delta);

    ray.origin.x = translation.x
    ray.origin.y = translation.y
    ray.origin.z = translation.z
    let hit = world.castRay(ray, 0.6, false, 0xfffffffff);
    if (!hit) {
        walkDirection.y += -9.81 * delta
    } else {
        const point = ray.pointAt(hit.toi);
        const up = ray.origin.y - point.y - 0.5;
        if (up > 0.2 || up < 0) {
            walkDirection.y += Math.abs(up)
        }
    }

    rigid.setNextKinematicTranslation( { 
        x: translation.x + walkDirection.x, 
        y: translation.y + walkDirection.y, 
        z: translation.z + walkDirection.z 
    });
}

function directionOffset(w: boolean, a: boolean, s: boolean, d: boolean): number {
    var directionOffset = 0 // w

    if (w) {
        if (a) {
            directionOffset = Math.PI / 4 // w+a
        } else if (d) {
            directionOffset = - Math.PI / 4 // w+d
        }
    } else if (s) {
        if (a) {
            directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
        } else if (d) {
            directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
        } else {
            directionOffset = Math.PI // s
        }
    } else if (a) {
        directionOffset = Math.PI / 2 // a
    } else if (d) {
        directionOffset = - Math.PI / 2 // d
    }

    return directionOffset
}