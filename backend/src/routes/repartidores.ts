import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import {
  listarRepartidores,
  obtenerRepartidor,
  actualizarRepartidor,
} from '../controllers/repartidorController';

const repartidoresRouter = Router();

repartidoresRouter.get(
  '/',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  listarRepartidores,
);

repartidoresRouter.get(
  '/:id',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  obtenerRepartidor,
);

repartidoresRouter.patch(
  '/:id',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  actualizarRepartidor,
);

export { repartidoresRouter };
