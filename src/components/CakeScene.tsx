import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { Component, type CSSProperties, type ReactNode, type RefObject, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export type CakeStage =
  | 'idle'
  | 'blowing'
  | 'extinguished'
  | 'readyToCut'
  | 'cutting'
  | 'celebration'

interface CakeSceneProps {
  stage: CakeStage
}

interface CakeHalfProps {
  side: -1 | 1
  stage: CakeStage
}

class CakeSceneErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.error('The 3D cake scene could not be initialized.', error)
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="scene-error" role="alert">
          The 3D cake needs WebGL. Please try a browser with hardware acceleration enabled.
        </div>
      )
    }
    return this.props.children
  }
}

const spongeMaterial = new THREE.MeshStandardMaterial({
  color: '#d99a70',
  roughness: 0.72,
})
const creamMaterial = new THREE.MeshStandardMaterial({
  color: '#fff0e7',
  roughness: 0.32,
})
const pinkFrostingMaterial = new THREE.MeshStandardMaterial({
  color: '#ef78ae',
  roughness: 0.25,
  metalness: 0.04,
})
const paleFrostingMaterial = new THREE.MeshStandardMaterial({
  color: '#ffc3df',
  roughness: 0.24,
  metalness: 0.04,
})
const knifeBladeShape = new THREE.Shape()
knifeBladeShape.moveTo(-0.12, 0.3)
knifeBladeShape.lineTo(0.12, 0.3)
knifeBladeShape.lineTo(0.1, -0.48)
knifeBladeShape.lineTo(0, -0.76)
knifeBladeShape.lineTo(-0.1, -0.48)
knifeBladeShape.closePath()

