import { useMutation, useQueryClient } from '@tanstack/react-query';
import { entregaService } from '@/services/entregaService';

interface ConfirmarEntregaVars {
  envioId: string;
  foto: File;
  firma: Blob;
}

export const useConfirmarEntrega = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ envioId, foto, firma }: ConfirmarEntregaVars) =>
      entregaService.confirmar(envioId, foto, firma),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['entregas', 'me'] });
    },
  });
};
