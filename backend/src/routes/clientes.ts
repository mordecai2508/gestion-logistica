import { Router } from 'express';
import { searchClientesHandler, misEnviosClienteHandler } from '../controllers/clienteController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const clientesRouter = Router();

clientesRouter.get('/', authMiddleware, roleMiddleware('OPERADOR'), searchClientesHandler);
clientesRouter.get('/me/envios', authMiddleware, roleMiddleware('CLIENTE'), misEnviosClienteHandler);

export { clientesRouter };
