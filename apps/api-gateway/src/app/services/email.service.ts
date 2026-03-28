import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

let google: any;
try {
  google = require('googleapis').google;
} catch {
  // googleapis not installed
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private gmail: any = null;
  private senderEmail = '';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    if (!google) {
      this.logger.warn('googleapis not installed — email disabled');
      return;
    }

    const clientId = this.config.get('GMAIL_CLIENT_ID', '');
    const clientSecret = this.config.get('GMAIL_CLIENT_SECRET', '');
    const refreshToken = this.config.get('GMAIL_REFRESH_TOKEN', '');
    this.senderEmail = this.config.get('GMAIL_SENDER_EMAIL', '');

    if (!clientId || !clientSecret || !refreshToken || !this.senderEmail) {
      this.logger.warn(
        'Gmail API credentials not configured — email disabled. ' +
        'Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL in .env',
      );
      return;
    }

    try {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'https://developers.google.com/oauthplayground');
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      this.logger.log(`Gmail API connected for ${this.senderEmail}`);
    } catch (err: any) {
      this.logger.warn(`Gmail API setup failed: ${err.message}`);
    }
  }

  async sendPasswordResetEmail(to: string, code: string, userName: string): Promise<boolean> {
    const html = this.buildPasswordResetTemplate(code, userName);
    return this.send(to, 'Codigo de recuperacion — LagunApp', html);
  }

  async sendPaymentConfirmationEmail(
    to: string,
    userName: string,
    amount: number,
    referenceType: string,
  ): Promise<boolean> {
    const typeLabel =
      referenceType === 'ticket'
        ? 'Compra de boleto'
        : referenceType === 'topup'
          ? 'Recarga de saldo'
          : 'Pago';
    const html = this.buildPaymentConfirmationTemplate(
      userName,
      amount,
      typeLabel,
    );
    return this.send(to, `${typeLabel} exitoso — LagunApp`, html);
  }

  async sendPaymentFailedEmail(to: string, userName: string): Promise<boolean> {
    const html = this.buildPaymentFailedTemplate(userName);
    return this.send(to, 'Pago no procesado — LagunApp', html);
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    const html = this.buildWelcomeTemplate(userName);
    return this.send(to, 'Bienvenido a LagunApp', html);
  }

  private async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.gmail) {
      this.logger.debug(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
      return false;
    }

    try {
      // Build RFC 2822 email
      const rawEmail = [
        `From: LagunApp <${this.senderEmail}>`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        '',
        html,
      ].join('\r\n');

      // Base64url encode for Gmail API
      const encoded = Buffer.from(rawEmail)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encoded },
      });

      this.logger.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      return false;
    }
  }

  // ── Email Templates ─────────────────────────────────────────────────────

  private buildPasswordResetTemplate(code: string, userName: string): string {
    const digits = code.split('');
    const digitBoxes = digits
      .map(
        (d) =>
          `<td style="width:48px;height:56px;text-align:center;font-size:28px;font-weight:800;color:#F5E6D3;background-color:#2A2320;border:2px solid #D4663F;border-radius:12px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">${d}</td>`,
      )
      .join('<td style="width:8px;"></td>');

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#1E1814;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1E1814;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#2A2320;border-radius:20px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#D4663F 0%,#C2542D 100%);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#FFF;font-size:28px;font-weight:800;letter-spacing:1px;">LagunApp</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Plataforma de entretenimiento</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;color:#F5E6D3;font-size:18px;font-weight:700;">Hola ${userName},</p>
          <p style="margin:0 0 28px;color:#CDB9A5;font-size:14px;line-height:1.6;">Recibimos una solicitud para restablecer tu contrasena. Usa el siguiente codigo:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;"><tr>${digitBoxes}</tr></table>
          <div style="text-align:center;margin-bottom:28px;">
            <span style="display:inline-block;background-color:rgba(212,166,67,0.15);color:#D4A843;font-size:12px;font-weight:600;padding:6px 16px;border-radius:20px;border:1px solid rgba(212,166,67,0.3);">⏱ Este codigo expira en 15 minutos</span>
          </div>
          <hr style="border:none;border-top:1px solid #3A3430;margin:0 0 24px;">
          <p style="margin:0 0 8px;color:#CDB9A5;font-size:13px;line-height:1.5;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
          <p style="margin:0;color:#6B6560;font-size:12px;">Por seguridad, nunca compartas este codigo con nadie.</p>
        </td></tr>
        <tr><td style="background-color:#1E1814;padding:24px 40px;text-align:center;border-top:1px solid #3A3430;">
          <p style="margin:0 0 4px;color:#6B6560;font-size:11px;">&copy; ${new Date().getFullYear()} LagunApp — La Laguna, Mexico</p>
          <p style="margin:0;color:#4A4540;font-size:10px;">Correo enviado automaticamente.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  private buildPaymentConfirmationTemplate(
    userName: string,
    amount: number,
    typeLabel: string,
  ): string {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#1E1814;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1E1814;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#2A2320;border-radius:20px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#5A9E6F 0%,#2A9D8F 100%);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#FFF;font-size:28px;font-weight:800;letter-spacing:1px;">LagunApp</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Pago confirmado</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;color:#F5E6D3;font-size:18px;font-weight:700;">Hola ${userName},</p>
          <p style="margin:0 0 24px;color:#CDB9A5;font-size:14px;line-height:1.6;">Tu ${typeLabel.toLowerCase()} se ha procesado exitosamente.</p>
          <div style="text-align:center;margin-bottom:24px;">
            <span style="display:inline-block;background-color:rgba(90,158,111,0.15);color:#5A9E6F;font-size:24px;font-weight:800;padding:16px 32px;border-radius:12px;border:2px solid rgba(90,158,111,0.3);">$${amount.toFixed(2)} MXN</span>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <span style="display:inline-block;background-color:rgba(212,166,67,0.15);color:#D4A843;font-size:12px;font-weight:600;padding:6px 16px;border-radius:20px;border:1px solid rgba(212,166,67,0.3);">${typeLabel}</span>
          </div>
          <hr style="border:none;border-top:1px solid #3A3430;margin:0 0 24px;">
          <p style="margin:0;color:#6B6560;font-size:12px;">Puedes ver tu historial de pagos en la app.</p>
        </td></tr>
        <tr><td style="background-color:#1E1814;padding:24px 40px;text-align:center;border-top:1px solid #3A3430;">
          <p style="margin:0 0 4px;color:#6B6560;font-size:11px;">&copy; ${new Date().getFullYear()} LagunApp — La Laguna, Mexico</p>
          <p style="margin:0;color:#4A4540;font-size:10px;">Correo enviado automaticamente.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  private buildPaymentFailedTemplate(userName: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#1E1814;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1E1814;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#2A2320;border-radius:20px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#E63946 0%,#C2542D 100%);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#FFF;font-size:28px;font-weight:800;letter-spacing:1px;">LagunApp</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Pago no procesado</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;color:#F5E6D3;font-size:18px;font-weight:700;">Hola ${userName},</p>
          <p style="margin:0 0 24px;color:#CDB9A5;font-size:14px;line-height:1.6;">No pudimos procesar tu pago. Por favor verifica tu metodo de pago e intenta de nuevo.</p>
          <p style="margin:0 0 8px;color:#CDB9A5;font-size:13px;line-height:1.5;">Si el problema persiste, contacta a nuestro equipo de soporte.</p>
        </td></tr>
        <tr><td style="background-color:#1E1814;padding:24px 40px;text-align:center;border-top:1px solid #3A3430;">
          <p style="margin:0 0 4px;color:#6B6560;font-size:11px;">&copy; ${new Date().getFullYear()} LagunApp — La Laguna, Mexico</p>
          <p style="margin:0;color:#4A4540;font-size:10px;">Correo enviado automaticamente.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  private buildWelcomeTemplate(userName: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#1E1814;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1E1814;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#2A2320;border-radius:20px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#D4663F 0%,#D4A843 100%);padding:40px;text-align:center;">
          <h1 style="margin:0;color:#FFF;font-size:32px;font-weight:800;letter-spacing:1px;">LagunApp</h1>
          <p style="margin:12px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">Vive la experiencia</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;color:#F5E6D3;font-size:20px;font-weight:700;">Bienvenido, ${userName}! 🎉</p>
          <p style="margin:0 0 24px;color:#CDB9A5;font-size:14px;line-height:1.6;">Tu cuenta esta lista. Descubre los mejores eventos, restaurantes, tours y artistas de La Laguna.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="padding:12px 16px;background-color:rgba(212,102,63,0.1);border-radius:12px;border:1px solid rgba(212,102,63,0.2);"><p style="margin:0;color:#D4663F;font-size:13px;font-weight:600;">🎵 Eventos y conciertos</p></td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="padding:12px 16px;background-color:rgba(212,166,67,0.1);border-radius:12px;border:1px solid rgba(212,166,67,0.2);"><p style="margin:0;color:#D4A843;font-size:13px;font-weight:600;">🍽 Restaurantes y gastronomia</p></td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="padding:12px 16px;background-color:rgba(42,157,143,0.1);border-radius:12px;border:1px solid rgba(42,157,143,0.2);"><p style="margin:0;color:#2A9D8F;font-size:13px;font-weight:600;">🏜 Tours y experiencias</p></td></tr>
          </table>
          <p style="margin:0;color:#CDB9A5;font-size:13px;">Descarga la app para boletos con QR y mas.</p>
        </td></tr>
        <tr><td style="background-color:#1E1814;padding:24px 40px;text-align:center;border-top:1px solid #3A3430;">
          <p style="margin:0 0 4px;color:#6B6560;font-size:11px;">&copy; ${new Date().getFullYear()} LagunApp — La Laguna, Mexico</p>
          <p style="margin:0;color:#4A4540;font-size:10px;">Correo enviado automaticamente.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }
}
