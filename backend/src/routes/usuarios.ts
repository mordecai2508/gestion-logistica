import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import {
  listarUsuarios,
  obtenerUsuario,
  actualizarEstadoUsuario,
} from '../controllers/usuarioController';

const usuariosRouter = Router();

usuariosRouter.get(
  '/',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  listarUsuarios,
);

usuariosRouter.get(
  '/:id',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  obtenerUsuario,
);

usuariosRouter.patch(
  '/:id/estado',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  actualizarEstadoUsuario,
);

export { usuariosRouter };
