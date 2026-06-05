export interface TrackingEventoDto {
  id: string;
  estado: string;
  descripcion: string;
  lat: number | null;
  lng: number | null;
  timestamp: Date;
}

export interface TrackingResponseDto {
  envioId: string;
  codigoSeguimiento: string;
  estado: string;
  remitente: string;
  destinatario: string;
  direccionDestino: string;
  ultimaActualizacion: Date;
  eventos: TrackingEventoDto[];
}

export interface CreateEventoUbicacionDto {
  envioId: string;
  estado: string;
  descripcion: string;
  lat: number;
  lng: number;
}
