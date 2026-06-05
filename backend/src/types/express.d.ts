import { Rol } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; correo: string; rol: Rol };
    }
  }
}

export {};
