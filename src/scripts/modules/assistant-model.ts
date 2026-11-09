import type { BufferAttribute, Material, PerspectiveCamera, SkinnedMesh, WebGLRenderer } from 'three'

// Шея в координатах сетки модели: выше HEAD_FROM голова целиком, ниже NECK_Y тело неподвижно
const NECK_Y = -0.22
const HEAD_FROM = -0.06
const PIVOT = { x: 0, y: -0.14, z: 0.03 }

/**
 * Статичная 3D-модель помощника: голова поворачивается за курсором.
 * Кость головы в файле почти не имеет весов, поэтому голова поворачивается деформацией сетки вокруг шеи.
 * Three.js и загрузчик подгружаются лениво; кадры рисуются только пока голова движется.
 */
export async function mountAssistantModel(
  canvas: HTMLCanvasElement,
  modelUrl: string,
  follow: boolean,
): Promise<void> {
  const THREE = await import('three')
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')

  const renderer: WebGLRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  // Не меньше 2x: глаза и мелкие детали на маленьком холсте остаются чёткими
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 2), 3))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight(0xffffff, 3))
  const key = new THREE.DirectionalLight(0xffffff, 2.5)
  key.position.set(1, 2, 3)
  scene.add(key)

  const gltf = await new GLTFLoader().loadAsync(modelUrl)
  const model = gltf.scene
  scene.add(model)
  model.updateMatrixWorld(true)

  const skins: SkinnedMesh[] = []
  model.traverse((object) => {
    if ('isSkinnedMesh' in object) skins.push(object as SkinnedMesh)
  })
  const skinned = skins.at(0)

  // Светлее: материал не металлический, текстура подсвечивается собственным свечением
  if (skinned) {
    const materials: Material[] = Array.isArray(skinned.material) ? skinned.material : [skinned.material]
    for (const material of materials) {
      const lit = material as Material & {
        map?: unknown
        emissive?: { set: (color: number) => void }
        emissiveMap?: unknown
        emissiveIntensity?: number
        metalness?: number
        roughness?: number
      }
      if (lit.metalness !== undefined) lit.metalness = 0
      if (lit.roughness !== undefined) lit.roughness = 0.85
      if (lit.emissive && lit.map) {
        lit.emissive.set(0xffffff)
        lit.emissiveMap = lit.map
        lit.emissiveIntensity = 0.35
      }
      const texture = lit.map as { anisotropy: number; needsUpdate: boolean } | undefined
      if (texture) {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
        texture.needsUpdate = true
      }
      material.needsUpdate = true
    }
  }

  // Кадр по габариту модели
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const camera: PerspectiveCamera = new THREE.PerspectiveCamera(25, 1, 0.01, 1000)
  const halfTan = Math.tan((camera.fov * Math.PI) / 360)
  const aspect = canvas.clientWidth / canvas.clientHeight
  const distance = Math.max(size.y / (2 * halfTan), size.x / (2 * halfTan * aspect)) * 1.08 + size.z / 2
  camera.position.set(center.x, center.y, center.z + distance)
  camera.lookAt(center)

  const position = skinned?.geometry.getAttribute('position') as BufferAttribute | undefined
  const normal = skinned?.geometry.getAttribute('normal') as BufferAttribute | undefined
  const restPosition = position ? Float32Array.from(position.array) : undefined
  const restNormal = normal ? Float32Array.from(normal.array) : undefined

  let yaw = 0
  let pitch = 0
  let goalYaw = 0
  let goalPitch = 0
  let running = false

  const resize = (): void => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  /** Поворот головы: вершины выше шеи вращаются вокруг оси шеи, переход плавный. */
  const poseHead = (): void => {
    if (!position || !restPosition) return
    const out = position.array as Float32Array
    const normals = normal?.array as Float32Array | undefined
    const cy = Math.cos(yaw)
    const sy = Math.sin(yaw)
    const cp = Math.cos(pitch)
    const sp = Math.sin(pitch)
    for (let i = 0; i < restPosition.length; i += 3) {
      const x = restPosition[i] ?? 0
      const y = restPosition[i + 1] ?? 0
      const z = restPosition[i + 2] ?? 0
      let t = (y - NECK_Y) / (HEAD_FROM - NECK_Y)
      t = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t)
      if (t === 0) {
        out[i] = x
        out[i + 1] = y
        out[i + 2] = z
        if (normals && restNormal) {
          normals[i] = restNormal[i] ?? 0
          normals[i + 1] = restNormal[i + 1] ?? 0
          normals[i + 2] = restNormal[i + 2] ?? 0
        }
        continue
      }
      const a = yaw * t
      const b = pitch * t
      const ca = t === 1 ? cy : Math.cos(a)
      const sa = t === 1 ? sy : Math.sin(a)
      const cb = t === 1 ? cp : Math.cos(b)
      const sb = t === 1 ? sp : Math.sin(b)
      const rotate = (px: number, py: number, pz: number): [number, number, number] => {
        // сначала наклон вокруг X, затем поворот вокруг Y
        const y1 = py * cb - pz * sb
        const z1 = py * sb + pz * cb
        return [px * ca + z1 * sa, y1, -px * sa + z1 * ca]
      }
      const [rx, ry, rz] = rotate(x - PIVOT.x, y - PIVOT.y, z - PIVOT.z)
      out[i] = rx + PIVOT.x
      out[i + 1] = ry + PIVOT.y
      out[i + 2] = rz + PIVOT.z
      if (normals && restNormal) {
        const [nx, ny, nz] = rotate(restNormal[i] ?? 0, restNormal[i + 1] ?? 0, restNormal[i + 2] ?? 0)
        normals[i] = nx
        normals[i + 1] = ny
        normals[i + 2] = nz
      }
    }
    position.needsUpdate = true
    if (normal) normal.needsUpdate = true
  }

  const draw = (): void => {
    poseHead()
    renderer.render(scene, camera)
  }
  const tick = (): void => {
    yaw += (goalYaw - yaw) * 0.15
    pitch += (goalPitch - pitch) * 0.15
    draw()
    if (Math.abs(goalYaw - yaw) > 0.002 || Math.abs(goalPitch - pitch) > 0.002) requestAnimationFrame(tick)
    else running = false
  }

  resize()
  draw()
  canvas.dataset['ready'] = 'true'
  new ResizeObserver(() => {
    resize()
    draw()
  }).observe(canvas)

  if (!follow || !position) return
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return
    const rect = canvas.getBoundingClientRect()
    const dx = (event.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2)
    const dy = (event.clientY - (rect.top + rect.height * 0.25)) / (window.innerHeight / 2)
    goalYaw = Math.max(-1, Math.min(1, dx)) * 0.5
    goalPitch = Math.max(-1, Math.min(1, dy)) * 0.25
    if (!running) {
      running = true
      requestAnimationFrame(tick)
    }
  })
}
