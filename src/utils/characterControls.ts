import { Ray, RigidBody, World } from '@dimforge/rapier3d';
import * as THREE from 'three'
import { AnimationAction } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { A, D, DIRECTIONS, S, W } from './keydisplay'

export const CONTROLLER_BODY_RADIUS = 0.28;
const TIME_IN_AIR_THRESHOLD = 0.3
const RESPAWN_Y_THRESHOLD = -15

export interface AnimationKeys {
    idle: string,
    run: string,
    walk: string,
    startStandJump: string,
    runJump: string,
    fallIdle: string,
    fallLand: string
}

class AnimationState {

    public currentAction: THREE.AnimationAction
    public doJump = false

}

export class CharacterControls {

    animationKeys: AnimationKeys
        = { idle: 'Idle', walk: 'Walk', run: 'Run', startStandJump: null, runJump: null, fallIdle: null, fallLand: null };
    // mustFinish: string[] = []

    model: THREE.Group
    mixer: THREE.AnimationMixer
    animationsMap: Map<string, THREE.AnimationAction> = new Map() // Walk, Run, Idle
    orbitControl: OrbitControls
    camera: THREE.Camera

    // state
    toggleRun: boolean = true
    animationState = new AnimationState()
    startJumping = false;
    isGrounded = false;
    timeInAir = 0;
    playLand = false;

    // temporary data
    walkDirection = new THREE.Vector3()
    rotateAngle = new THREE.Vector3(0, 1, 0)
    rotateQuarternion: THREE.Quaternion = new THREE.Quaternion()
    cameraTarget = new THREE.Vector3()
    storedFall = 0

    // constants
    fadeDuration: number = 0.2
    runVelocity = 5
    walkVelocity = 2
    storedJumpVelocity = 0;

    ray: Ray
    rigidBody: RigidBody
    lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a;

