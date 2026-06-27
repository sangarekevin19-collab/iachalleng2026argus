import { Injectable } from '@nestjs/common';
import { Receipt } from '../entities/receipt.entity';

@Injectable()
export class ReceiptGeneratorService {
  generateReceiptHtml(receipt: Receipt): string {
    const itemsHtml = (receipt.items || [])
      .map(
        (item: any) => `
      <tr>
        <td style="padding: 8px 4px; border-bottom: 1px solid #f0f0f0; font-size: 13px;">${item.productName || item.name || 'Article'}</td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 13px;">${item.quantity}</td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 13px;">${this.formatAmount(item.unitPrice || item.price || 0)}</td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 13px; font-weight: 600;">${this.formatAmount(item.total || (item.quantity * (item.unitPrice || item.price || 0)))}</td>
      </tr>`,
      )
      .join('');

    const paymentLabel = this.getPaymentLabel(receipt.paymentMethod, receipt.mobileMoneyProvider);

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reçu ${receipt.receiptNumber}</title>
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: 'Segoe UI', Arial, sans-serif;">
  <div style="max-width: 380px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 24px 20px; text-align: center;">
      ${receipt.companyLogo ? `<img src="${receipt.companyLogo}" alt="Logo" style="max-height: 48px; margin-bottom: 10px; border-radius: 8px;" />` : ''}
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">${receipt.companyName || 'AURA OS'}</h1>
      ${receipt.companyAddress ? `<p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 12px;">${receipt.companyAddress}</p>` : ''}
      ${receipt.companyPhone ? `<p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 12px;">📞 ${receipt.companyPhone}</p>` : ''}
    </div>

    <!-- Receipt Info -->
    <div style="padding: 20px 20px 12px; border-bottom: 2px dashed #e5e7eb;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; color: #6b7280;">REÇU N°</span>
        <span style="font-size: 13px; font-weight: 700; color: #1f2937;">${receipt.receiptNumber}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; color: #6b7280;">DATE</span>
        <span style="font-size: 13px; font-weight: 500; color: #1f2937;">${this.formatDate(receipt.generatedAt || receipt.createdAt)}</span>
      </div>
    </div>

    <!-- Customer Info -->
    ${(receipt.customerName || receipt.customerPhone) ? `
    <div style="padding: 12px 20px; border-bottom: 2px dashed #e5e7eb; background: #fafafa;">
      <p style="margin: 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Client</p>
      ${receipt.customerName ? `<p style="margin: 0; font-size: 13px; font-weight: 600; color: #1f2937;">${receipt.customerName}</p>` : ''}
      ${receipt.customerPhone ? `<p style="margin: 2px 0 0; font-size: 12px; color: #6b7280;">📱 ${receipt.customerPhone}</p>` : ''}
    </div>` : ''}

    <!-- Items Table -->
    <div style="padding: 0 20px; margin-top: 12px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #1f2937;">
            <th style="padding: 6px 4px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase;">Article</th>
            <th style="padding: 6px 4px; text-align: center; font-size: 11px; color: #6b7280; text-transform: uppercase;">Qté</th>
            <th style="padding: 6px 4px; text-align: right; font-size: 11px; color: #6b7280; text-transform: uppercase;">P.U.</th>
            <th style="padding: 6px 4px; text-align: right; font-size: 11px; color: #6b7280; text-transform: uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="padding: 16px 20px; margin-top: 8px;">
      <div style="border-top: 2px solid #1f2937; padding-top: 12px;">
        ${receipt.subtotal ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 13px; color: #6b7280;">Sous-total</span>
          <span style="font-size: 13px; color: #1f2937;">${this.formatAmount(receipt.subtotal)} ${receipt.currency || 'USD'}</span>
        </div>` : ''}
        ${receipt.discount ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 13px; color: #6b7280;">Remise</span>
          <span style="font-size: 13px; color: #dc2626;">- ${this.formatAmount(receipt.discount)} ${receipt.currency || 'USD'}</span>
        </div>` : ''}
        ${receipt.tax ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 13px; color: #6b7280">Taxe</span>
          <span style="font-size: 13px; color: #1f2937;">${this.formatAmount(receipt.tax)} ${receipt.currency || 'USD'}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #1f2937;">
          <span style="font-size: 16px; font-weight: 700; color: #1f2937;">TOTAL</span>
          <span style="font-size: 18px; font-weight: 700; color: #1f2937;">${this.formatAmount(receipt.total)} ${receipt.currency || 'USD'}</span>
        </div>
      </div>
    </div>

    <!-- Payment Method -->
    <div style="padding: 12px 20px; background: #f9fafb; border-top: 2px dashed #e5e7eb;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; color: #6b7280;">Mode de paiement</span>
        <span style="font-size: 13px; font-weight: 600; color: #1f2937;">${paymentLabel}</span>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 20px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
      <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 600;">${receipt.footer || 'Merci pour votre achat ! 🙏'}</p>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.5); font-size: 11px;">Propulsé par AURA OS</p>
    </div>

  </div>
</body>
</html>`;
  }

  generateReceiptPdf(receipt: Receipt): Buffer {
    const html = this.generateReceiptHtml(receipt);
    return Buffer.from(html, 'utf-8');
  }

  private formatAmount(amount: number): string {
    if (amount === undefined || amount === null) return '0';
    return Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  private formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private getPaymentLabel(method: string, provider?: string): string {
    const labels: Record<string, string> = {
      CASH: '💵 Espèces',
      MOBILE_MONEY: `📱 Mobile Money${provider ? ` (${provider})` : ''}`,
      CARD: '💳 Carte bancaire',
      CREDIT: '📝 Crédit',
    };
    return labels[method] || method;
  }
}
