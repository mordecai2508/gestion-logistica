import { useMutation, useQueryClient } from '@tanstack/react-query';
import { entregaService } from '@/services/entregaService';

interface RegistrarFalloVars {
  envioId: string;
  nota: string;
  foto?: File;
}

export const useRegistrarFallo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ envioId, nota, foto }: RegistrarFalloVars) =>
      entregaService.registrarFallo(envioId, nota, foto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['entregas', 'me'] });
    },
  });
};
