import { NavLink } from 'react-router-dom';
import { Route, Package, Map, User } from 'lucide-react';

interface BottomNavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: BottomNavItem[] = [
  { label: 'Rutas', path: '/repartidor/rutas', icon: <Route className="h-5 w-5" /> },
  { label: 'Entregas', path: '/repartidor/entregas', icon: <Package className="h-5 w-5" /> },
  { label: 'Mapa', path: '/repartidor/mapa', icon: <Map className="h-5 w-5" /> },
  { label: 'Perfil', path: '/perfil', icon: <User className="h-5 w-5" /> },
];

export function RepartidorBottomNav() {
  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around border-t bg-white py-2"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            [
              'flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors',
              isActive ? 'text-blue-600 bottom-nav-active' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
