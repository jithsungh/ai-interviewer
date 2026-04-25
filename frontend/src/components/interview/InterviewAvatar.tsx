import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, useAnimations, useFBX, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { getAllVisemeTargets, getVisemeFromWord, visemeMap } from '@/components/interview/visemeMapper';
import { INTERVIEW_AVATAR_CATALOG } from '@/types/interviewCustomization';

const AVAILABLE_MODEL_PATHS = new Set(INTERVIEW_AVATAR_CATALOG.map((avatar) => avatar.modelPath));
const DEFAULT_MODEL_PATH = '/models/rahul.glb';

const normalizeModelPath = (modelPath?: string): string => {
  if (!modelPath) return DEFAULT_MODEL_PATH;
  return AVAILABLE_MODEL_PATHS.has(modelPath) ? modelPath : DEFAULT_MODEL_PATH;
};

interface InterviewAvatarProps {
  currentWord?: string;
  isSpeaking?: boolean;
  modelPath?: string;
  className?: string;
}

function AvatarModel({
  currentViseme,
  isSpeaking,
  modelPath = '/models/maya.glb',
  modelScale,
  modelY,
}: {
  currentViseme: string;
  isSpeaking: boolean;
  modelPath?: string;
  modelScale: number;
  modelY: number;
}) {
  const group = useRef<THREE.Group | null>(null);
  const jawBoneRef = useRef<THREE.Bone | null>(null);
  const jawBaseXRef = useRef(0);
  const safeModelPath = normalizeModelPath(modelPath);
  const { nodes, materials } = useGLTF(safeModelPath) as any;
  const { animations: idleAnimation } = useFBX('/animations/Idle.fbx') as any;

  idleAnimation[0].name = 'Idle';
  const { actions } = useAnimations([idleAnimation[0]], group);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const action = actions?.Idle;
      if (action) {
        Object.values(actions).forEach((a: any) => a?.stop?.());
        action.reset();
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(1);
        action.fadeIn(0.25);
        action.play();
      }
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
      const action = actions?.Idle;
      action?.fadeOut?.(0.2);
    };
  }, [actions, safeModelPath]);

  useEffect(() => {
    jawBoneRef.current = null;
    jawBaseXRef.current = 0;

    const root = group.current;
    if (!root) return;

    let foundJaw: THREE.Bone | null = null;
    root.traverse((object) => {
      if (foundJaw) return;
      if (!(object instanceof THREE.Bone)) return;
      if (object.name.toLowerCase().includes('jaw')) {
        foundJaw = object;
      }
    });

    if (foundJaw) {
      jawBoneRef.current = foundJaw;
      jawBaseXRef.current = foundJaw.rotation.x;
    }
  }, [safeModelPath]);

  useFrame((state) => {
    const smoothing = 0.45;
    const visemes = getAllVisemeTargets();
    const headMesh = nodes?.Wolf3D_Head;
    const teethMesh = nodes?.Wolf3D_Teeth;

    let hasHeadVisemes = false;
    let hasTeethVisemes = false;

    if (headMesh || teethMesh) {
      visemes.forEach((viseme) => {
        if (headMesh?.morphTargetDictionary?.[viseme] !== undefined) {
          hasHeadVisemes = true;
          const headIndex = headMesh.morphTargetDictionary[viseme];
          headMesh.morphTargetInfluences[headIndex] = THREE.MathUtils.lerp(
            headMesh.morphTargetInfluences[headIndex] || 0,
            0,
            smoothing,
          );
        }

        if (teethMesh?.morphTargetDictionary?.[viseme] !== undefined) {
          hasTeethVisemes = true;
          const teethIndex = teethMesh.morphTargetDictionary[viseme];
          teethMesh.morphTargetInfluences[teethIndex] = THREE.MathUtils.lerp(
            teethMesh.morphTargetInfluences[teethIndex] || 0,
            0,
            smoothing,
          );
        }
      });
    }

    if (isSpeaking && currentViseme) {
      if (headMesh?.morphTargetDictionary?.[currentViseme] !== undefined) {
        const headIndex = headMesh.morphTargetDictionary[currentViseme];
        headMesh.morphTargetInfluences[headIndex] = THREE.MathUtils.lerp(
          headMesh.morphTargetInfluences[headIndex] || 0,
          1,
          smoothing,
        );
      }

      if (teethMesh?.morphTargetDictionary?.[currentViseme] !== undefined) {
        const teethIndex = teethMesh.morphTargetDictionary[currentViseme];
        teethMesh.morphTargetInfluences[teethIndex] = THREE.MathUtils.lerp(
          teethMesh.morphTargetInfluences[teethIndex] || 0,
          1,
          smoothing,
        );
      }
    }

    const hasVisemeSupport = hasHeadVisemes || hasTeethVisemes;
    const jawBone = jawBoneRef.current;
    if (jawBone && !hasVisemeSupport) {
      const openAmount = isSpeaking ? (Math.sin(state.clock.elapsedTime * 14) * 0.5 + 0.5) * 0.18 : 0;
      jawBone.rotation.x = THREE.MathUtils.lerp(jawBone.rotation.x, jawBaseXRef.current + openAmount, 0.28);
    }

    const root = group.current;
    if (root) {
      root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, Math.sin(state.clock.elapsedTime * 0.6) * 0.08, 0.08);
    }

    const head = group.current?.getObjectByName('Head');
    if (head) {
      head.lookAt(state.camera.position);
    }
  });

  return (
    <group ref={group} dispose={null} scale={modelScale} position={[0, modelY, 0]}>
      <primitive object={nodes.Hips} />
      <skinnedMesh geometry={nodes.Wolf3D_Body.geometry} material={materials.Wolf3D_Body} skeleton={nodes.Wolf3D_Body.skeleton} />
      <skinnedMesh geometry={nodes.Wolf3D_Outfit_Bottom.geometry} material={materials.Wolf3D_Outfit_Bottom} skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton} />
      <skinnedMesh geometry={nodes.Wolf3D_Outfit_Footwear.geometry} material={materials.Wolf3D_Outfit_Footwear} skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton} />
      <skinnedMesh geometry={nodes.Wolf3D_Outfit_Top.geometry} material={materials.Wolf3D_Outfit_Top} skeleton={nodes.Wolf3D_Outfit_Top.skeleton} />
      <skinnedMesh geometry={nodes.Wolf3D_Hair.geometry} material={materials.Wolf3D_Hair} skeleton={nodes.Wolf3D_Hair.skeleton} />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
    </group>
  );
}

