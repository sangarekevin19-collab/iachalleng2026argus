import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('email.host');
    const port = this.configService.get<number>('email.port');
    const user = this.configService.get<string>('email.user');
    const pass = this.configService.get<string>('email.pass');
    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('Email not configured — emails will be logged only');
    }
  }

  async sendOtp(email: string, otp: string, firstName: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre code de vérification AURA OS</title>
</head>
<body style="margin:0; padding:0; background:#0a0a1a; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:transparent;">

          <!-- HEADER / LOGO -->
          <tr>
            <td style="background:linear-gradient(135deg, #1a1a3e 0%, #2d1b69 50%, #0f2027 100%); padding:0; border-radius:20px 20px 0 0; overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 40px 32px; text-align:center;">
                    <div style="display:inline-block; width:72px; height:72px; background:linear-gradient(135deg, #6c5ce7 0%, #a855f7 100%); border-radius:20px; box-shadow:0 8px 32px rgba(108,92,231,0.4); margin-bottom:16px; text-align:center; line-height:72px;">
                      <span style="font-size:32px; color:#ffffff; display:inline-block; vertical-align:middle;">✦</span>
                    </div>
                    <h1 style="margin:0 0 4px; font-size:28px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">AURA OS</h1>
                    <p style="margin:0; font-size:13px; color:rgba(255,255,255,0.5); letter-spacing:2px; text-transform:uppercase;">African Unified Reasoning Assistant</p>
                  </td>
                </tr>
                <tr>
                  <td style="height:4px; background:linear-gradient(90deg, #6c5ce7, #a855f7, #00cec9, #6c5ce7);">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff; padding:40px; border-radius:0 0 20px 20px; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:28px;">
                    <p style="margin:0 0 6px; font-size:22px; font-weight:700; color:#1a1a2e;">Bonjour ${firstName},</p>
                    <p style="margin:0; font-size:15px; color:#6b7280; line-height:1.6;">Utilisez le code ci-dessous pour vérifier votre identité et accéder à votre espace sécurisé.</p>
                  </td>
                </tr>
              </table>

              <!-- OTP CODE BOX -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:10px 0 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg, #f8f7ff 0%, #ede9fe 100%); border:2px solid #c4b5fd; border-radius:16px; padding:24px 48px;">
                      <tr>
                        <td align="center" style="font-family:'Courier New', monospace; font-size:40px; font-weight:700; letter-spacing:10px; color:#4c1d95; white-space:nowrap;">
                          ${otp}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 0 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7; border-radius:12px; padding:14px 20px;">
                      <tr>
                        <td width="28" valign="middle" style="font-size:18px; padding-right:12px;">⏱️</td>
                        <td style="font-size:13px; color:#92400e; line-height:1.5;">
                          <strong>Ce code expire dans 10 minutes.</strong><br/>Ne le partagez avec personne, même en se memant d'AURA OS.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:1px; background:#e5e7eb;"></td></tr>
              </table>

              <!-- FOOTER / ARGUS CORP SIGNATURE -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center; padding-top:28px;">
                    <p style="margin:0 0 16px; font-size:12px; color:#9ca3af; letter-spacing:1px;">Propulsé par</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td>
                          <div style="display:inline-block; background:linear-gradient(135deg, #6c5ce7 0%, #a855f7 100%); padding:2px; border-radius:12px;">
                            <div style="background:#ffffff; border-radius:10px; padding:14px 28px;">
                              <p style="margin:0 0 2px; font-size:18px; font-weight:900; color:#1a1a2e; letter-spacing:3px; text-transform:uppercase;">ARGUS CORP</p>
                              <p style="margin:0; font-size:11px; color:#6c5ce7; letter-spacing:2px; text-transform:uppercase; font-weight:600;">Équipe de Développement</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0; font-size:11px; color:#d1d5db; line-height:1.6; font-style:italic;">✦ L'innovation au service de l'Afrique ✦</p>
                    <p style="margin:8px 0 0; font-size:10px; color:#d1d5db;">© 2026 ARGUS CORP — Tous droits réservés</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom spacer -->
          <tr><td style="height:30px;"></td></tr>

          <!-- Fine print -->
          <tr>
            <td style="text-align:center; padding:0 20px;">
              <p style="margin:0; font-size:11px; color:rgba(255,255,255,0.25); line-height:1.5;">
                Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.<br/>
                AURA OS est une plateforme de gestion intelligente d'entreprise.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await this.send(email, 'Votre code de vérification AURA OS', html);
  }

  async sendWelcome(email: string, firstName: string, companyName: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur AURA OS</title>
</head>
<body style="margin:0; padding:0; background:#0a0a1a; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="background:linear-gradient(135deg, #1a1a3e 0%, #2d1b69 50%, #0f2027 100%); padding:36px 40px; text-align:center; border-radius:20px 20px 0 0;">
              <div style="display:inline-block; width:64px; height:64px; background:linear-gradient(135deg, #6c5ce7 0%, #a855f7 100%); border-radius:18px; box-shadow:0 8px 32px rgba(108,92,231,0.4); margin-bottom:14px; text-align:center; line-height:64px;">
                <span style="font-size:28px; color:#fff; display:inline-block; vertical-align:middle;">✦</span>
              </div>
              <h1 style="margin:0 0 4px; font-size:26px; font-weight:800; color:#ffffff;">Bienvenue sur AURA OS 🎉</h1>
              <p style="margin:0; font-size:12px; color:rgba(255,255,255,0.5); letter-spacing:2px; text-transform:uppercase;">Votre jumeau numérique est prêt</p>
              <div style="height:3px; margin-top:20px; background:linear-gradient(90deg, #6c5ce7, #a855f7, #00cec9);"></div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff; padding:40px; border-radius:0 0 20px 20px;">
              <p style="margin:0 0 8px; font-size:22px; font-weight:700; color:#1a1a2e;">Félicitations ${firstName} !</p>
              <p style="margin:0 0 20px; font-size:15px; color:#6b7280; line-height:1.7;">
                Votre entreprise <strong style="color:#4c1d95;">${companyName}</strong> est maintenant connectée à AURA OS.
                Votre jumeau numérique a été créé avec succès.
              </p>
              <p style="margin:0 0 24px; font-size:15px; color:#6b7280; line-height:1.7;">
                L'agent AURA va maintenant vous guider pour configurer votre système et générer vos agents IA spécialisés.
              </p>
              <div style="background:linear-gradient(135deg, #f8f7ff 0%, #ede9fe 100%); border:1px solid #c4b5fd; border-radius:12px; padding:20px; text-align:center;">
                <p style="margin:0; font-size:14px; color:#4c1d95; font-weight:600;">🚀 Prêt à commencer ?</p>
              </div>
            </td>
          </tr>
          <!-- ARGUS CORP signature -->
          <tr>
            <td style="text-align:center; padding:24px 20px;">
              <p style="margin:0 0 12px; font-size:11px; color:rgba(255,255,255,0.3); letter-spacing:1px;">Propulsé par</p>
              <div style="display:inline-block; background:linear-gradient(135deg, #6c5ce7, #a855f7); padding:2px; border-radius:10px;">
                <div style="background:rgba(255,255,255,0.1); border-radius:8px; padding:10px 24px;">
                  <p style="margin:0 0 2px; font-size:16px; font-weight:900; color:#ffffff; letter-spacing:3px;">ARGUS CORP</p>
                  <p style="margin:0; font-size:10px; color:rgba(255,255,255,0.7); letter-spacing:2px; font-weight:600;">Équipe de Développement</p>
                </div>
              </div>
              <p style="margin:12px 0 0; font-size:10px; color:rgba(255,255,255,0.2);">© 2026 ARGUS CORP — Tous droits réservés</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await this.send(email, 'Bienvenue sur AURA OS', html);
  }

  async sendReceipt(email: string, receiptData: Record<string, any>): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Reçu - AURA OS</title></head>
<body style="margin:0; padding:0; background:#0a0a1a; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a; padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr>
          <td style="background:linear-gradient(135deg, #1a1a3e, #2d1b69); padding:30px 40px; text-align:center; border-radius:20px 20px 0 0;">
            <div style="width:48px; height:48px; background:linear-gradient(135deg, #6c5ce7, #a855f7); border-radius:14px; margin:0 auto 12px; text-align:center; line-height:48px;"><span style="font-size:22px; color:#fff;">✦</span></div>
            <h2 style="margin:0; color:#fff; font-size:22px; font-weight:800;">Reçu de Vente</h2>
            <p style="margin:6px 0 0; color:rgba(255,255,255,0.5); font-size:13px;">N° ${receiptData.receiptNumber}</p>
            <div style="height:3px; margin-top:16px; background:linear-gradient(90deg, #6c5ce7, #a855f7, #00cec9);"></div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff; padding:32px 40px; border-radius:0 0 20px 20px;">
            <p style="margin:0 0 6px; font-size:14px; color:#6b7280;"><strong style="color:#1a1a2e;">Date:</strong> ${receiptData.date}</p>
            <p style="margin:0 0 6px; font-size:14px; color:#6b7280;"><strong style="color:#1a1a2e;">Total:</strong> <span style="font-size:20px; font-weight:700; color:#4c1d95;">${receiptData.total} ${receiptData.currency}</span></p>
            <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;"/>
            <p style="margin:0; font-size:13px; color:#9ca3af;">Merci pour votre achat chez <strong>${receiptData.companyName}</strong></p>
          </td>
        </tr>
        <tr>
          <td style="text-align:center; padding:20px;">
            <p style="margin:0 0 8px; font-size:11px; color:rgba(255,255,255,0.3);">Propulsé par</p>
            <span style="font-size:14px; font-weight:900; color:#a855f7; letter-spacing:3px;">ARGUS CORP</span>
            <p style="margin:6px 0 0; font-size:10px; color:rgba(255,255,255,0.2);">© 2026</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.send(email, `Reçu - ${receiptData.receiptNumber}`, html);
  }

  async sendReport(email: string, reportData: Record<string, any>): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Rapport Journalier - AURA OS</title></head>
