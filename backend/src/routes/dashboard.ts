import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import {
  getMetricsHandler,
  getEnviosRecientesHandler,
  getRutasPendientesHandler,
  getVehiculosDisponiblesHandler,
} from '../controllers/dashboardController';

const dashboardRouter = Router();

dashboardRouter.get('/metrics', authMiddleware, roleMiddleware('OPERADOR'), getMetricsHandler);

dashboardRouter.get(
  '/envios-recientes',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  getEnviosRecientesHandler,
);

dashboardRouter.get(
  '/rutas-pendientes',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  getRutasPendientesHandler,
);

dashboardRouter.get(
  '/vehiculos-disponibles',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  getVehiculosDisponiblesHandler,
);

export { dashboardRouter };
