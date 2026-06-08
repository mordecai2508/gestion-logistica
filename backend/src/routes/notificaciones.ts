import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  listarNotificaciones,
  marcarNotificacionComoLeida,
} from '../controllers/notificacionController';

export const notificacionesRouter = Router();

notificacionesRouter.get('/', authMiddleware, listarNotificaciones);
notificacionesRouter.patch('/:id/leer', authMiddleware, marcarNotificacionComoLeida);
