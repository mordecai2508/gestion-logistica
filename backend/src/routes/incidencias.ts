import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import {
  crearIncidencia,
  listarIncidencias,
  actualizarEstadoIncidencia,
} from '../controllers/incidenciaController';

const incidenciasRouter = Router();

incidenciasRouter.post('/', authMiddleware, roleMiddleware('REPARTIDOR'), crearIncidencia);
incidenciasRouter.get('/', authMiddleware, roleMiddleware('OPERADOR'), listarIncidencias);
incidenciasRouter.patch(
  '/:id',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  actualizarEstadoIncidencia,
);

export { incidenciasRouter };
