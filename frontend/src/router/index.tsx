import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '@/features/auth/Login';
import { Register } from '@/features/auth/Register';
import { Perfil } from '@/features/auth/Perfil';
import { ForgotPassword } from '@/features/auth/ForgotPassword';
import { ResetPassword } from '@/features/auth/ResetPassword';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { CrearEnvio } from '@/features/envios/CrearEnvio';
import { ConsultarEnvios } from '@/features/envios/ConsultarEnvios';
import { DetalleEnvio } from '@/features/envios/DetalleEnvio';
import { RastrearPaquete } from '@/features/tracking/RastrearPaquete';
import { GestionRutas } from '@/features/rutas/GestionRutas';
import { RutaDetalle } from '@/features/rutas/RutaDetalle';
import { GestionVehiculos } from '@/features/vehiculos/GestionVehiculos';
import { GestionIncidencias } from '@/features/incidencias/GestionIncidencias';
import { VistaRepartidor } from '@/features/repartidor/VistaRepartidor';
import { ConfirmacionEntrega } from '@/features/repartidor/ConfirmacionEntrega';
import { Notificaciones } from '@/features/notificaciones/Notificaciones';
import { OperadorLayout } from '@/components/shared/OperadorLayout';
import { RepartidorLayout } from '@/components/shared/RepartidorLayout';
import { PlaceholderPage } from '@/components/shared/PlaceholderPage';

const DashboardPage = () => <div>Dashboard</div>;
const MisEnviosPage = () => <div>Mis Envios</div>;

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/tracking" element={<RastrearPaquete />} />

        {/* Protected routes — CLIENTE (sin layout de rol) */}
        <Route element={<ProtectedRoute allowedRoles={['CLIENTE']} />}>
          <Route path="/mis-envios" element={<MisEnviosPage />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/notificaciones" element={<Notificaciones />} />
        </Route>

        {/* Protected routes — OPERADOR (con OperadorLayout) */}
        <Route element={<ProtectedRoute allowedRoles={['OPERADOR']} />}>
          <Route element={<OperadorLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* /envios/crear must come before /envios/:id to avoid param collision */}
            <Route path="/envios/crear" element={<CrearEnvio />} />
            <Route path="/envios" element={<ConsultarEnvios />} />
            <Route path="/envios/:id" element={<DetalleEnvio />} />
            {/* Gestión de rutas — /rutas must come before /rutas/:id */}
            <Route path="/rutas" element={<GestionRutas />} />
            <Route path="/rutas/:id" element={<RutaDetalle />} />
            <Route path="/vehiculos" element={<GestionVehiculos />} />
            <Route path="/incidencias" element={<GestionIncidencias />} />
            <Route path="/reportes" element={<PlaceholderPage title="Reportes" />} />
            <Route path="/usuarios" element={<PlaceholderPage title="Usuarios" />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
          </Route>
        </Route>

        {/* Protected routes — REPARTIDOR (con RepartidorLayout) */}
        <Route element={<ProtectedRoute allowedRoles={['REPARTIDOR']} />}>
          <Route element={<RepartidorLayout />}>
            <Route path="/repartidor/entregas" element={<VistaRepartidor />} />
            <Route
              path="/repartidor/entregas/:id/confirmar"
              element={<ConfirmacionEntrega />}
            />
            <Route path="/repartidor/rutas" element={<PlaceholderPage title="Rutas" />} />
            <Route path="/repartidor/mapa" element={<PlaceholderPage title="Mapa" />} />
            <Route path="/repartidor/*" element={<PlaceholderPage title="Repartidor" />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
