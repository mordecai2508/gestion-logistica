import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { listarMisEntregas } from '../controllers/entregaController';

const entregasRouter = Router();

entregasRouter.get(
  '/',
  authMiddleware,
  roleMiddleware('REPARTIDOR'),
  listarMisEntregas,
);

export { entregasRouter };
