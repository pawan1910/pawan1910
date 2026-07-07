import { useEffect, useRef } from 'react'
import { StyleSheet } from 'react-native'
import MapView, { Polygon, Circle, type Region } from 'react-native-maps'
import { useGameStore } from '../store/gameStore'

export default function HexMap() {
  const mapRef = useRef<MapView>(null)
  const { cells, claimCell, setPosition, loadCells, position } = useGameStore()
  const initialRegionSet = useRef(false)

  useEffect(() => {
    if (!position || initialRegionSet.current) return
    mapRef.current?.animateToRegion({
      latitude: position.lat,
      longitude: position.lng,
      latitudeDelta: 0.003,
      longitudeDelta: 0.003,
    })
    initialRegionSet.current = true
  }, [position])

  function handleRegionChange(region: Region) {
    const { latitude: lat, longitude: lng, latitudeDelta: dLat, longitudeDelta: dLng } = region
    loadCells({
      minLat: lat - dLat / 2,
      minLng: lng - dLng / 2,
      maxLat: lat + dLat / 2,
      maxLng: lng + dLng / 2,
    })
  }

  const hexPolygons = Array.from(cells.values()).map((cell) => {
    // Use pre-computed boundary from the server instead of h3-js
    const boundary = cell.boundary
    if (!boundary || boundary.length === 0) return null
    const coordinates = boundary.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
    const color = cell.ownerColor || '#475569'
    return (
      <Polygon
        key={cell.h3Index}
        coordinates={coordinates}
        fillColor={cell.ownerId ? `${color}70` : `${color}15`}
        strokeColor={color}
        strokeWidth={1.5}
        tappable
        onPress={() => {
          const centerLat = coordinates.reduce((s, c) => s + c.latitude, 0) / coordinates.length
          const centerLng = coordinates.reduce((s, c) => s + c.longitude, 0) / coordinates.length
          claimCell(centerLat, centerLng)
        }}
      />
    )
  })

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      showsUserLocation
      followsUserLocation={false}
      showsMyLocationButton
      onRegionChangeComplete={handleRegionChange}
      onUserLocationChange={(e) => {
        const coord = e.nativeEvent.coordinate
        if (coord) {
          setPosition(coord.latitude, coord.longitude)
        }
      }}
      mapType="standard"
    >
      {hexPolygons}
    </MapView>
  )
}

const styles = StyleSheet.create({
  map: { flex: 1 },
})