function seededValue(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

function Layer({
  radius,
  height,
  y,
  side,
  material,
}: {
  radius: number
  height: number
  y: number
  side: -1 | 1
  material: THREE.Material
}) {
  return (
    <mesh position={[0, y, 0]} castShadow receiveShadow>
      <cylinderGeometry
        args={[radius, radius, height, 48, 1, false, side === 1 ? 0 : Math.PI, Math.PI]}
      />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

function Candle({
  position,
  stage,
}: {
  position: [number, number, number]
  stage: CakeStage
}) {
  const flameRef = useRef<THREE.Group>(null)
  const emberRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const smokeRefs = useRef<THREE.Mesh[]>([])
  const lastStage = useRef(stage)
  const extinguishedAt = useRef(0)
  const stageStartedAt = useRef(0)
  const sceneTime = useRef(0)

  useFrame((state, delta) => {
    sceneTime.current += delta
    if (stage !== lastStage.current) {
      stageStartedAt.current = sceneTime.current
      if (stage === 'extinguished') extinguishedAt.current = sceneTime.current
      lastStage.current = stage
    }

    const blowing = stage === 'blowing'
    const blownFor = sceneTime.current - extinguishedAt.current
    const shrink = blowing
      ? Math.max(0.025, 1 - (sceneTime.current - stageStartedAt.current) / 1.15)
      : stage === 'extinguished' || stage === 'readyToCut' || stage === 'cutting' || stage === 'celebration'
        ? 0.001
        : 1

    if (flameRef.current) {
      const gust = blowing ? -0.9 : 0
      flameRef.current.rotation.z =
        gust + Math.sin(state.clock.getElapsedTime() * 8 + position[0] * 4) * (blowing ? 0.18 : 0.1)
      flameRef.current.scale.set(
        1 + Math.sin(state.clock.getElapsedTime() * 11 + position[2]) * 0.08,
        shrink,
        1,
      )
    }
    if (lightRef.current) {
      lightRef.current.intensity =
        stage === 'idle'
          ? 1.8 + Math.sin(state.clock.getElapsedTime() * 12 + position[0]) * 0.38
          : blowing
            ? Math.max(0.05, 1.8 * (1 - (sceneTime.current - stageStartedAt.current) / 1.15))
            : 0
    }
    if (emberRef.current) {
      const emberScale =
        blowing
          ? Math.max(0.002, (1 - shrink) * 0.05)
          : stage === 'extinguished'
            ? Math.max(0.002, 0.05 * (1 - blownFor / 0.5))
            : 0.002
      emberRef.current.scale.setScalar(emberScale)
      emberRef.current.position.y = 0.34 + (blowing ? shrink * 0.08 : 0)
    }

    smokeRefs.current.forEach((particle, index) => {
      if (!particle) return
      const age = blownFor - index * 0.1
      const material = particle.material as THREE.MeshBasicMaterial
      material.opacity = age > 0 && age < 2.4 ? Math.max(0, (1 - age / 2.4) * 0.26) : 0
      particle.visible = material.opacity > 0
      particle.position.y = 0.54 + Math.max(0, age) * (0.2 + index * 0.015)
      particle.position.x = Math.sin(age * 2 + index) * Math.max(0, age) * 0.035
      particle.scale.setScalar(0.45 + Math.max(0, age) * 0.5)
    })
  })

  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.075, 0.085, 0.46, 16]} />
        <meshStandardMaterial color="#fff1e4" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.235, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.055, 8]} />
        <meshStandardMaterial color="#39241f" />
      </mesh>
      <mesh ref={emberRef} position={[0, 0.34, 0.01]} scale={0.002}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#ffbb63" toneMapped={false} />
      </mesh>
      <group ref={flameRef} position={[0, 0.34, 0]}>
        <mesh position={[0, 0.08, 0]} scale={[0.075, 0.14, 0.075]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="#ff842f" />
        </mesh>
        <mesh position={[0, 0.06, 0.035]} scale={[0.042, 0.09, 0.042]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color="#ffd567" />
        </mesh>
        <mesh position={[0, 0.035, 0.055]} scale={[0.02, 0.05, 0.02]}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial color="#fff9d6" />
        </mesh>
      </group>
      <pointLight ref={lightRef} position={[0, 0.43, 0]} color="#ffad50" intensity={1.8} distance={2.1} />
      {[0, 1, 2, 3].map((index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            if (mesh) smokeRefs.current[index] = mesh
          }}
          position={[0, 0.55, 0]}
          visible={false}
        >
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshBasicMaterial color="#d9cbd3" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function CakeHalf({ side, stage }: CakeHalfProps) {
  const halfRef = useRef<THREE.Group>(null)
  const cutVisible = stage === 'celebration'

  useFrame((_, delta) => {
    if (!halfRef.current) return
    const split = stage === 'celebration' ? 0.36 : 0
    halfRef.current.position.x = THREE.MathUtils.damp(halfRef.current.position.x, side * split, 3, delta)
    halfRef.current.rotation.z = THREE.MathUtils.damp(
      halfRef.current.rotation.z,
      stage === 'celebration' ? side * 0.035 : 0,
      3,
      delta,
    )
  })

  const candles: [number, number, number][] = Array.from({ length: 3 }, (_, index) => [
    side * (0.13 + index * 0.19),
    2.65,
    index === 1 ? -0.17 : 0.08,
  ])

  return (
    <group ref={halfRef}>
      <Layer side={side} radius={1.4} height={0.72} y={0.66} material={spongeMaterial} />
      <Layer side={side} radius={1.405} height={0.1} y={1.07} material={creamMaterial} />
      <Layer side={side} radius={1.44} height={0.12} y={1.13} material={pinkFrostingMaterial} />
      <Layer side={side} radius={1.05} height={0.62} y={1.5} material={spongeMaterial} />
      <Layer side={side} radius={1.055} height={0.1} y={1.86} material={creamMaterial} />
      <Layer side={side} radius={1.09} height={0.12} y={1.92} material={paleFrostingMaterial} />
      <Layer side={side} radius={0.72} height={0.48} y={2.2} material={spongeMaterial} />
      <Layer side={side} radius={0.76} height={0.11} y={2.49} material={pinkFrostingMaterial} />

      {cutVisible && (
        <>
          <mesh position={[side * 0.012, 0.66, 0]} receiveShadow>
            <boxGeometry args={[0.025, 0.72, 2.78]} />
            <primitive object={spongeMaterial} attach="material" />
          </mesh>
          <mesh position={[side * 0.015, 1.07, 0]}>
            <boxGeometry args={[0.03, 0.1, 2.8]} />
            <primitive object={creamMaterial} attach="material" />
          </mesh>
          <mesh position={[side * 0.012, 1.5, 0]} receiveShadow>
            <boxGeometry args={[0.025, 0.62, 2.08]} />
            <primitive object={spongeMaterial} attach="material" />
          </mesh>
          <mesh position={[side * 0.015, 1.86, 0]}>
            <boxGeometry args={[0.03, 0.1, 2.1]} />
            <primitive object={creamMaterial} attach="material" />
          </mesh>
          <mesh position={[side * 0.012, 2.2, 0]} receiveShadow>
            <boxGeometry args={[0.025, 0.48, 1.42]} />
            <primitive object={spongeMaterial} attach="material" />
          </mesh>
        </>
      )}

      {candles.map((position, index) => (
        <Candle key={`${side}-${index}`} position={position} stage={stage} />
      ))}
      <mesh position={[side * 0.42, 2.62, -0.35]} rotation={[0.3, 0, side * 0.1]} castShadow>
        <octahedronGeometry args={[0.12, 1]} />
        <meshStandardMaterial color="#e6bf67" metalness={0.68} roughness={0.23} />
      </mesh>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = side === 1 ? index * 0.48 : Math.PI + index * 0.48
        const radius = index % 2 === 0 ? 0.57 : 0.65
        return (
          <mesh
            key={`berry-${side}-${index}`}
            position={[Math.sin(angle) * radius, 2.59, Math.cos(angle) * radius]}
            castShadow
          >
            <sphereGeometry args={[0.085, 14, 12]} />
            <meshStandardMaterial color="#c62855" roughness={0.3} />
          </mesh>
        )
      })}
    </group>
  )
}

