import { cn } from '@/lib/utils';

export interface ToastProps {
  message: string;
  variant?: 'default' | 'error' | 'success';
  onClose?: () => void;
}

export function Toast({ message, variant = 'default', onClose }: ToastProps) {
  const variantClass =
    variant === 'error'
      ? 'bg-red-50 border-red-400 text-red-800'
      : variant === 'success'
        ? 'bg-green-50 border-green-400 text-green-800'
        : 'bg-white border-gray-300 text-gray-800';

  return (
    <div
      role="alert"
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-md border px-4 py-3 shadow-md',
        variantClass,
      )}
    >
      <span className="text-sm font-medium">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-current opacity-70 hover:opacity-100"
          aria-label="Cerrar notificación"
        >
          ×
        </button>
      )}
    </div>
  );
}
