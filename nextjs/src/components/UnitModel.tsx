"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import type { AnimationClip, Group } from "three";
import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

type UnitModelProps = React.ComponentProps<"group"> & {
    modelUrl: string;
    animationUrl?: string;
    playClip?: string;
    scaleFactor?: number;
    fitXZSize?: number;
    centerXZ?: boolean;
    frustumCulled?: boolean;
};

export default function UnitModel({ modelUrl, animationUrl, playClip, scaleFactor = 0.01, fitXZSize, centerXZ = true, frustumCulled = true, ...groupProps }: UnitModelProps) {
    const group = useRef<Group>(null);
    const base = useGLTF(modelUrl);
    const [extraAnimations, setExtraAnimations] = useState<AnimationClip[]>([]);
    const [computedScale, setComputedScale] = useState<number | null>(null);
    const [yOffset, setYOffset] = useState<number>(0);
    const [xzOffset, setXZOffset] = useState<{ x: number; z: number }>({ x: 0, z: 0 });

    // Memoized clone supports skinned meshes and independent animations per instance
    const clonedScene = useMemo(() => skeletonClone(base.scene), [base.scene]);

    useEffect(() => {
        let cancelled = false;
        if (!animationUrl) {
            setExtraAnimations([]);
            return () => { };
        }
        const loader = new GLTFLoader();
        loader.load(
            animationUrl,
            (gltf) => {
                if (!cancelled) setExtraAnimations(gltf.animations ?? []);
            },
            undefined,
            () => {
                if (!cancelled) setExtraAnimations([]);
            }
        );
        return () => {
            cancelled = true;
        };
    }, [animationUrl]);

    const animations = useMemo(() => {
        return [...(base.animations ?? []), ...extraAnimations];
    }, [base.animations, extraAnimations]);
    const { actions, names } = useAnimations(animations, group);

    useEffect(() => {
        if (!actions) return;
        const clipName = playClip && actions[playClip] ? playClip : names[0];
        if (!clipName) return;
        const action = actions[clipName];
        action?.reset().fadeIn(0.2).play();
        return () => {
            action?.fadeOut(0.2);
            action?.stop();
        };
    }, [actions, names, playClip]);

    // Fit model and align to ground and center horizontally
    useEffect(() => {
        const box = new Box3().setFromObject(base.scene);
        const size = new Vector3();
        box.getSize(size);
        const center = new Vector3();
        box.getCenter(center);

        const maxXZ = Math.max(size.x, size.z) || 1;
        const minScale = 0.005;
        const desiredScale = fitXZSize ? fitXZSize / maxXZ : scaleFactor;
        const clampedScale = Math.max(desiredScale, minScale);
        setComputedScale(fitXZSize ? clampedScale : null);

        // Y: move base to ground
        const minY = box.min.y;
        setYOffset(-minY * clampedScale);

        // XZ: center horizontally
        if (centerXZ) {
            setXZOffset({ x: -center.x * clampedScale, z: -center.z * clampedScale });
        } else {
            setXZOffset({ x: 0, z: 0 });
        }
    }, [base.scene, fitXZSize, scaleFactor, centerXZ]);

    const scaleToApply = computedScale ?? scaleFactor;

    return (
        <group {...groupProps} ref={group}>
            <group position={[xzOffset.x, yOffset, xzOffset.z]}>
                <primitive object={clonedScene} scale={scaleToApply} frustumCulled={frustumCulled} />
            </group>
        </group>
    );
}

useGLTF.preload("/models/Frog.gltf");
useGLTF.preload("/models/Animations/Frog_Idle.gltf");
useGLTF.preload("/models/rock2.glb");
useGLTF.preload("/models/rock3.glb");
useGLTF.preload("/models/reeds.gltf");


