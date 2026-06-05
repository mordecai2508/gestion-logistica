import { Router } from 'express';
import { getTrackingByCodigo } from '../controllers/trackingController';

const trackingRouter = Router();

trackingRouter.get('/:codigo', getTrackingByCodigo);

export { trackingRouter };
