import { EstadoEnvio } from '@prisma/client';

export interface EntregaListItemDto {
  id: string;
  codigoSeguimiento: string;
  estado: EstadoEnvio;
  destinatario: string;
  direccionDestino: string;
  rutaId: string | null;
  updatedAt: string; // ISO 8601 UTC — referencia de "rango horario" en el wireframe
}

export interface EntregasAgrupadasDto {
  pendientes: EntregaListItemDto[];
  completadas: EntregaListItemDto[];
}

export interface ConfirmarEntregaResponseDto {
  id: string;
  codigoSeguimiento: string;
  estado: EstadoEnvio; // "ENTREGADO"
  evidenciaFoto: string;
  firma: string;
  fechaEntrega: string; // ISO 8601 UTC — timestamp del EventoEnvio creado
}

export interface RegistrarFalloResponseDto {
  id: string;
  codigoSeguimiento: string;
  estado: EstadoEnvio; // "FALLIDO"
  incidenciaId: string;
}

export interface ConfirmarEntregaInput {
  foto: Express.Multer.File;
  firma: Express.Multer.File;
}

export interface RegistrarFalloInput {
  nota: string;
  foto?: Express.Multer.File;
}