function PartyBurst({ stage }: { stage: CakeStage }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const startTime = useRef<number | null>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const particles = useMemo(
    () =>
      Array.from({ length: 56 }, (_, index) => {
        const side: -1 | 1 = index % 2 === 0 ? -1 : 1
        const rand = (offset: number) => seededValue(index * 7 + offset)
        return {
          side,
          x: side * (1.65 + rand(1) * 0.25),
          y: 1.2 + rand(2) * 0.5,
          z: (rand(3) - 0.5) * 0.7,
          vx: -side * (1.1 + rand(4) * 1.6),
          vy: 1.5 + rand(5) * 2.1,
          vz: (rand(6) - 0.5) * 1.6,
          spin: (rand(7) - 0.5) * 8,
          color: new THREE.Color(['#ff5a9e', '#f4ca68', '#fff3fa', '#a982ff', '#ff8761'][index % 5]),
        }
      }),
    [],
  )

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return
    if (stage !== 'celebration') {
      startTime.current = null
      mesh.visible = false
      return
    }

    if (startTime.current === null) startTime.current = state.clock.elapsedTime
    const elapsed = state.clock.elapsedTime - startTime.current
    mesh.visible = elapsed < 3.2
    if (!mesh.visible) return

    particles.forEach((particle, index) => {
      const age = Math.min(elapsed, 2.8)
      dummy.position.set(
        particle.x + particle.vx * age,
        particle.y + particle.vy * age - 0.7 * age * age,
        particle.z + particle.vz * age,
      )
      dummy.rotation.set(particle.spin * age, particle.spin * age * 0.6, particle.spin * age * 0.3)
      const scale = Math.max(0.02, 0.12 * (1 - age / 3.2))
      dummy.scale.set(scale, scale * (index % 3 === 0 ? 1.8 : 0.75), scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
      mesh.setColorAt(index, particle.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]} visible={false}>
      <boxGeometry args={[1, 1, 0.22]} />
      <meshStandardMaterial roughness={0.4} metalness={0.12} />
    </instancedMesh>
  )
}

function FireworkBursts({ stage }: { stage: CakeStage }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const startTime = useRef<number | null>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const anchors = useMemo(
    () => [new THREE.Vector3(-1.7, 3.5, -2.2), new THREE.Vector3(0, 4.1, -2.5), new THREE.Vector3(1.7, 3.6, -2.1)],
    [],
  )
  const particles = useMemo(
    () =>
      Array.from({ length: 84 }, (_, index) => {
        const burst = Math.floor(index / 28)
        const offset = index % 28
        const angle = (offset / 28) * Math.PI * 2
        const elevation = (seededValue(index + 3) - 0.5) * 0.85
        const speed = 0.65 + seededValue(index + 89) * 0.85
        return {
          burst,
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed + elevation,
          z: (seededValue(index + 191) - 0.5) * 0.7,
          color: new THREE.Color(['#ffe29a', '#ff91c5', '#d5bbff'][burst]),
        }
      }),
    [],
  )

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return
    if (stage !== 'celebration') {
      startTime.current = null
      mesh.visible = false
      return
    }
    if (startTime.current === null) startTime.current = state.clock.elapsedTime
    const elapsed = state.clock.elapsedTime - startTime.current
    mesh.visible = elapsed < 3.2
    if (!mesh.visible) return

    particles.forEach((particle, index) => {
      const age = elapsed - particle.burst * 0.22
      const anchor = anchors[particle.burst]
      const activeAge = Math.max(0, age)
      dummy.position.set(
        anchor.x + particle.x * activeAge,
        anchor.y + particle.y * activeAge - activeAge * activeAge * 0.48,
        anchor.z + particle.z * activeAge,
      )
      const scale = age > 0 ? Math.max(0.015, 0.055 * (1 - activeAge / 3.2)) : 0
      dummy.scale.setScalar(scale)
      dummy.rotation.set(activeAge * index * 0.02, activeAge * 0.8, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
      mesh.setColorAt(index, particle.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]} visible={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

function CakeCrumbs({ stage }: { stage: CakeStage }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const startTime = useRef<number | null>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const crumbs = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        x: (seededValue(index + 31) - 0.5) * 0.45,
        y: 1.7 + seededValue(index + 71) * 0.3,
        z: 0.45 + seededValue(index + 113) * 0.35,
        vx: (seededValue(index + 149) - 0.5) * 0.8,
        vy: 0.5 + seededValue(index + 197) * 0.9,
        vz: (seededValue(index + 239) - 0.5) * 0.6,
      })),
    [],
  )

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return
    if (stage !== 'celebration') {
      startTime.current = null
      mesh.visible = false
      return
    }
    if (startTime.current === null) startTime.current = state.clock.elapsedTime
    const elapsed = state.clock.elapsedTime - startTime.current
    mesh.visible = elapsed < 2
    if (!mesh.visible) return

    crumbs.forEach((crumb, index) => {
      dummy.position.set(
        crumb.x + crumb.vx * elapsed,
        crumb.y + crumb.vy * elapsed - elapsed * elapsed * 1.4,
        crumb.z + crumb.vz * elapsed,
      )
      const scale = Math.max(0.001, 0.055 * (1 - elapsed / 2))
      dummy.scale.set(scale, scale * 0.8, scale)
      dummy.rotation.set(elapsed * index, elapsed * 0.6, elapsed * 0.9)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, crumbs.length]} visible={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#c58458" roughness={0.92} />
    </instancedMesh>
  )
}

function Knife({ stage }: { stage: CakeStage }) {
  const knifeRef = useRef<THREE.Group>(null)
  const startTime = useRef<number | null>(null)

  useFrame((state, delta) => {
    if (stage !== 'cutting') {
      startTime.current = null
      if (knifeRef.current) knifeRef.current.visible = false
      return
    }
    if (startTime.current === null) startTime.current = state.clock.elapsedTime
    const elapsed = state.clock.elapsedTime - startTime.current
    const progress = THREE.MathUtils.clamp((elapsed - 0.2) / 2.55, 0, 1)
    const knife = knifeRef.current
    if (!knife) return
    knife.visible = elapsed > 0.2
    knife.position.x = THREE.MathUtils.damp(knife.position.x, 2.8 - progress * 2.8, 4, delta)
    knife.position.y = THREE.MathUtils.damp(knife.position.y, 3.3 - progress * 2.1, 4, delta)
    knife.rotation.z = THREE.MathUtils.damp(knife.rotation.z, -0.22 * progress, 3, delta)
  })

  return (
    <group ref={knifeRef} position={[3, 3.5, 0.35]} visible={false}>
      <mesh position={[0, 0, -0.02]} castShadow>
        <extrudeGeometry
          args={[
            knifeBladeShape,
            { depth: 0.035, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.012, bevelThickness: 0.008 },
          ]}
        />
        <meshStandardMaterial color="#dce6ee" metalness={0.92} roughness={0.14} />
      </mesh>
      <mesh position={[0, 0.61, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.085, 0.52, 12]} />
        <meshStandardMaterial color="#53333c" roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <torusGeometry args={[0.1, 0.02, 8, 16]} />
        <meshStandardMaterial color="#bf9856" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  )
}

function Scene({ stage }: CakeSceneProps) {
  const cakeRef = useRef<THREE.Group>(null)
  const previousStage = useRef(stage)
  const stageStartedAt = useRef(0)

  useFrame((state, delta) => {
    if (stage !== previousStage.current) {
      previousStage.current = stage
      stageStartedAt.current = state.clock.elapsedTime
    }

    const time = state.clock.elapsedTime
    if (cakeRef.current) {
      const celebration = stage === 'celebration'
      const cameraBias = stage === 'cutting' ? 0.5 : celebration ? -0.22 : 0
      cakeRef.current.rotation.y = Math.sin(time * 0.22) * (stage === 'idle' || stage === 'readyToCut' ? 0.12 : 0.035)
      cakeRef.current.position.y = Math.sin(time * 1.4) * 0.025
      const desiredScale = stage === 'cutting' ? 1.04 : celebration ? 0.94 : 1
      cakeRef.current.scale.setScalar(THREE.MathUtils.damp(cakeRef.current.scale.x, desiredScale, 2.4, delta))
      cakeRef.current.position.x = THREE.MathUtils.damp(cakeRef.current.position.x, cameraBias, 2, delta)
      if (celebration && time - stageStartedAt.current < 0.3) {
        cakeRef.current.position.y += Math.sin((time - stageStartedAt.current) * 45) * 0.025
      }
    }

    const camera = state.camera
    const orbit = stage === 'idle' || stage === 'readyToCut' ? Math.sin(time * 0.2) * 0.18 : 0.05
    const targetZ = stage === 'cutting' ? 6.2 : 6.8
    const targetY = stage === 'cutting' ? 3.1 : 3.4
    const targetX = 4.1 + orbit + (stage === 'cutting' ? -0.35 : 0)
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 1.3, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 1.3, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 1.3, delta)
    camera.lookAt(0, 1.45, 0)
  })

  return (
    <>
      <color attach="background" args={['#160912']} />
      <fog attach="fog" args={['#160912', 9, 17]} />
      <ambientLight intensity={1.1} color="#ffd9eb" />
      <directionalLight position={[3, 7, 5]} intensity={3.2} color="#fff2e7" castShadow />
      <pointLight position={[-4, 3, -2]} intensity={2.4} color="#c57cff" />
      <pointLight position={[3, 3, 4]} intensity={1.2} color="#ff72ae" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} receiveShadow>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial color="#29121f" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.22, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.8, 1.88, 0.16, 64]} />
        <meshStandardMaterial color="#f4dce5" metalness={0.28} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[1.78, 0.025, 10, 64]} />
        <meshStandardMaterial color="#d6af5d" metalness={0.78} roughness={0.2} />
      </mesh>

      <group ref={cakeRef}>
        <CakeHalf side={-1} stage={stage} />
        <CakeHalf side={1} stage={stage} />
        <Knife stage={stage} />
        {stage === 'cutting' && (
          <mesh position={[0, 1.42, 1.44]}>
            <boxGeometry args={[0.025, 1.84, 0.025]} />
            <meshBasicMaterial color="#fff0cf" />
          </mesh>
        )}
      </group>

      <Sparkles count={45} scale={[5, 3.8, 4]} size={2.2} speed={0.28} color="#ffdb8b" />
      <Sparkles count={stage === 'blowing' ? 24 : 0} position={[0, 2.95, 0.65]} scale={[3, 0.24, 0.4]} size={2.5} speed={1.2} color="#fff5e5" />
      <Sparkles count={stage === 'celebration' ? 90 : 20} scale={[7, 5, 4]} size={3.4} speed={stage === 'celebration' ? 1.4 : 0.35} color="#ffc1dc" />
      <PartyBurst stage={stage} />
      <FireworkBursts stage={stage} />
      <CakeCrumbs stage={stage} />
    </>
  )
}