    constructor(model: THREE.Group,
        mixer: THREE.AnimationMixer, animationsMap: Map<string, THREE.AnimationAction>,
        animationKeys: AnimationKeys,
        orbitControl: OrbitControls, camera: THREE.Camera,
        currentAction: string,
        ray: Ray, rigidBody: RigidBody) {

        this.animationKeys = animationKeys
        this.model = model
        this.mixer = mixer
        this.animationsMap = animationsMap
        this.animationState.currentAction = this.animationsMap.get(currentAction)
        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play()
            }
        })

        this.followUpAction([
            {
                first: this.animationsMap.get(this.animationKeys.fallLand),
                then: this.animationsMap.get(this.animationKeys.idle)
            }, {
                first: this.animationsMap.get(this.animationKeys.startStandJump),
                then: this.animationsMap.get(this.animationKeys.fallIdle)
            },
        ]);

        this.ray = ray
        this.rigidBody = rigidBody

        this.orbitControl = orbitControl
        this.camera = camera
        this.updateCameraTarget(new THREE.Vector3(0, 1, 5))
    }

    public switchRunToggle() {
        this.toggleRun = !this.toggleRun
    }

    public jump() {
        if (this.isGrounded && !this.animationState.doJump) {
            this.startJumping = true;
        }
    }

    public update(world: World, delta: number, keysPressed: any) {
        const directionPressed = DIRECTIONS.some(key => keysPressed[key] == true)

        var play = '';
        if (this.startJumping && !this.animationState.doJump) {
            play = this.animationKeys.startStandJump
            this.startJumping = false
        } else if (this.playLand) {
            this.playLand = false
            play = this.animationKeys.fallLand
        } else if (!this.isGrounded) {
            play = this.animationKeys.fallIdle
        } else if (directionPressed && this.toggleRun) {
            play = this.animationKeys.run
        } else if (directionPressed) {
            play = this.animationKeys.walk
        } else {
            play = this.animationKeys.idle
        }

        const currentClipName = this.animationState.currentAction.getClip().name
        const startingJump = currentClipName === this.animationKeys.startStandJump

        const isWalking = directionPressed && !this.toggleRun
        const isRunning = directionPressed && this.toggleRun
        const isMoving = !startingJump && (isWalking || isRunning)

        if (currentClipName != play && !startingJump && ( currentClipName !== this.animationKeys.fallLand  || isMoving )) {
            const toPlay = this.animationsMap.get(play)
            const current = this.animationsMap.get(currentClipName)
            this.playAnimation(current, toPlay, this.animationState, this.fadeDuration);
        }

        this.mixer.update(delta)

        this.walkDirection.x = this.walkDirection.y = this.walkDirection.z = 0

        let velocity = 0
        if (isMoving) {
            // calculate towards camera direction
            var angleYCameraDirection = Math.atan2(
                (this.camera.position.x - this.model.position.x),
                (this.camera.position.z - this.model.position.z))
            // diagonal movement angle offset
            var directionOffset = this.directionOffset(keysPressed)

            // rotate model
            this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset)
            this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2)

            // calculate direction
            this.camera.getWorldDirection(this.walkDirection)
            this.walkDirection.y = 0
            this.walkDirection.normalize()
            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset)

            // run/walk velocity
            velocity = isRunning ? this.runVelocity : this.walkVelocity
        }

        const translation = this.rigidBody.translation();
        if (translation.y < RESPAWN_Y_THRESHOLD) {
            // don't fall below ground
            this.rigidBody.setNextKinematicTranslation({
                x: 0,
                y: 10,
                z: 0
            });
        } else {
            const cameraPositionOffset = this.camera.position.sub(this.model.position);
            // update model and camera
            this.model.position.x = translation.x
            this.model.position.y = translation.y
            this.model.position.z = translation.z
            this.updateCameraTarget(cameraPositionOffset)

            if (this.animationState.doJump && this.isGrounded) {
                this.isGrounded = false;
                this.storedJumpVelocity = 8.0;
            }
            this.storedJumpVelocity = this.lerp(this.storedJumpVelocity, 0, 0.12)

            this.walkDirection.y += this.storedJumpVelocity * delta + this.lerp(this.storedFall, -9.81 * delta, 0.10)
            this.storedFall = this.walkDirection.y

            if (!this.animationState.doJump) {
                this.ray.origin.x = translation.x
                this.ray.origin.y = translation.y
                this.ray.origin.z = translation.z
                let hit = world.castRay(this.ray, 0.5, false, 0xfffffffff);
                if (hit) {
                    const point = this.ray.pointAt(hit.toi);
                    let diff = translation.y - (point.y + CONTROLLER_BODY_RADIUS);
                    if (diff < 0.0) {
                        this.walkDirection.y = this.lerp(0, Math.abs(diff), 0.5)
                        if (!this.isGrounded) {
                            this.playLand = true
                        }
                        this.isGrounded = true;
                        this.storedFall = 0
                        this.timeInAir = 0;
                    } else {
                        this.timeInAir += delta
                        if (this.timeInAir >= TIME_IN_AIR_THRESHOLD) {
                            this.isGrounded = false
                        }
                    }
                }
            }

            this.animationState.doJump = false;

            this.walkDirection.x = this.walkDirection.x * velocity * delta
            this.walkDirection.z = this.walkDirection.z * velocity * delta

            this.rigidBody.setNextKinematicTranslation({
                x: translation.x + this.walkDirection.x,
                y: translation.y + this.walkDirection.y,
                z: translation.z + this.walkDirection.z
            });
        }
    }

    private updateCameraTarget(offset: THREE.Vector3) {
        // move camera
        const rigidTranslation = this.rigidBody.translation();
        this.camera.position.x = rigidTranslation.x + offset.x
        this.camera.position.y = rigidTranslation.y + offset.y
        this.camera.position.z = rigidTranslation.z + offset.z

        // update camera target
        this.cameraTarget.x = rigidTranslation.x
        this.cameraTarget.y = rigidTranslation.y + 1
        this.cameraTarget.z = rigidTranslation.z
        this.orbitControl.target = this.cameraTarget
    }

    private directionOffset(keysPressed: any) {
        var directionOffset = 0 // w

        if (keysPressed[W]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4 // w+a
            } else if (keysPressed[D]) {
                directionOffset = - Math.PI / 4 // w+d
            }
        } else if (keysPressed[S]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
            } else if (keysPressed[D]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
            } else {
                directionOffset = Math.PI // s
            }
        } else if (keysPressed[A]) {
            directionOffset = Math.PI / 2 // a
        } else if (keysPressed[D]) {
            directionOffset = - Math.PI / 2 // d
        }

        return directionOffset
    }

    private followUpAction(chainedActions: { first: THREE.AnimationAction, then: AnimationAction }[]) {

        chainedActions.forEach(e => {
            e.first.clampWhenFinished = true
            e.first.setLoop(THREE.LoopOnce, 1)
            // this.mustFinish.push(e.first.getClip().name)
        });


        const playNext = this.playAnimation
        const animationState = this.animationState
        const fadeDuration = this.fadeDuration
        const animationKeys = this.animationKeys
        this.mixer.addEventListener('finished', function (e: THREE.Event) {
            const currentClipName = (e.action as THREE.AnimationAction).getClip().name;

            const index = chainedActions.findIndex(chained => {
                return chained.first.getClip().name === currentClipName
            })

            if (index >= 0) {
                const toPlay = chainedActions[index].then
                if (currentClipName === animationKeys.startStandJump) {
                    animationState.doJump = true
                }
                playNext((e.action as THREE.AnimationAction), toPlay, animationState, fadeDuration)
            }
        });
    }

    private playAnimation(previous: THREE.AnimationAction, 
        toPlay: THREE.AnimationAction, 
        animationState: AnimationState, 
        fadeDuration: number) {
        previous.fadeOut(fadeDuration)
        toPlay.reset().fadeIn(fadeDuration).play();
        animationState.currentAction = toPlay;
    }

}