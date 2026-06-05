export interface EventoEnvioTrackingDto {
  id: string;
  estado: string;
  descripcion: string;
  lat: number | null;
  lng: number | null;
  timestamp: string; // ISO 8601
}

export interface TrackingResponseDto {
  envioId: string;
  codigoSeguimiento: string;
  estado: string;
  remitente: string;
  destinatario: string;
  direccionDestino: string;
  ultimaActualizacion: string; // ISO 8601
  eventos: EventoEnvioTrackingDto[];
}

export interface TrackingLocationPayload {
  envioId: string;
  lat: number;
  lng: number;
  timestamp: string; // ISO 8601
}
