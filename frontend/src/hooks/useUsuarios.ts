import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usuarioService } from '@/services/usuarioService';
import type { ListarUsuariosFiltros, ActualizarEstadoUsuarioInput } from '@/types/usuarioTypes';

export const useUsuarios = (filtros: ListarUsuariosFiltros = {}) => {
  return useQuery({
    queryKey: ['usuarios', filtros],
    queryFn: () => usuarioService.listar(filtros),
  });
};

export const useUsuario = (id: string | null) => {
  return useQuery({
    queryKey: ['usuarios', id],
    queryFn: () => usuarioService.obtenerPorId(id!),
    enabled: id !== null,
  });
};

export const useActualizarEstadoUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ActualizarEstadoUsuarioInput }) =>
      usuarioService.actualizarEstado(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
};
