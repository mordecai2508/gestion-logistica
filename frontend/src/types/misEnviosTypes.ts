export interface MisEnviosItemDto {
  id: string;
  codigoSeguimiento: string;
  estado: string;
  destinatario: string;
  createdAt: string;
}

export interface MisEnviosFilters {
  page?: number;
  limit?: number;
  estado?: string;
}