export default function CakeScene({ stage }: CakeSceneProps) {
  return (
    <CakeSceneErrorBoundary>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [4.1, 3.4, 6.8], fov: 39, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Scene stage={stage} />
      </Canvas>
    </CakeSceneErrorBoundary>
  )
}

interface FloatingCakeProps {
  index: number
  screenWidth: number
  screenHeight: number
  isMobile: boolean
  pointer: RefObject<THREE.Vector2 | null>
}

const backgroundCakes = [
  { x: 0.08, type: 'birthday', color: '#f47db0', accent: '#ffd5e8', scale: 0.72, duration: 42, delay: 0.2, phase: 0.1 },
  { x: 0.91, type: 'chocolate', color: '#75453e', accent: '#d49b78', scale: 0.84, duration: 48, delay: 11.1, phase: 0.9 },
  { x: 0.5, type: 'strawberry', color: '#f48bb5', accent: '#fff0e7', scale: 0.66, duration: 46, delay: 24.6, phase: 1.6 },
  { x: 0.88, type: 'cupcake', color: '#ba91e8', accent: '#ffe4f1', scale: 0.72, duration: 40, delay: 7.4, phase: 2.3 },
  { x: 0.03, type: 'cream', color: '#fff0e7', accent: '#e9a4c8', scale: 0.78, duration: 50, delay: 33.5, phase: 3.1 },
  { x: 0.97, type: 'birthday', color: '#d9b569', accent: '#fff0e7', scale: 0.6, duration: 44, delay: 18.8, phase: 3.9 },
  { x: 0.28, type: 'cupcake', color: '#ed86b2', accent: '#ffd881', scale: 0.56, duration: 47, delay: 29.2, phase: 4.6 },
  { x: 0.75, type: 'chocolate', color: '#6b3b37', accent: '#f0bd78', scale: 0.7, duration: 41, delay: 4.7, phase: 5.4 },
  { x: 0.34, type: 'strawberry', color: '#e884ae', accent: '#fff5ee', scale: 0.6, duration: 49, delay: 14.4, phase: 6.1 },
  { x: 0.68, type: 'cream', color: '#fff0e7', accent: '#d4af69', scale: 0.66, duration: 43, delay: 26.5, phase: 6.8 },
] as const

