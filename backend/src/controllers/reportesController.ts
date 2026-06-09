import { Request, Response, NextFunction } from 'express';
import { reporteEnviosFiltroSchema } from '../validators/reportesValidator';
import { reportesService } from '../services/reportesService';

export const getEnviosReportHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filtro = reporteEnviosFiltroSchema.parse(req.query);
    const data = await reportesService.getEnviosReport(filtro);
    res.status(200).json({ data, message: 'Reporte generado', status: 200 });
  } catch (error) {
    next(error);
  }
};

export const exportEnviosCSVHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filtro = reporteEnviosFiltroSchema.parse(req.query);
    const csvString = await reportesService.exportEnviosCSV(filtro);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="envios-${filtro.desde}-${filtro.hasta}.csv"`,
    );
    res.send(csvString);
  } catch (error) {
    next(error);
  }
};

export const getRepartidoresRankingHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await reportesService.getRepartidoresRanking();
    res.status(200).json({ data, message: 'Ranking obtenido', status: 200 });
  } catch (error) {
    next(error);
  }
};