<body style="margin:0; padding:0; background:#0a0a1a; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a; padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr>
          <td style="background:linear-gradient(135deg, #1a1a3e, #2d1b69); padding:30px 40px; text-align:center; border-radius:20px 20px 0 0;">
            <div style="width:48px; height:48px; background:linear-gradient(135deg, #6c5ce7, #a855f7); border-radius:14px; margin:0 auto 12px; text-align:center; line-height:48px;"><span style="font-size:22px; color:#fff;">✦</span></div>
            <h2 style="margin:0; color:#fff; font-size:22px; font-weight:800;">Rapport Journalier</h2>
            <p style="margin:6px 0 0; color:rgba(255,255,255,0.5); font-size:13px;">${reportData.date}</p>
            <div style="height:3px; margin-top:16px; background:linear-gradient(90deg, #6c5ce7, #a855f7, #00cec9);"></div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff; padding:32px 40px; border-radius:0 0 20px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:10px 0; border-bottom:1px solid #f3f4f6;"><span style="color:#6b7280; font-size:14px;">Ventes</span><span style="float:right; font-weight:700; color:#1a1a2e;">${reportData.totalSales}</span></td></tr>
              <tr><td style="padding:10px 0; border-bottom:1px solid #f3f4f6;"><span style="color:#6b7280; font-size:14px;">Revenus</span><span style="float:right; font-weight:700; color:#4c1d95;">${reportData.revenue}</span></td></tr>
              <tr><td style="padding:10px 0; border-bottom:1px solid #f3f4f6;"><span style="color:#6b7280; font-size:14px;">Clients servis</span><span style="float:right; font-weight:700; color:#1a1a2e;">${reportData.customersServed}</span></td></tr>
              <tr><td style="padding:10px 0;"><span style="color:#6b7280; font-size:14px;">Score de santé</span><span style="float:right; font-weight:700; color:#059669;">${reportData.healthScore}/100</span></td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="text-align:center; padding:20px;">
            <p style="margin:0 0 8px; font-size:11px; color:rgba(255,255,255,0.3);">Propulsé par</p>
            <span style="font-size:14px; font-weight:900; color:#a855f7; letter-spacing:3px;">ARGUS CORP</span>
            <p style="margin:6px 0 0; font-size:10px; color:rgba(255,255,255,0.2);">© 2026</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.send(email, `Rapport du ${reportData.date}`, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Email not configured. Would send to ${to}: ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('email.from'),
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }
}
