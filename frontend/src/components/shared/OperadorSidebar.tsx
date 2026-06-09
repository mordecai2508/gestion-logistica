import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Route,
  Truck,
  AlertTriangle,
  FileBarChart,
  Users,
  UserCheck,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Envíos', path: '/envios', icon: <Package className="h-4 w-4" /> },
  { label: 'Rutas', path: '/rutas', icon: <Route className="h-4 w-4" /> },
  { label: 'Vehículos', path: '/vehiculos', icon: <Truck className="h-4 w-4" /> },
  { label: 'Repartidores', path: '/repartidores', icon: <UserCheck className="h-4 w-4" /> },
  { label: 'Incidencias', path: '/incidencias', icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Reportes', path: '/reportes', icon: <FileBarChart className="h-4 w-4" /> },
  { label: 'Usuarios', path: '/usuarios', icon: <Users className="h-4 w-4" /> },
];

interface OperadorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OperadorSidebar({ isOpen, onClose }: OperadorSidebarProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const navContent = (
    <nav aria-label="Navegación principal">
      <div className="px-4 py-5">
        <span className="text-base font-bold text-gray-900">Gestión Logística</span>
      </div>
      <ul className="space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 sidebar-link-active'
                    : 'text-gray-700 hover:bg-gray-100',
                ].join(' ')
              }
              onClick={onClose}
            >
              {item.icon}
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar — always visible, fixed left */}
      <aside
        aria-label="Sidebar"
        className="hidden w-56 shrink-0 border-r bg-white md:flex md:flex-col"
      >
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className="fixed inset-0 z-40 md:hidden"
        >
          {/* Overlay backdrop */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <aside className="absolute inset-y-0 left-0 z-50 flex w-56 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-end px-4 pt-3">
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={onClose}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
