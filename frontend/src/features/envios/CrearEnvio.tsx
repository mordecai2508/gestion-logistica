import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { useCrearEnvio } from '@/hooks/useCrearEnvio';
import { clienteService } from '@/services/clienteService';
import type { ClienteOption } from '@/services/clienteService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';

const crearEnvioSchemaFrontend = z.object({
  remitente: z.string().min(1, 'El remitente es requerido'),
  destinatario: z.string().min(1, 'El destinatario es requerido'),
  direccionDestino: z.string().min(1, 'La dirección de destino es requerida'),
  peso: z
    .number({ message: 'El peso debe ser un número' })
    .gt(0, 'El peso debe ser mayor a 0'),
  dimensiones: z
    .string()
    .regex(
      /^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$/i,
      'Las dimensiones deben tener formato WxHxD (ej. 30x20x15)',
    ),
  clienteId: z.string().min(1, 'El cliente es requerido'),
  descripcion: z.string().optional(),
});

type CrearEnvioFormData = z.infer<typeof crearEnvioSchemaFrontend>;

export function CrearEnvio() {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useCrearEnvio();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');

  // Combobox state
  const [clienteSearch, setClienteSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteOption | null>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Debounce the search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(clienteSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: clienteOptions = [] } = useQuery<ClienteOption[]>({
    queryKey: ['clientes', 'search', debouncedSearch],
    queryFn: () => clienteService.search(debouncedSearch),
    enabled: debouncedSearch.length >= 1,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CrearEnvioFormData>({
    resolver: zodResolver(crearEnvioSchemaFrontend),
  });

  const onSubmit = async (data: CrearEnvioFormData) => {
    try {
      await mutateAsync(data);
      setToastVariant('success');
      setToastMessage('Envío creado exitosamente');
      setTimeout(() => {
        void navigate('/envios');
      }, 1500);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          data?: { message?: string };
        };
        message?: string;
      };
      const msg =
        axiosErr?.response?.data?.message ??
        axiosErr?.message ??
        'Error al crear el envío. Intente de nuevo.';
      setToastVariant('error');
      setToastMessage(msg);
    }
  };

  const handleSelectCliente = (cliente: ClienteOption) => {
    setSelectedCliente(cliente);
    setClienteSearch(`${cliente.usuario.nombre} — ${cliente.usuario.correo}`);
    setValue('clienteId', cliente.id);
    setShowDropdown(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">Nuevo Envío</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Remitente */}
              <div className="space-y-1">
                <Label htmlFor="remitente">Remitente</Label>
                <Input
                  id="remitente"
                  type="text"
                  placeholder="Nombre del remitente"
                  aria-label="Remitente"
                  {...register('remitente')}
                />
                {errors.remitente && (
                  <p className="text-xs text-red-600">{errors.remitente.message}</p>
                )}
              </div>

              {/* Destinatario */}
              <div className="space-y-1">
                <Label htmlFor="destinatario">Destinatario</Label>
                <Input
                  id="destinatario"
                  type="text"
                  placeholder="Nombre del destinatario"
                  aria-label="Destinatario"
                  {...register('destinatario')}
                />
                {errors.destinatario && (
                  <p className="text-xs text-red-600">{errors.destinatario.message}</p>
                )}
              </div>

              {/* Dirección destino */}
              <div className="space-y-1">
                <Label htmlFor="direccionDestino">Dirección destino</Label>
                <div className="relative">
                  <Input
                    id="direccionDestino"
                    type="text"
                    placeholder="Ingrese la dirección de destino"
                    aria-label="Dirección destino"
                    className="pr-10"
                    {...register('direccionDestino')}
                  />
                  <MapPin
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                    aria-hidden="true"
                  />
                </div>
                {errors.direccionDestino && (
                  <p className="text-xs text-red-600">{errors.direccionDestino.message}</p>
                )}
              </div>

              {/* Peso y Dimensiones en la misma fila (D3B) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Peso */}
                <div className="space-y-1">
                  <Label htmlFor="peso">Peso en kg</Label>
                  <Input
                    id="peso"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    aria-label="Peso en kg"
                    {...register('peso', { valueAsNumber: true })}
                  />
                  {errors.peso && (
                    <p className="text-xs text-red-600">{errors.peso.message}</p>
                  )}
                </div>

                {/* Dimensiones */}
                <div className="space-y-1">
                  <Label htmlFor="dimensiones">Dimensiones en cm</Label>
                  <Input
                    id="dimensiones"
                    type="text"
                    placeholder="30x20x15"
                    aria-label="Dimensiones en cm"
                    {...register('dimensiones')}
                  />
                  {errors.dimensiones && (
                    <p className="text-xs text-red-600">{errors.dimensiones.message}</p>
                  )}
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <Label htmlFor="descripcion">Descripción del paquete</Label>
                <textarea
                  id="descripcion"
                  placeholder="Descripción opcional del paquete"
                  aria-label="Descripción del paquete"
                  className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('descripcion')}
                />
                {errors.descripcion && (
                  <p className="text-xs text-red-600">{errors.descripcion.message}</p>
                )}
              </div>

              {/* Cliente — combobox/buscador (D3A) */}
              <div className="space-y-1" ref={comboboxRef}>
                <Label htmlFor="clienteSearch">Cliente</Label>
                {/* Hidden field for form submission */}
                <input type="hidden" {...register('clienteId')} />
                <Input
                  id="clienteSearch"
                  type="search"
                  placeholder="Buscar cliente por nombre o correo"
                  aria-label="Buscar cliente"
                  value={clienteSearch}
                  autoComplete="off"
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    setSelectedCliente(null);
                    setValue('clienteId', '');
                    setShowDropdown(true);
                  }}
                  onFocus={() => {
                    if (clienteSearch.length >= 1) setShowDropdown(true);
                  }}
                />
                {showDropdown && clienteOptions.length > 0 && (
                  <ul
                    role="listbox"
                    aria-label="Opciones de cliente"
                    className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg"
                  >
                    {clienteOptions.map((cliente) => (
                      <li
                        key={cliente.id}
                        role="option"
                        aria-selected={selectedCliente?.id === cliente.id}
                        className="cursor-pointer px-3 py-2 text-sm hover:bg-blue-50"
                        onMouseDown={() => handleSelectCliente(cliente)}
                      >
                        {cliente.usuario.nombre} — {cliente.usuario.correo}
                      </li>
                    ))}
                  </ul>
                )}
                {errors.clienteId && (
                  <p className="text-xs text-red-600">{errors.clienteId.message}</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isPending}
                >
                  {isPending ? 'Guardando...' : 'GUARDAR ENVÍO'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => void navigate('/envios')}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

export default CrearEnvio;
