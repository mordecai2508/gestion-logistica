import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import {
  crearEnvioHandler,
  listarEnviosHandler,
  obtenerDetalleHandler,
  editarEnvioHandler,
  cancelarEnvioHandler,
  reprogramarEnvio,
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

// incidencias_gestion (id 10) — reprogramación de entrega por el operador
enviosRouter.post(
  '/:id/reprogramar',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  reprogramarEnvio,
);

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
