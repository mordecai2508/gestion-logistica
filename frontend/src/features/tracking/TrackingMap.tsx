import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

// Fix default marker icon for webpack/vite bundlers
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_LAT = 4.711;
const DEFAULT_LNG = -74.0721;
const DEFAULT_ZOOM = 12;
const MARKER_ZOOM = 14;

interface TrackingMapProps {
  lat: number | null;
  lng: number | null;
}

export function TrackingMap({ lat, lng }: TrackingMapProps) {
  const hasPosition = lat !== null && lng !== null;
  const center: [number, number] = hasPosition ? [lat, lng] : [DEFAULT_LAT, DEFAULT_LNG];
  const zoom = hasPosition ? MARKER_ZOOM : DEFAULT_ZOOM;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '400px', width: '100%' }}
      key={`${lat}-${lng}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hasPosition && <Marker position={[lat, lng]} />}
    </MapContainer>
  );
}
