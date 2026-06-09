export interface RepartidorDto {
  id: string;
  licencia: string | null;
  disponible: boolean;
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    telefono: string | null;
  };
}

// Alias — lista y detalle comparten la misma forma
export type RepartidorDetalleDto = RepartidorDto;

export interface ListaRepartidoresResponse {
  data: RepartidorDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ActualizarRepartidorDto {
  disponible?: boolean;
  licencia?: string;
}

export interface ListarRepartidoresInput {
  page: number;
  limit: number;
  disponible?: boolean;
}
