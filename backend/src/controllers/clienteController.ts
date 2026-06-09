import { Request, Response, NextFunction } from 'express';
import { clienteRepository } from '../repositories/clienteRepository';
import { envioService } from '../services/envioService';
import { listarMisEnviosSchema } from '../validators/clienteValidator';

export async function searchClientesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = String(req.query.search ?? '');
    const clientes = await clienteRepository.search(query);
    res.status(200).json({ data: clientes, message: 'OK', status: 200 });
  } catch (err) {
    next(err);
  }
}

export async function misEnviosClienteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listarMisEnviosSchema.parse(req.query);
    const result = await envioService.listarMisEnvios(req.user!.id, parsed);
    res.status(200).json({ ...result, message: 'Envíos obtenidos exitosamente', status: 200 });
  } catch (err) {
    next(err);
  }
}
