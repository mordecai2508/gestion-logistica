import { Menu } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { NotificationBell } from './NotificationBell';
import { ProfileMenu } from './ProfileMenu';

interface OperadorTopbarProps {
  onMenuToggle: () => void;
}

export function OperadorTopbar({ onMenuToggle }: OperadorTopbarProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-white px-4">
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={onMenuToggle}
        className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <form
        aria-label="Búsqueda global"
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-1 items-center"
      >
        <input
          type="search"
          aria-label="Buscar"
          placeholder="Buscar..."
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </form>

      <div className="flex items-center gap-1">
        <NotificationBell />
        {user && <ProfileMenu userName={user.nombre} />}
      </div>
    </header>
  );
}
