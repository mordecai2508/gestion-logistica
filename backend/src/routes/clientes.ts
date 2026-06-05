import { Router } from 'express';
import { searchClientesHandler } from '../controllers/clienteController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const clientesRouter = Router();

clientesRouter.get('/', authMiddleware, roleMiddleware('OPERADOR'), searchClientesHandler);

export { clientesRouter };
