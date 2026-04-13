import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react'

interface Props {
  file: File
  /** Receives the cropped PNG blob (512×512, circle-clipped). */
  onSave: (blob: Blob) => void
  onCancel: () => void
}

const CROP_PX = 280  // displayed crop viewport
const OUT_PX  = 512  // output canvas size

export function PhotoCropModal({ file, onSave, onCancel }: Props) {
  const [imgUrl] = useState(() => URL.createObjectURL(file))

  const naturalW = useRef(0)
  const naturalH = useRef(0)
  const minZoom  = useRef(1)

  const [zoom,   setZoom]   = useState(1)
  const [pan,    setPan]    = useState({ x: 0, y: 0 })
  const [loaded, setLoaded] = useState(false)

  const zoomRef = useRef(zoom)
  const panRef  = useRef(pan)
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current  = pan  }, [pan])

  const imgRef   = useRef<HTMLImageElement>(null)
  const dragging = useRef(false)
  const lastXY   = useRef({ x: 0, y: 0 })

  useEffect(() => () => URL.revokeObjectURL(imgUrl), [imgUrl])

  // ── Image loaded ───────────────────────────────────────────────────────────
  const handleLoad = useCallback(() => {
    const img = imgRef.current
    if (!img) return
    naturalW.current = img.naturalWidth
    naturalH.current = img.naturalHeight
    const cover = Math.max(CROP_PX / img.naturalWidth, CROP_PX / img.naturalHeight)
    minZoom.current = cover
    zoomRef.current = cover
    panRef.current  = { x: 0, y: 0 }
    setZoom(cover)
    setPan({ x: 0, y: 0 })
    setLoaded(true)
  }, [])

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    lastXY.current = { x: e.clientX, y: e.clientY }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const dx = e.clientX - lastXY.current.x
    const dy = e.clientY - lastXY.current.y
    lastXY.current = { x: e.clientX, y: e.clientY }
    const clamped = clampPan(
      panRef.current.x + dx,
      panRef.current.y + dy,
      zoomRef.current,
      naturalW.current,
      naturalH.current,
    )
    panRef.current = clamped
    setPan(clamped)
  }

  const onPointerUp = () => { dragging.current = false }

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const changeZoom = (delta: number) => {
    const next = Math.min(8, Math.max(minZoom.current, zoomRef.current + delta))
    const clamped = clampPan(panRef.current.x, panRef.current.y, next, naturalW.current, naturalH.current)
    zoomRef.current = next
    panRef.current  = clamped
    setZoom(next)
    setPan(clamped)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const z = zoomRef.current
    const p = panRef.current
    const w = naturalW.current
    const h = naturalH.current

    const canvas = document.createElement('canvas')
    canvas.width  = OUT_PX
    canvas.height = OUT_PX
    const ctx = canvas.getContext('2d')!

    // Clip to circle
    ctx.beginPath()
    ctx.arc(OUT_PX / 2, OUT_PX / 2, OUT_PX / 2, 0, Math.PI * 2)
    ctx.clip()

    const halfSrc = CROP_PX / (2 * z)
    const srcX = Math.max(0, w / 2 - halfSrc - p.x / z)
    const srcY = Math.max(0, h / 2 - halfSrc - p.y / z)
    const srcW = Math.min(CROP_PX / z, w - srcX, h - srcY)

    ctx.drawImage(imgRef.current!, srcX, srcY, srcW, srcW, 0, 0, OUT_PX, OUT_PX)

    // PNG keeps transparency (important for profile photos) and is always
    // decodable by the backend image crate without extra feature flags.
    canvas.toBlob(blob => { if (blob) onSave(blob) }, 'image/png')
  }

  // ── Image CSS position ─────────────────────────────────────────────────────
  const imgStyle: React.CSSProperties = loaded
    ? {
        position: 'absolute',
        left:   CROP_PX / 2 + pan.x - (naturalW.current * zoom) / 2,
        top:    CROP_PX / 2 + pan.y - (naturalH.current * zoom) / 2,
        width:  naturalW.current * zoom,
        height: naturalH.current * zoom,
        userSelect:    'none',
        pointerEvents: 'none',
      }
    : { display: 'none' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Crop Photo</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop area */}
        <div className="p-5 flex flex-col items-center gap-4">
          {/* Circular viewport */}
          <div
            className="relative rounded-full overflow-hidden cursor-grab active:cursor-grabbing bg-[repeating-conic-gradient(#e5e7eb_0%_25%,white_0%_50%)] bg-[length:16px_16px] ring-4 ring-teal-500/30"
            style={{ width: CROP_PX, height: CROP_PX }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <img
              ref={imgRef}
              src={imgUrl}
              alt=""
              onLoad={handleLoad}
              style={imgStyle}
              draggable={false}
            />
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeZoom(-0.15)}
              disabled={!loaded}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-teal-500 hover:text-teal-600 disabled:opacity-40 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500 w-16 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => changeZoom(0.15)}
              disabled={!loaded}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-teal-500 hover:text-teal-600 disabled:opacity-40 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-400">Drag to reposition · Zoom to scale</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!loaded}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────────────────

function clampPan(x: number, y: number, zoom: number, nW: number, nH: number) {
  if (!nW) return { x, y }
  const maxX = Math.max(0, (nW * zoom - CROP_PX) / 2)
  const maxY = Math.max(0, (nH * zoom - CROP_PX) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  }
}