INTERVIEW_AVATAR_CATALOG.forEach((avatar) => {
  useGLTF.preload(avatar.modelPath);
});
useFBX.preload('/animations/Idle.fbx');

export function InterviewAvatar({
  currentWord = '',
  isSpeaking = false,
  modelPath = '/models/rahul.glb',
  className,
}: InterviewAvatarProps) {
  const isMaleModel = useMemo(() => {
    const normalizedPath = modelPath.toLowerCase();
    return normalizedPath.includes('male') || normalizedPath.includes('rahul') || normalizedPath.includes('rohith');
  }, [modelPath]);

  const avatarFrame = useMemo(() => {
    if (isMaleModel) {
      return {
        modelScale: 2.35,
        modelY: -3.75,
        cameraY: 1.82,
        cameraZ: 3.75,
      };
    }

    return {
      modelScale: 2.3,
      modelY: -3.62,
      cameraY: 1.82,
      cameraZ: 3.75,
    };
  }, [isMaleModel]);

  const currentViseme = useMemo(() => {
    if (!isSpeaking) return visemeMap.rest;
    return getVisemeFromWord(currentWord);
  }, [currentWord, isSpeaking]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[rgba(0,25,56,0.10)] bg-[#09111f] shadow-[0_20px_50px_rgba(0,25,56,0.10)]',
        className,
      )}
      style={{
        backgroundImage: "linear-gradient(180deg, rgba(2,8,23,0.22) 0%, rgba(2,8,23,0.58) 100%), url('/background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)] shadow-sm">
        <span className={cn('h-2 w-2 rounded-full', isSpeaking ? 'animate-pulse bg-emerald-500' : 'bg-slate-400')} />
        Interviewer
      </div>
      <div className="absolute bottom-3 right-3 z-10 rounded-full bg-[rgba(0,25,56,0.78)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
        {isSpeaking ? 'Speaking' : 'Idle'}
      </div>
      <Canvas camera={{ position: [0, avatarFrame.cameraY, avatarFrame.cameraZ], fov: 22 }} dpr={[1, 1.5]} gl={{ alpha: true }} style={{ background: 'transparent' }}>
        <ambientLight intensity={1.65} />
        <directionalLight position={[2, 4, 5]} intensity={2.1} />
        <directionalLight position={[-3, 1, 2]} intensity={0.8} />
        <Suspense fallback={null}>
          <AvatarModel
            currentViseme={currentViseme}
            isSpeaking={isSpeaking}
            modelPath={modelPath}
            modelScale={avatarFrame.modelScale}
            modelY={avatarFrame.modelY}
          />
          <Environment preset="sunset" />
        </Suspense>
      </Canvas>
    </div>
  );
}
