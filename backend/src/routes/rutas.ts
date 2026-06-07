import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import {
  crearRuta,
  listarRutas,
  obtenerRuta,
  reasignarRuta,
  obtenerRutaOptima,
} from '../controllers/rutaController';

const rutasRouter = Router();

rutasRouter.post(
  '/',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  crearRuta,
);

rutasRouter.get(
  '/',
  authMiddleware,
  roleMiddleware(['OPERADOR', 'REPARTIDOR']),
  listarRutas,
);

rutasRouter.get(
  '/:id/optima',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  obtenerRutaOptima,
);

rutasRouter.get(
  '/:id',
  authMiddleware,
  roleMiddleware(['OPERADOR', 'REPARTIDOR']),
  obtenerRuta,
);

rutasRouter.patch(
  '/:id',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  reasignarRuta,
);

export { rutasRouter };