function FloatingCake({ index, screenWidth, screenHeight, isMobile, pointer }: FloatingCakeProps) {
  const cakeRef = useRef<THREE.Group>(null)
  const cakeMaterials = useRef<THREE.Material[]>([])
  const cake = backgroundCakes[index]
  const isCupcake = cake.type === 'cupcake'
  const isChocolate = cake.type === 'chocolate'
  const isBirthdayCake = cake.type === 'birthday'
  const bodyColor = isChocolate ? '#71433b' : cake.color
  const frostingColor = isChocolate ? '#bf8c67' : cake.accent
  const scale = cake.scale * (isMobile ? 0.16 : 0.28)
  const baseX = (cake.x - 0.5) * screenWidth

  useEffect(() => {
    const group = cakeRef.current
    if (!group) return
    const materials = new Set<THREE.Material>()
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const meshMaterials = Array.isArray(object.material) ? object.material : [object.material]
      meshMaterials.forEach((material) => materials.add(material))
    })
    cakeMaterials.current = Array.from(materials)
    cakeMaterials.current.forEach((material) => {
      material.transparent = true
      material.depthWrite = false
    })
  }, [])

  useFrame((state) => {
    const group = cakeRef.current
    if (group) {
      const activeTime = Math.max(0, state.clock.elapsedTime - cake.delay)
      const progress = (activeTime % cake.duration) / cake.duration
      const fadeIn = THREE.MathUtils.clamp(progress / 0.04, 0, 1)
      const fadeOut = THREE.MathUtils.clamp((1 - progress) / 0.15, 0, 1)
      const opacity = Math.min(fadeIn, fadeOut)
      const travelDistance = screenHeight + 3.2
      const bottomY = -screenHeight / 2 - 1.4
      const parallaxX = (pointer.current?.x ?? 0) * 0.13
      const parallaxY = (pointer.current?.y ?? 0) * 0.08
      const time = state.clock.elapsedTime + cake.phase
      group.position.x = baseX + parallaxX + Math.sin(progress * Math.PI * 5 + cake.phase) * 0.08
      group.position.y = bottomY + progress * travelDistance + parallaxY
      group.rotation.x = 0.13 + Math.sin(time * 0.5) * 0.045
      group.rotation.y = Math.sin(time * 0.28) * 0.2 + parallaxX * 0.05
      group.rotation.z = Math.sin(progress * Math.PI * 4 + cake.phase) * 0.035
      group.visible = opacity > 0.005
      cakeMaterials.current.forEach((material) => {
        material.opacity = opacity
      })
    }
  })

  return (
    <group ref={cakeRef} position={[baseX, -screenHeight / 2 - 1.4, 0]} scale={scale}>
        {isCupcake ? (
          <>
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.38, 0.27, 0.62, 20]} />
              <meshStandardMaterial color="#d8a267" roughness={0.52} />
            </mesh>
            <mesh position={[0, 0.39, 0]} castShadow>
              <sphereGeometry args={[0.4, 20, 16]} />
              <meshStandardMaterial color={frostingColor} roughness={0.34} />
            </mesh>
            <mesh position={[0, 0.64, 0]} castShadow>
              <sphereGeometry args={[0.25, 18, 14]} />
              <meshStandardMaterial color={cake.color} roughness={0.32} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0, -0.12, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.61, 0.65, 0.46, 28]} />
              <meshStandardMaterial color={bodyColor} roughness={0.48} />
            </mesh>
            <mesh position={[0, 0.15, 0]} castShadow>
              <cylinderGeometry args={[0.63, 0.63, 0.12, 28]} />
              <meshStandardMaterial color={frostingColor} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.33, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.42, 0.45, 0.34, 24]} />
              <meshStandardMaterial color={isChocolate ? '#805044' : cake.accent} roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.53, 0]} castShadow>
              <cylinderGeometry args={[0.45, 0.45, 0.1, 24]} />
              <meshStandardMaterial color={isChocolate ? '#ce9b76' : cake.color} roughness={0.27} />
            </mesh>
            {[0, 1, 2, 3, 4].map((berry) => {
              const angle = (berry / 5) * Math.PI * 2
              return (
                <mesh key={berry} position={[Math.sin(angle) * 0.29, 0.62, Math.cos(angle) * 0.29]} castShadow>
                  <sphereGeometry args={[0.075, 10, 8]} />
                  <meshStandardMaterial
                    color={isChocolate ? '#e2b477' : berry % 2 ? '#c33759' : '#d4af64'}
                    roughness={0.35}
                  />
                </mesh>
              )
            })}
          </>
        )}
        {isBirthdayCake && (
          <group position={[0, 0.74, 0]}>
            {[-0.22, 0, 0.22].map((x) => (
              <group key={x} position={[x, 0.16, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.035, 0.04, 0.28, 8]} />
                  <meshStandardMaterial color="#fff1e4" roughness={0.4} />
                </mesh>
                <mesh position={[0, 0.19, 0]}>
                  <sphereGeometry args={[0.055, 10, 8]} />
                  <meshBasicMaterial color="#ffd27a" toneMapped={false} />
                </mesh>
                <pointLight position={[0, 0.22, 0]} color="#ffbd68" intensity={0.45} distance={0.7} />
              </group>
            ))}
          </group>
        )}
        <pointLight position={[0, 0.6, 0.3]} color={cake.accent} intensity={0.18} distance={2.4} />

    </group>
  )
}

