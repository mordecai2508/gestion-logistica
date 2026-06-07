import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { Server } from 'socket.io';
import { errorHandler } from './middlewares/errorHandler';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { enviosRouter } from './routes/envios';
import { clientesRouter } from './routes/clientes';
import { trackingRouter } from './routes/tracking';
import { registerTrackingHandlers } from './sockets/tracking';
import { rutasRouter } from './routes/rutas';

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
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

app.use(errorHandler);

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
});

io.on('connection', (socket) => {
  registerTrackingHandlers(io, socket);
});

const PORT = process.env.PORT ?? 3001;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.error(`Server running on port ${PORT}`);
  });
}

export { app, server, io };
