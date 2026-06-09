import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '@/hooks/useUnreadCount';

export function NotificationBell() {
  const navigate = useNavigate();
  const { count } = useUnreadCount();

  const badgeLabel = count > 99 ? '99+' : String(count);

  return (
    <button
      type="button"
      aria-label="Notificaciones"
      className="relative p-2 text-gray-600 hover:text-gray-900"
      onClick={() => navigate('/notificaciones')}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span
          aria-label={`${badgeLabel} notificaciones sin leer`}
          className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white"
        >
          {badgeLabel}
        </span>
      )}
    </button>
  );
}