function BackgroundCakeScene({ showCakes }: { showCakes: boolean }) {
  const pointer = useRef(new THREE.Vector2())
  const { size, viewport } = useThree()
  const isMobile = size.width < 600
  const visibleCakes = isMobile ? 3 : 6

  useEffect(() => {
    const trackPointer = (event: PointerEvent) => {
      pointer.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        1 - (event.clientY / window.innerHeight) * 2,
      )
    }
    window.addEventListener('pointermove', trackPointer, { passive: true })
    return () => window.removeEventListener('pointermove', trackPointer)
  }, [])

  return (
    <>
      <ambientLight intensity={1.4} color="#f8dced" />
      <pointLight position={[-5, 4, 5]} color="#f28cbd" intensity={1.2} distance={16} />
      <pointLight position={[5, -3, 4]} color="#dfb964" intensity={0.6} distance={14} />
      {showCakes && <AmbientConfetti />}
      <Sparkles
        count={isMobile ? 4 : 10}
        scale={[viewport.width, viewport.height, 3]}
        size={isMobile ? 0.5 : 0.75}
        speed={0.22}
        color="#f7d797"
        opacity={0.16}
      />
      {showCakes && backgroundCakes.slice(0, visibleCakes).map((cake, index) => (
        <FloatingCake
          key={`${cake.type}-${index}`}
          index={index}
          screenWidth={viewport.width}
          screenHeight={viewport.height}
          isMobile={isMobile}
          pointer={pointer}
        />
      ))}
    </>
  )
}

function AmbientConfetti() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const { size, viewport } = useThree()
  const confetti = useMemo(
    () =>
      Array.from({ length: size.width < 600 ? 3 : 8 }, (_, index) => ({
        x: seededValue(index + 41) - 0.5,
        y: seededValue(index + 73),
        z: (seededValue(index + 109) - 0.5) * 1.6,
        speed: 0.08 + seededValue(index + 151) * 0.1,
        rotation: seededValue(index + 199) * Math.PI,
        color: new THREE.Color(['#f3d181', '#ed9ac0', '#e5dbff', '#fff2e7'][index % 4]),
      })),
    [size.width],
  )

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return

    confetti.forEach((piece, index) => {
      const progress = (piece.y + state.clock.elapsedTime * piece.speed) % 1
      dummy.position.set(
        (piece.x + Math.sin(state.clock.elapsedTime * 0.25 + index) * 0.018) * viewport.width,
        (0.5 - progress) * viewport.height,
        piece.z,
      )
      dummy.rotation.set(piece.rotation + state.clock.elapsedTime * 0.16, 0.1, piece.rotation + state.clock.elapsedTime * 0.12)
      dummy.scale.set(0.025, index % 3 === 0 ? 0.045 : 0.028, 0.012)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
      mesh.setColorAt(index, piece.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, confetti.length]}>
      <boxGeometry args={[1, 1, 0.35]} />
      <meshStandardMaterial roughness={0.42} metalness={0.18} />
    </instancedMesh>
  )
}

class AmbientSceneErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.error('The 3D birthday background could not be initialized; CSS effects will be used instead.', error)
  }

  render() {
    return this.state.failed ? <AmbientCelebrationFallback /> : this.props.children
  }
}

