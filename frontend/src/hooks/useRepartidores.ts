import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repartidorService } from '@/services/repartidorService';
import type { ListarRepartidoresFiltros, ActualizarRepartidorInput } from '@/types/repartidorTypes';

export const useRepartidores = (filtros: ListarRepartidoresFiltros = {}) => {
  return useQuery({
    queryKey: ['repartidores', filtros],
    queryFn: () => repartidorService.listar(filtros),
  });
};

export const useRepartidor = (id: string | null) => {
  return useQuery({
    queryKey: ['repartidores', id],
    queryFn: () => repartidorService.obtenerPorId(id!),
    enabled: id !== null,
  });
};

export const useActualizarRepartidor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ActualizarRepartidorInput }) =>
      repartidorService.actualizar(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['repartidores'] });
    },
  });
};
