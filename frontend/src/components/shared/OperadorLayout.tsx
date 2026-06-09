import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { OperadorSidebar } from './OperadorSidebar';
import { OperadorTopbar } from './OperadorTopbar';

export function OperadorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <OperadorSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <OperadorTopbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
