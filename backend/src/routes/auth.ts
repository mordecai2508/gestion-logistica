import { Router } from 'express';
import { loginHandler, refreshHandler, logoutHandler, registerHandler } from '../controllers/authController';
import { forgotPassword, resetPassword } from '../controllers/userController';

const authRouter = Router();

authRouter.post('/register', registerHandler);
authRouter.post('/login', loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);

export { authRouter };
