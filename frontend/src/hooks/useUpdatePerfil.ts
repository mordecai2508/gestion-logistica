import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import type { UpdatePerfilInput } from '@/types/userTypes';

export function useUpdatePerfil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdatePerfilInput) => userService.updatePerfil(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['perfil'] });
    },
  });
}
