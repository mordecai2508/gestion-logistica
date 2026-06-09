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

export interface ActualizarRepartidorInput {
  disponible?: boolean;
  licencia?: string;
}

export interface RepartidorMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListaRepartidoresDto {
  data: RepartidorDto[];
  meta: RepartidorMeta;
}

export interface ListarRepartidoresFiltros {
  page?: number;
  limit?: number;
  disponible?: boolean;
}
