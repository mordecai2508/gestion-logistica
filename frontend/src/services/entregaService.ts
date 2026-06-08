import api from './api';
import type {
  EntregasAgrupadasDto,
  ConfirmarEntregaResponseDto,
  RegistrarFalloResponseDto,
} from '@/types/entregaTypes';

interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
}

export const entregaService = {
  async listarMisEntregas(): Promise<EntregasAgrupadasDto> {
    const res = await api.get<ApiResponse<EntregasAgrupadasDto>>('/entregas', {
      params: { repartidorId: 'me' },
    });
    return res.data.data;
  },

  async confirmar(
    envioId: string,
    foto: File,
    firma: Blob,
  ): Promise<ConfirmarEntregaResponseDto> {
    const formData = new FormData();
    formData.append('foto', foto);
    formData.append('firma', firma, 'firma.png');
    const res = await api.post<ApiResponse<ConfirmarEntregaResponseDto>>(
      `/envios/${envioId}/confirmar`,
      formData,
    );
    return res.data.data;
  },

  async registrarFallo(
    envioId: string,
    nota: string,
    foto?: File,
  ): Promise<RegistrarFalloResponseDto> {
    const formData = new FormData();
    formData.append('nota', nota);
    if (foto) {
      formData.append('foto', foto);
    }
    const res = await api.post<ApiResponse<RegistrarFalloResponseDto>>(
      `/envios/${envioId}/fallo`,
      formData,
    );
    return res.data.data;
  },
};
