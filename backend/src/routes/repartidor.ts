import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { listarMisEntregasRepartidor } from '../controllers/entregaController';

const repartidorRouter = Router();

repartidorRouter.get(
  '/entregas',
  authMiddleware,
  roleMiddleware('REPARTIDOR'),
  listarMisEntregasRepartidor,
);

export { repartidorRouter };
