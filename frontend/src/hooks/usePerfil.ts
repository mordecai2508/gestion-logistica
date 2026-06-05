import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';

export function usePerfil() {
  return useQuery({
    queryKey: ['perfil'],
    queryFn: userService.getPerfil,
  });
}
