import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEditarEnvio } from '@/hooks/useEditarEnvio';
import { useEnvioDetalle } from '@/hooks/useEnvioDetalle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toast } from '@/components/ui/toast';

const editarEnvioSchemaFrontend = z.object({
  remitente: z.string().min(1, 'El remitente no puede estar vacío').optional(),
  destinatario: z.string().min(1, 'El destinatario no puede estar vacío').optional(),
  direccionDestino: z.string().min(1, 'La dirección no puede estar vacía').optional(),
  peso: z
    .number({ message: 'El peso debe ser un número' })
    .gt(0, 'El peso debe ser mayor a 0')
    .optional(),
  dimensiones: z
    .string()
    .regex(
      /^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$/i,
      'Las dimensiones deben tener formato WxHxD (ej. 30x20x15)',
    )
    .optional(),
  descripcion: z.string().nullable().optional(),
});

type EditarEnvioFormData = z.infer<typeof editarEnvioSchemaFrontend>;

interface EditarEnvioModalProps {
  envioId: string;
  onClose: () => void;
}

type ToastState = { message: string; variant: 'success' | 'error' } | null;

export function EditarEnvioModal({ envioId, onClose }: EditarEnvioModalProps) {
  const { data: envio, isLoading } = useEnvioDetalle(envioId);
  const { mutateAsync, isPending } = useEditarEnvio(envioId);
  const [toast, setToast] = useState<ToastState>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditarEnvioFormData>({
    resolver: zodResolver(editarEnvioSchemaFrontend),
  });

  useEffect(() => {
    if (envio) {
      reset({
        remitente: envio.remitente,
        destinatario: envio.destinatario,
        direccionDestino: envio.direccionDestino,
        peso: envio.peso,
        dimensiones: envio.dimensiones,
        descripcion: envio.descripcion ?? undefined,
      });
    }
  }, [envio, reset]);

  const onSubmit = async (data: EditarEnvioFormData) => {
    try {
      await mutateAsync(data);
      setToast({ message: 'Envío actualizado exitosamente', variant: 'success' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosErr?.response?.data?.message ??
        axiosErr?.message ??
        'Error al actualizar el envío';
      setToast({ message: msg, variant: 'error' });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="editar-envio-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 id="editar-envio-title" className="mb-4 text-xl font-bold text-gray-900">
          Editar Envío
        </h2>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Cargando datos...</div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Remitente */}
            <div className="space-y-1">
              <Label htmlFor="edit-remitente">Remitente</Label>
              <Input
                id="edit-remitente"
                type="text"
                aria-label="Remitente"
                {...register('remitente')}
              />
              {errors.remitente && (
                <p className="text-xs text-red-600">{errors.remitente.message}</p>
              )}
            </div>

            {/* Destinatario */}
            <div className="space-y-1">
              <Label htmlFor="edit-destinatario">Destinatario</Label>
              <Input
                id="edit-destinatario"
                type="text"
                aria-label="Destinatario"
                {...register('destinatario')}
              />
              {errors.destinatario && (
                <p className="text-xs text-red-600">{errors.destinatario.message}</p>
              )}
            </div>

            {/* Dirección destino */}
            <div className="space-y-1">
              <Label htmlFor="edit-direccionDestino">Dirección destino</Label>
              <Input
                id="edit-direccionDestino"
                type="text"
                aria-label="Dirección destino"
                {...register('direccionDestino')}
              />
              {errors.direccionDestino && (
                <p className="text-xs text-red-600">{errors.direccionDestino.message}</p>
              )}
            </div>

            {/* Peso y Dimensiones */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-peso">Peso en kg</Label>
                <Input
                  id="edit-peso"
                  type="number"
                  step="0.01"
                  min="0.01"
                  aria-label="Peso en kg"
                  {...register('peso', { valueAsNumber: true })}
                />
                {errors.peso && (
                  <p className="text-xs text-red-600">{errors.peso.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-dimensiones">Dimensiones en cm</Label>
                <Input
                  id="edit-dimensiones"
                  type="text"
                  aria-label="Dimensiones en cm"
                  placeholder="30x20x15"
                  {...register('dimensiones')}
                />
                {errors.dimensiones && (
                  <p className="text-xs text-red-600">{errors.dimensiones.message}</p>
                )}
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-1">
              <Label htmlFor="edit-descripcion">Descripción</Label>
              <textarea
                id="edit-descripcion"
                aria-label="Descripción"
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                {...register('descripcion')}
              />
              {errors.descripcion && (
                <p className="text-xs text-red-600">{errors.descripcion.message}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? 'Guardando...' : 'GUARDAR CAMBIOS'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default EditarEnvioModal;
