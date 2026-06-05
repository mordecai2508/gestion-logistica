import nodemailer from 'nodemailer';

function createMailTransporter() {
  if (process.env.NODE_ENV === 'test') {
    return nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      ignoreTLS: true,
    });
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const transporter = createMailTransporter();

export async function sendPasswordResetEmail(correo: string, token: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: correo,
    subject: 'Recuperación de contraseña — Gestión Logística',
    html: `
      <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
      <p>Haz clic en el siguiente enlace para continuar (válido por 1 hora):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Si no solicitaste este cambio, ignora este correo.</p>
    `,
  });
}
