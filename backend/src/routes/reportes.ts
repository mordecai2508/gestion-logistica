import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import {
  getEnviosReportHandler,
  exportEnviosCSVHandler,
  getRepartidoresRankingHandler,
} from '../controllers/reportesController';

const reportesRouter = Router();

// IMPORTANT: /envios/export must be registered BEFORE /envios to avoid Express
// matching "export" as a route param of /envios.
reportesRouter.get(
  '/envios/export',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  exportEnviosCSVHandler,
);

reportesRouter.get(
  '/envios',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  getEnviosReportHandler,
);

reportesRouter.get(
  '/repartidores',
  authMiddleware,
  roleMiddleware('OPERADOR'),
  getRepartidoresRankingHandler,
);

export { reportesRouter };