function AmbientCelebrationFallback() {
  const balloonColors = ['#f38ab8', '#b898e7', '#d9bd72', '#fff0e7', '#ed719f']

  return (
    <div className="ambient-fallback" aria-hidden="true">
      {Array.from({ length: 22 }, (_, index) => (
        <span
          className="fallback-balloon"
          key={`balloon-${index}`}
          style={{
            '--balloon-x': `${(index * 47 + 8) % 100}%`,
            '--balloon-size': `${12 + (index * 7) % 10}px`,
            '--balloon-duration': `${9 + (index * 7) % 8}s`,
            '--balloon-delay': `${-((index * 3) % 16)}s`,
            '--balloon-color': balloonColors[index % balloonColors.length],
          } as CSSProperties}
        />
      ))}
      {[18, 49, 78, 91].map((position, index) => (
        <span
          className="fallback-firework"
          key={`firework-${position}`}
          style={{
            '--firework-x': `${position}%`,
            '--firework-y': `${17 + (index % 2) * 18}%`,
            '--firework-delay': `${-index * 0.85}s`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}

export function AmbientCelebrationBackground({ showCakes }: { showCakes: boolean }) {
  return (
    <AmbientSceneErrorBoundary>
      <Canvas
        dpr={[1, 1.25]}
        camera={{ position: [0, 0, 11], fov: 42, near: 0.1, far: 40 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      >
        <BackgroundCakeScene showCakes={showCakes} />
        <BalloonField />
        <ContinuousFireworks />
      </Canvas>
    </AmbientSceneErrorBoundary>
  )
}

function BalloonField() {
  const { size, viewport } = useThree()
  const isMobile = size.width < 600
  const count = isMobile ? 28 : 48
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const knotRef = useRef<THREE.InstancedMesh>(null)
  const stringRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const balloons = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const random = (offset: number) => seededValue(index * 19 + offset)
        return {
          x: ((index + random(3) * 0.65) / count) - 0.5,
          size: (0.075 + random(17) * 0.07) * (isMobile ? 0.58 : 0.72),
          duration: 9 + random(29) * 9,
          delay: (index / count) * 5,
          phase: random(53) * Math.PI * 2,
          sway: 0.05 + random(67) * 0.13,
          color: new THREE.Color(['#f38ab8', '#b898e7', '#d9bd72', '#fff0e7', '#ed719f'][index % 5]),
        }
      }),
    [count, isMobile],
  )

  useFrame((state) => {
    const bodies = bodyRef.current
    const knots = knotRef.current
    const strings = stringRef.current
    if (!bodies || !knots || !strings) return

    const viewportWidth = viewport.width
    const viewportHeight = viewport.height
    const bottom = -viewportHeight / 2 - 0.5
    const travel = viewportHeight + 1

    balloons.forEach((balloon, index) => {
      const activeTime = Math.max(0, state.clock.elapsedTime - balloon.delay)
      const progress = (activeTime % balloon.duration) / balloon.duration
      const fade = Math.min(
        THREE.MathUtils.clamp(progress / 0.08, 0, 1),
        THREE.MathUtils.clamp((1 - progress) / 0.13, 0, 1),
      )
      const bob = Math.sin(state.clock.elapsedTime * 0.7 + balloon.phase)
      const x = balloon.x * viewportWidth + Math.sin(progress * Math.PI * 5 + balloon.phase) * balloon.sway
      const y = bottom + progress * travel
      const balloonScale = balloon.size * fade

      dummy.position.set(x, y, -0.45)
      dummy.rotation.set(0.08 * bob, Math.sin(balloon.phase) * 0.1, 0.12 * bob)
      dummy.scale.set(balloonScale * 0.76, balloonScale, balloonScale * 0.5)
      dummy.updateMatrix()
      bodies.setMatrixAt(index, dummy.matrix)
      bodies.setColorAt(index, balloon.color)

      dummy.position.set(x, y - balloonScale * 1.08, -0.45)
      dummy.rotation.set(Math.PI, 0, 0)
      dummy.scale.set(balloonScale * 0.12, balloonScale * 0.18, balloonScale * 0.12)
      dummy.updateMatrix()
      knots.setMatrixAt(index, dummy.matrix)
      knots.setColorAt(index, balloon.color)

      dummy.position.set(x, y - balloonScale * 1.8, -0.45)
      dummy.rotation.set(0, 0, bob * 0.07)
      dummy.scale.set(balloonScale * 0.018, balloonScale * 1.65, balloonScale * 0.018)
      dummy.updateMatrix()
      strings.setMatrixAt(index, dummy.matrix)
    })

    bodies.instanceMatrix.needsUpdate = true
    knots.instanceMatrix.needsUpdate = true
    strings.instanceMatrix.needsUpdate = true
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true
    if (knots.instanceColor) knots.instanceColor.needsUpdate = true
  })

  return (
    <>
      <ambientLight intensity={1.5} color="#f8dced" />
      <pointLight position={[-4, 5, 4]} color="#f28cbd" intensity={1} distance={18} />
      <pointLight position={[5, -3, 3]} color="#dfbd72" intensity={0.45} distance={14} />
      <Sparkles
        count={isMobile ? 5 : 12}
        scale={[viewport.width, viewport.height, 3]}
        size={isMobile ? 0.5 : 0.75}
        speed={0.22}
        color="#f7d797"
        opacity={0.15}
      />
      <instancedMesh ref={stringRef} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[1, 1, 1, 5]} />
        <meshBasicMaterial color="#f7dce7" transparent opacity={0.5} />
      </instancedMesh>
      <instancedMesh ref={knotRef} args={[undefined, undefined, count]}>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial roughness={0.35} metalness={0.08} />
      </instancedMesh>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshPhysicalMaterial roughness={0.28} metalness={0.04} clearcoat={0.8} clearcoatRoughness={0.22} />
      </instancedMesh>
    </>
  )
}

function ContinuousFireworks() {
  const { size, viewport } = useThree()
  const isMobile = size.width < 600
  const burstCount = isMobile ? 3 : 4
  const particlesPerBurst = isMobile ? 15 : 22
  const particleCount = burstCount * particlesPerBurst
  const burstParticlesRef = useRef<THREE.InstancedMesh>(null)
  const flashRef = useRef<THREE.InstancedMesh>(null)
  const rocketRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const fadedColor = useMemo(() => new THREE.Color(), [])
  const bursts = useMemo(
    () =>
      Array.from({ length: burstCount }, (_, burstIndex) => ({
        x: (seededValue(burstIndex + 301) - 0.5) * 0.82,
        y: (seededValue(burstIndex + 317) - 0.12) * 0.52,
        delay: burstIndex * 0.82,
        period: 3.15 + seededValue(burstIndex + 337) * 0.65,
        flashColor: new THREE.Color(['#fff2c6', '#ffe2f0', '#eee2ff', '#dafaff'][burstIndex % 4]),
        particles: Array.from({ length: particlesPerBurst }, (_, particleIndex) => {
          const seed = burstIndex * particlesPerBurst + particleIndex
          const angle = (particleIndex / particlesPerBurst) * Math.PI * 2
          const variation = seededValue(seed + 359)
          return {
            x: Math.cos(angle) * (0.45 + variation * 0.5),
            y: Math.sin(angle) * (0.45 + variation * 0.5) + (seededValue(seed + 383) - 0.5) * 0.38,
            z: (seededValue(seed + 401) - 0.5) * 0.25,
            color: new THREE.Color(['#ffe29a', '#ff91c5', '#d5bbff', '#9ce8f2'][burstIndex % 4]),
          }
        }),
      })),
    [burstCount, particlesPerBurst],
  )

  useFrame((state) => {
    const particleMesh = burstParticlesRef.current
    const flashMesh = flashRef.current
    const rocketMesh = rocketRef.current
    if (!particleMesh || !flashMesh || !rocketMesh) return

    const horizontalSpan = viewport.width * 0.9
    const verticalSpan = viewport.height * 0.68
    const rocketDuration = 0.46
    const particleLife = isMobile ? 0.88 : 1.05
    let instanceIndex = 0

    bursts.forEach((burst, burstIndex) => {
      const elapsed = state.clock.elapsedTime - burst.delay
      const age = elapsed < 0 ? -1 : elapsed % burst.period
      const anchorX = burst.x * horizontalSpan
      const anchorY = burst.y * verticalSpan
      const burstAge = age - rocketDuration
      const active = burstAge >= 0 && burstAge < particleLife
      const expansion = active ? Math.min(burstAge / 0.24, 1) : 0
      const fade = active ? Math.max(0, 1 - burstAge / particleLife) : 0

      dummy.position.set(anchorX, anchorY, -0.9)
      const flashScale = burstAge >= 0 && burstAge < 0.18
        ? (0.06 + burstAge * 0.9) * (isMobile ? 0.7 : 0.9)
        : 0.001
      dummy.scale.set(flashScale, flashScale, flashScale * 0.3)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      flashMesh.setMatrixAt(burstIndex, dummy.matrix)
      flashMesh.setColorAt(burstIndex, burst.flashColor)

      const rocketActive = age >= 0 && age < rocketDuration
      const rocketProgress = rocketActive ? age / rocketDuration : 0
      const rocketEase = 1 - (1 - rocketProgress) ** 2
      const rocketBottom = -viewport.height / 2 - 0.2
      dummy.position.set(
        anchorX,
        rocketActive ? rocketBottom + (anchorY - rocketBottom) * rocketEase : anchorY,
        -0.88,
      )
      const rocketScale = rocketActive ? (isMobile ? 0.028 : 0.038) : 0.001
      dummy.scale.set(rocketScale, rocketActive ? rocketScale * 2.8 : 0.001, rocketScale)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      rocketMesh.setMatrixAt(burstIndex, dummy.matrix)
      rocketMesh.setColorAt(burstIndex, burst.flashColor)

      burst.particles.forEach((particle) => {
        const ageForMotion = Math.max(0, burstAge)
        const distance = active ? expansion : 0
        const gravity = ageForMotion > 0.24 ? (ageForMotion - 0.24) ** 2 * 0.45 : 0
        dummy.position.set(
          anchorX + particle.x * distance,
          anchorY + particle.y * distance - gravity,
          -0.9 + particle.z * distance,
        )
        const particleScale = Math.max(0.001, (isMobile ? 0.025 : 0.035) * fade)
        dummy.scale.set(particleScale, particleScale, particleScale)
        dummy.rotation.set(ageForMotion * 1.4, ageForMotion * 1.8, ageForMotion * 1.2)
        dummy.updateMatrix()
        particleMesh.setMatrixAt(instanceIndex, dummy.matrix)
        fadedColor.copy(particle.color).multiplyScalar(fade)
        particleMesh.setColorAt(instanceIndex, fadedColor)
        instanceIndex += 1
      })
    })

    particleMesh.instanceMatrix.needsUpdate = true
    flashMesh.instanceMatrix.needsUpdate = true
    rocketMesh.instanceMatrix.needsUpdate = true
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true
    if (flashMesh.instanceColor) flashMesh.instanceColor.needsUpdate = true
    if (rocketMesh.instanceColor) rocketMesh.instanceColor.needsUpdate = true
  })

  return (
    <>
      <instancedMesh
        ref={burstParticlesRef}
        args={[undefined, undefined, particleCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 7, 6]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={flashRef}
        args={[undefined, undefined, burstCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={rocketRef}
        args={[undefined, undefined, burstCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  )
}
