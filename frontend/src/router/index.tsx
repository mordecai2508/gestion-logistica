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
import { VistaRepartidor } from '@/features/repartidor/VistaRepartidor';
import { ConfirmacionEntrega } from '@/features/repartidor/ConfirmacionEntrega';

const DashboardPage = () => <div>Dashboard</div>;
const RepartidorPage = () => <div>Repartidor</div>;
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

        {/* Protected routes — all authenticated roles */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['CLIENTE', 'OPERADOR', 'REPARTIDOR']} />
          }
        >
          <Route path="/perfil" element={<Perfil />} />
        </Route>

        {/* Protected routes — OPERADOR */}
        <Route element={<ProtectedRoute allowedRoles={['OPERADOR']} />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* /envios/crear must come before /envios/:id to avoid param collision */}
          <Route path="/envios/crear" element={<CrearEnvio />} />
          <Route path="/envios" element={<ConsultarEnvios />} />
          <Route path="/envios/:id" element={<DetalleEnvio />} />
          {/* Gestión de rutas — /rutas must come before /rutas/:id */}
          <Route path="/rutas" element={<GestionRutas />} />
          <Route path="/rutas/:id" element={<RutaDetalle />} />
          {/* Gestión de vehículos (id 8) — el enlace "Vehículos" del sidebar
              de layout_navegacion (aún pending) deberá apuntar a esta ruta. */}
          <Route path="/vehiculos" element={<GestionVehiculos />} />
        </Route>

        {/* Protected routes — REPARTIDOR */}
        <Route element={<ProtectedRoute allowedRoles={['REPARTIDOR']} />}>
          {/* Entregas (id 9) — rutas específicas antes del catch-all /repartidor/* */}
          <Route path="/repartidor/entregas" element={<VistaRepartidor />} />
          <Route
            path="/repartidor/entregas/:id/confirmar"
            element={<ConfirmacionEntrega />}
          />
          <Route path="/repartidor/*" element={<RepartidorPage />} />
        </Route>

        {/* Protected routes — CLIENTE */}
        <Route element={<ProtectedRoute allowedRoles={['CLIENTE']} />}>
          <Route path="/mis-envios" element={<MisEnviosPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
