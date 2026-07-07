'use client'
import { useEffect, useRef, useCallback } from 'react'
import { cellToBoundary } from 'h3-js'
import { useGameStore } from '@/store/gameStore'
import type { HexCell } from '@hex-territory/shared'
import 'leaflet/dist/leaflet.css'

// Type-only import — Leaflet is loaded at runtime via require() to avoid SSR
import type * as LeafletType from 'leaflet'

// Leaflet's Map type, extended with the two custom tracking properties we add at runtime
interface ExtendedMap extends LeafletType.Map {
  _located?: boolean
  _userMarker?: LeafletType.CircleMarker
}

export default function HexMap() {
  const mapRef = useRef<ExtendedMap | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const polygonsRef = useRef<Map<string, LeafletType.Polygon>>(new Map())
  const watchIdRef = useRef<number | null>(null)
  const { cells, claimCell, setPosition, loadCells } = useGameStore()

  const drawCells = useCallback(
    (L: typeof LeafletType, incoming: Map<string, HexCell>) => {
      if (!mapRef.current) return
      incoming.forEach((cell, h3Index) => {
        const color = cell.ownerColor ?? '#64748b'
        const isOwned = !!cell.ownerId
        const fillOpacity = isOwned ? 0.35 : 0.04
        const weight = isOwned ? 2.5 : 1.2
        const opacity = isOwned ? 0.9 : 0.45

        const existing = polygonsRef.current.get(h3Index)
        if (existing) {
          existing.setStyle({ color, fillColor: color, fillOpacity, weight, opacity })
          return
        }
        const boundary = cellToBoundary(h3Index)
        const latLngs = boundary.map(([lat, lng]) => [lat, lng] as [number, number])
        const polygon = L.polygon(latLngs, {
          color,
          fillColor: color,
          fillOpacity,
          weight,
          opacity,
          dashArray: isOwned ? undefined : '4, 4',
        }).addTo(mapRef.current!)
        polygon.on('click', () => {
          const c = polygon.getBounds().getCenter()
          claimCell(c.lat, c.lng)
        })
        polygonsRef.current.set(h3Index, polygon)
      })
    },
    [claimCell],
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Dynamic require keeps Leaflet out of the SSR bundle
    const L = require('leaflet') as typeof LeafletType

    // Fix Leaflet default icon paths broken by webpack
    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    const map = L.map(containerRef.current, { zoomControl: true }).setView([20, 0], 3) as ExtendedMap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map

    map.on('moveend', () => {
      const b = map.getBounds()
      loadCells({ minLat: b.getSouth(), minLng: b.getWest(), maxLat: b.getNorth(), maxLng: b.getEast() })
    })

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        setPosition(lat, lng)

        if (!map._located) {
          map.setView([lat, lng], 17)
          map._located = true
        }

        if (map._userMarker) {
          map._userMarker.setLatLng([lat, lng])
        } else {
          map._userMarker = L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: '#3b82f6',
            color: '#fff',
            weight: 2.5,
            fillOpacity: 1,
          })
            .addTo(map)
            .bindTooltip('You', { permanent: false })
        }
      },
      (err) => console.warn('GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 2000 },
    )

    return () => {
      map.remove()
      mapRef.current = null
      polygonsRef.current.clear()
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [setPosition, loadCells])

  useEffect(() => {
    if (!mapRef.current) return
    const L = require('leaflet') as typeof LeafletType
    drawCells(L, cells)
  }, [cells, drawCells])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#0f172a' }}
    />
  )
}
