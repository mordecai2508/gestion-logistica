import { Outlet } from 'react-router-dom';
import { RepartidorBottomNav } from './RepartidorBottomNav';

export function RepartidorLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <RepartidorBottomNav />
    </div>
  );
}
