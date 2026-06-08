import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import type { Request } from 'express';
import { AppError } from './appError';

export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

function isAllowedMime(mimetype: string): mimetype is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimetype);
}

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  if (!isAllowedMime(file.mimetype)) {
    cb(
      new AppError(
        'INVALID_FILE_TYPE',
        'Tipo de archivo no soportado: solo se admiten image/jpeg e image/png',
        422,
      ),
    );
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

/**
 * Middleware para POST /envios/:id/confirmar — acepta únicamente los campos
 * `foto` y `firma`; cualquier otro campo de archivo es descartado por multer.
 */
export const uploadConfirmacion = upload.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'firma', maxCount: 1 },
]);

/**
 * Middleware para POST /envios/:id/fallo — acepta únicamente el campo `foto`
 * (opcional); cualquier otro campo de archivo es descartado por multer.
 */
export const uploadFallo = upload.single('foto');

const EXTENSION_POR_MIME: Record<AllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/**
 * Escribe el buffer de un archivo subido a
 * `backend/uploads/entregas/<envioId>/<tipo>-<timestamp>.<ext>` (creando los
 * directorios necesarios) y devuelve la ruta pública relativa
 * `/uploads/entregas/<envioId>/<tipo>-<timestamp>.<ext>`.
 */
export async function guardarArchivo(
  envioId: string,
  tipo: 'foto' | 'firma',
  file: Express.Multer.File,
): Promise<string> {
  const ext = isAllowedMime(file.mimetype)
    ? EXTENSION_POR_MIME[file.mimetype]
    : 'bin';
  const timestamp = Date.now();
  const nombreArchivo = `${tipo}-${timestamp}.${ext}`;

  const dirAbsoluto = path.join(__dirname, '../../uploads/entregas', envioId);
  await fs.mkdir(dirAbsoluto, { recursive: true });
  await fs.writeFile(path.join(dirAbsoluto, nombreArchivo), file.buffer);

  return `/uploads/entregas/${envioId}/${nombreArchivo}`;
}
