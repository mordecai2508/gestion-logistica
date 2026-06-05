import { Request, Response, NextFunction } from 'express';
import { clienteRepository } from '../repositories/clienteRepository';

export async function searchClientesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = String(req.query.search ?? '');
    const clientes = await clienteRepository.search(query);
    res.status(200).json({ data: clientes, message: 'OK', status: 200 });
  } catch (err) {
    next(err);
  }
}
