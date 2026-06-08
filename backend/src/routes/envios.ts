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
import {
  confirmarEntrega,
  registrarFallo,
} from '../controllers/entregaController';
import { uploadConfirmacion, uploadFallo } from '../lib/uploadConfig';

const enviosRouter = Router();

enviosRouter.post('/', authMiddleware, roleMiddleware('OPERADOR'), crearEnvioHandler);
enviosRouter.get('/', authMiddleware, roleMiddleware('OPERADOR'), listarEnviosHandler);
enviosRouter.get('/:id', authMiddleware, roleMiddleware('OPERADOR'), obtenerDetalleHandler);
enviosRouter.patch('/:id', authMiddleware, roleMiddleware('OPERADOR'), editarEnvioHandler);
enviosRouter.delete('/:id', authMiddleware, roleMiddleware('OPERADOR'), cancelarEnvioHandler);

// entregas_confirmacion (id 9) — confirmación y fallo de entrega por el repartidor
enviosRouter.post(
  '/:id/confirmar',
  authMiddleware,
  roleMiddleware('REPARTIDOR'),
  uploadConfirmacion,
  confirmarEntrega,
);
enviosRouter.post(
  '/:id/fallo',
  authMiddleware,
  roleMiddleware('REPARTIDOR'),
  uploadFallo,
  registrarFallo,
);

export { enviosRouter };
