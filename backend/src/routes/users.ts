import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getMe, updateMe } from '../controllers/userController';

const usersRouter = Router();

usersRouter.get('/', authMiddleware, getMe);
usersRouter.patch('/', authMiddleware, updateMe);

export { usersRouter };
