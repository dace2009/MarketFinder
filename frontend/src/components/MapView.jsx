import { useMapEvents, Marker, Circle, Popup } from 'react-leaflet'
import { MapContainer, TileLayer } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const resultIcon = L.divIcon({
  className: 'result-marker',
  html: '<div class="result-marker-inner"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
})

function LocationMarker({ center, onCenterChange, radius }) {
  useMapEvents({
    click(e) {
      onCenterChange([e.latlng.lat, e.latlng.lng])
    },
  })

  const radiusKm = Math.round(radius / 1000)

  return (
    <>
      <Marker
        position={center}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const pos = e.target.getLatLng()
            onCenterChange([pos.lat, pos.lng])
          },
        }}
      >
        <Popup>
          Centro de búsqueda<br />
          <strong>Radio: {radiusKm} km</strong>
        </Popup>
      </Marker>
      <Circle
        center={center}
        radius={radius}
        pathOptions={{
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '8 4',
        }}
      />
    </>
  )
}

function ResultMarkers({ results, onPlaceClick }) {
  return results.map((place) => {
    const coords = place.coordenadas
    if (!coords || !coords.lat || !coords.lng) return null
    return (
      <Marker
        key={place.place_id}
        position={[coords.lat, coords.lng]}
        icon={resultIcon}
        eventHandlers={{
          click: () => onPlaceClick(place.place_id),
        }}
      >
        <Popup>
          <div className="map-popup">
            <strong>{place.nombre}</strong>
            <br />
            <span className="popup-rating">
              {'★'.repeat(Math.round(place.calificacion || 0))}
              {'☆'.repeat(5 - Math.round(place.calificacion || 0))}
              {' '}{place.calificacion?.toFixed(1) || 'N/A'}
            </span>
            <br />
            <span className="popup-reviews">{place.total_resenas} reseñas</span>
          </div>
        </Popup>
      </Marker>
    )
  })
}

export default function MapView({ center, onCenterChange, results, onPlaceClick, radius }) {
  return (
    <MapContainer
      center={center}
      zoom={11}
      className="map-container"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker center={center} onCenterChange={onCenterChange} radius={radius} />
      <ResultMarkers results={results} onPlaceClick={onPlaceClick} />
    </MapContainer>
  )
}
