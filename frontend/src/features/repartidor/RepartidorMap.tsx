import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import type { EnvioEnRutaDto } from '@/types/rutaTypes';

// Fix default marker icon for webpack/vite bundlers
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MAP_ZOOM = 13;

interface RepartidorMapProps {
  envios: EnvioEnRutaDto[];
}

export function RepartidorMap({ envios }: RepartidorMapProps) {
  const primero = envios[0];
  const center: [number, number] = [primero.lat as number, primero.lng as number];

  return (
    <MapContainer center={center} zoom={MAP_ZOOM} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {envios.map((envio) => (
        <Marker key={envio.id} position={[envio.lat as number, envio.lng as number]} />
      ))}
    </MapContainer>
  );
}
