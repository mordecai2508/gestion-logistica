import 'dotenv/config';
import path from 'path';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { Server } from 'socket.io';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { Rol } from '@prisma/client';
import { errorHandler } from './middlewares/errorHandler';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { enviosRouter } from './routes/envios';
import { clientesRouter } from './routes/clientes';
import { trackingRouter } from './routes/tracking';
import { registerTrackingHandlers } from './sockets/tracking';
import { registerNotificacionHandlers } from './sockets/notificaciones';
import { rutasRouter } from './routes/rutas';
import { vehiculosRouter } from './routes/vehiculos';
import { entregasRouter } from './routes/entregas';
import { incidenciasRouter } from './routes/incidencias';
import { notificacionesRouter } from './routes/notificaciones';
import { dashboardRouter } from './routes/dashboard';
import { repartidorRouter } from './routes/repartidor';
import { setIo } from './lib/socketServer';

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.json());
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  skip: () => process.env.NODE_ENV === 'test',
});

app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/users/me', usersRouter);
app.use('/api/v1/envios', enviosRouter);
app.use('/api/v1/clientes', clientesRouter);
app.use('/api/v1/tracking', trackingRouter);
app.use('/api/v1/rutas', rutasRouter);
app.use('/api/v1/vehiculos', vehiculosRouter);
app.use('/api/v1/entregas', entregasRouter);
app.use('/api/v1/incidencias', incidenciasRouter);
app.use('/api/v1/notificaciones', notificacionesRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/repartidor', repartidorRouter);

app.use(errorHandler);

const server = http.createServer(app);

interface JwtPayload {
  id: string;
  correo: string;
  rol: Rol;
}

const io = new Server(server, {
  cors: corsOptions,
});

setIo(io);

io.use((socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    return next(new Error('UNAUTHORIZED'));
  }
  const jwtSecret = process.env.JWT_SECRET ?? '';
  try {
    const payload = jwt.verify(token, jwtSecret) as JwtPayload;
    socket.data.userId = payload.id;
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError || err instanceof JsonWebTokenError) {
      next(new Error('UNAUTHORIZED'));
    } else {
      next(new Error('UNAUTHORIZED'));
    }
  }
});

io.on('connection', (socket) => {
  registerNotificacionHandlers(io, socket);
  registerTrackingHandlers(io, socket);
});

const PORT = process.env.PORT ?? 3001;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.error(`Server running on port ${PORT}`);
  });
}

export { app, server, io };
