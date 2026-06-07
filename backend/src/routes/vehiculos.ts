import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import {
  crearVehiculo,
  listarVehiculos,
  actualizarEstadoVehiculo,
} from '../controllers/vehiculoController';

const vehiculosRouter = Router();

vehiculosRouter.post(
  '/',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  crearVehiculo,
);

vehiculosRouter.get(
  '/',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  listarVehiculos,
);

vehiculosRouter.patch(
  '/:id',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  actualizarEstadoVehiculo,
);

export { vehiculosRouter };
