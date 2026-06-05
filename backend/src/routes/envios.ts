import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import {
  crearEnvioHandler,
  listarEnviosHandler,
  obtenerDetalleHandler,
  editarEnvioHandler,
  cancelarEnvioHandler,
} from '../controllers/envioController';

const enviosRouter = Router();

enviosRouter.post('/', authMiddleware, roleMiddleware('OPERADOR'), crearEnvioHandler);
enviosRouter.get('/', authMiddleware, roleMiddleware('OPERADOR'), listarEnviosHandler);
enviosRouter.get('/:id', authMiddleware, roleMiddleware('OPERADOR'), obtenerDetalleHandler);
enviosRouter.patch('/:id', authMiddleware, roleMiddleware('OPERADOR'), editarEnvioHandler);
enviosRouter.delete('/:id', authMiddleware, roleMiddleware('OPERADOR'), cancelarEnvioHandler);

export { enviosRouter };
