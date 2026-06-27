import { Injectable } from '@nestjs/common';
import { Report } from '../entities/report.entity';

@Injectable()
export class ReportGeneratorService {
  generateWhatsAppSummary(report: Report): string {
    const content = report.content || {};
    const summary = content.summary || {};
    const sales = content.sales || {};
    const financial = content.financial || {};
    const inventory = content.inventory || {};
    const customers = content.customers || {};
    const aiInsights = content.aiInsights || {};
    const comparison = content.comparison || {};
    const topProducts = (sales.topProducts || []).slice(0, 3);
    const lowStockCount = (inventory.stockAlerts || []).length;
    const date = report.period?.startDate
      ? new Date(report.period.startDate).toLocaleDateString('fr-FR')
      : new Date().toLocaleDateString('fr-FR');

    const topProductLine = topProducts.length > 0
      ? `\n\n🏆 *Top Produit*\n• ${topProducts[0].name} - ${topProducts[0].quantity} vendus`
      : '';

    const stockLine = lowStockCount > 0
      ? `\n\n📉 *Stock bas*: ${lowStockCount} produit(s)`
      : '';

    const recommendationLine = aiInsights.recommendations && aiInsights.recommendations.length > 0
      ? `\n\n💡 *Recommendation*: ${aiInsights.recommendations[0]}`
      : '';

    const vsYesterday = comparison.vsYesterday || {};
    const trendIcon = (vsYesterday.revenueChange || 0) >= 0 ? '📈' : '📉';
    const trendLine = vsYesterday.revenueChange !== undefined
      ? `\n\n${trendIcon} *vs hier*: ${vsYesterday.revenueChange >= 0 ? '+' : ''}${vsYesterday.revenueChange.toFixed(1)}% CA`
      : '';

    return `📊 *Rapport du ${date}*

💰 Chiffre d'affaires : ${this.formatMoney(summary.revenue || 0)}
🛒 Ventes : ${summary.totalSales || 0} transaction(s)
📦 Articles vendus : ${summary.totalItems || 0}
💵 Bénéfice : ${this.formatMoney(financial.profit || 0)}
👥 Clients : ${customers.totalCustomers || 0} (${customers.newCustomers || 0} nouveaux)${topProductLine}${stockLine}${trendLine}${recommendationLine}

━━━━━━━━━━━━━━━
_AURA OS - Votre partenaire de confiance_`;
  }

  generateEmailHtml(report: Report): string {
    const content = report.content || {};
    const summary = content.summary || {};
    const sales = content.sales || {};
    const financial = content.financial || {};
    const inventory = content.inventory || {};
    const customers = content.customers || {};
    const employees = content.employees || {};
    const aiInsights = content.aiInsights || {};
    const comparison = content.comparison || {};
    const topProducts = sales.topProducts || [];
    const paymentBreakdown = sales.paymentBreakdown || [];
    const stockAlerts = inventory.stockAlerts || [];
    const hourlyBreakdown = sales.hourlyBreakdown || [];
    const date = report.period?.startDate
      ? new Date(report.period.startDate).toLocaleDateString('fr-FR')
      : new Date().toLocaleDateString('fr-FR');

    const topProductsRows = topProducts.map((p: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${p.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${p.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${this.formatMoney(p.revenue || 0)}</td>
      </tr>
    `).join('');

    const paymentRows = paymentBreakdown.map((p: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${p.method}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${p.count}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${this.formatMoney(p.total || 0)}</td>
      </tr>
    `).join('');

    const stockAlertRows = stockAlerts.slice(0, 5).map((a: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${a.product?.name || 'N/A'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #dc2626; font-weight: bold;">${a.currentStock}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${a.minStock}</td>
      </tr>
    `).join('');

    const employeeRows = (employees.performance || []).slice(0, 5).map((e: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${e.name || 'N/A'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${e.salesCount || 0}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${this.formatMoney(e.revenue || 0)}</td>
      </tr>
    `).join('');

    const recommendations = (aiInsights.recommendations || []).map((r: string) => `<li style="margin-bottom: 8px;">${r}</li>`).join('');
    const anomalies = (aiInsights.anomalies || []).map((a: string) => `<li style="margin-bottom: 8px; color: #dc2626;">${a}</li>`).join('');

    const vsYesterdayRevenue = comparison.vsYesterday?.revenueChange || 0;
    const vsLastWeekRevenue = comparison.vsLastWeek?.revenueChange || 0;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 700px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">AURA OS</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 14px;">Rapport du ${date}</p>
          </td>
        </tr>

        <tr>
          <td style="padding: 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 18px;">📊 Résumé de la journée</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
              <tr>
                <td width="25%" style="padding: 15px; background: #f0fdf4; border-radius: 8px; text-align: center;">
                  <p style="margin: 0; color: #16a34a; font-size: 22px; font-weight: bold;">${this.formatMoney(summary.revenue || 0)}</p>
                  <p style="margin: 5px 0 0; color: #6b7280; font-size: 12px;">Chiffre d'affaires</p>
                </td>
                <td width="25%" style="padding: 15px; background: #eff6ff; border-radius: 8px; text-align: center;">
                  <p style="margin: 0; color: #2563eb; font-size: 22px; font-weight: bold;">${summary.totalSales || 0}</p>
                  <p style="margin: 5px 0 0; color: #6b7280; font-size: 12px;">Transactions</p>
                </td>
                <td width="25%" style="padding: 15px; background: #fef3c7; border-radius: 8px; text-align: center;">
                  <p style="margin: 0; color: #d97706; font-size: 22px; font-weight: bold;">${this.formatMoney(financial.profit || 0)}</p>
                  <p style="margin: 5px 0 0; color: #6b7280; font-size: 12px;">Bénéfice</p>
                </td>
                <td width="25%" style="padding: 15px; background: #fdf2f8; border-radius: 8px; text-align: center;">
                  <p style="margin: 0; color: #db2777; font-size: 22px; font-weight: bold;">${customers.totalCustomers || 0}</p>
                  <p style="margin: 5px 0 0; color: #6b7280; font-size: 12px;">Clients</p>
                </td>
              </tr>
            </table>

            <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 10px;">💰 Ventes par mode de paiement</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <tr style="background: #f9fafb;">
                <th style="padding: 10px; text-align: left; font-size: 13px; color: #6b7280;">Mode</th>
                <th style="padding: 10px; text-align: center; font-size: 13px; color: #6b7280;">Nb</th>
                <th style="padding: 10px; text-align: right; font-size: 13px; color: #6b7280;">Total</th>
              </tr>
              ${paymentRows || '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #9ca3af;">Aucune donnée</td></tr>'}
            </table>

            <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 10px;">🏆 Top Produits</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <tr style="background: #f9fafb;">
                <th style="padding: 10px; text-align: left; font-size: 13px; color: #6b7280;">Produit</th>
                <th style="padding: 10px; text-align: center; font-size: 13px; color: #6b7280;">Qté</th>
                <th style="padding: 10px; text-align: right; font-size: 13px; color: #6b7280;">Revenu</th>
              </tr>
              ${topProductsRows || '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #9ca3af;">Aucune donnée</td></tr>'}
            </table>

            <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 10px;">👥 Analyse Clients</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
              <tr>
                <td style="padding: 12px; background: #f0fdf4; border-radius: 8px;">
                  <p style="margin: 0; font-size: 14px;">Nouveaux clients : <strong>${customers.newCustomers || 0}</strong></p>
                  <p style="margin: 5px 0 0; font-size: 14px;">Clients récurrents : <strong>${customers.returningCustomers || 0}</strong></p>
                </td>
              </tr>
            </table>

            ${stockAlerts.length > 0 ? `
            <h3 style="color: #dc2626; font-size: 16px; margin: 0 0 10px;">⚠️ Alertes Stock</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; border: 1px solid #fecaca; border-radius: 8px; overflow: hidden;">
              <tr style="background: #fef2f2;">
                <th style="padding: 10px; text-align: left; font-size: 13px; color: #dc2626;">Produit</th>
                <th style="padding: 10px; text-align: center; font-size: 13px; color: #dc2626;">Stock actuel</th>
                <th style="padding: 10px; text-align: center; font-size: 13px; color: #dc2626;">Stock min</th>
              </tr>
              ${stockAlertRows}
            </table>
            ` : ''}

            ${(employeeRows && employees.performance?.length > 0) ? `
            <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 10px;">👤 Performance Employés</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <tr style="background: #f9fafb;">
                <th style="padding: 10px; text-align: left; font-size: 13px; color: #6b7280;">Employé</th>
                <th style="padding: 10px; text-align: center; font-size: 13px; color: #6b7280;">Ventes</th>
                <th style="padding: 10px; text-align: right; font-size: 13px; color: #6b7280;">Revenu</th>
              </tr>
              ${employeeRows}
            </table>
            ` : ''}

            <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 10px;">📈 Comparaisons</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
              <tr>
                <td style="padding: 12px; background: ${vsYesterdayRevenue >= 0 ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px;">
                  <p style="margin: 0; font-size: 14px;">vs Hier : <strong style="color: ${vsYesterdayRevenue >= 0 ? '#16a34a' : '#dc2626'}">${vsYesterdayRevenue >= 0 ? '+' : ''}${vsYesterdayRevenue.toFixed(1)}%</strong> CA</p>
                  <p style="margin: 5px 0 0; font-size: 14px;">vs Semaine dernière : <strong style="color: ${vsLastWeekRevenue >= 0 ? '#16a34a' : '#dc2626'}">${vsLastWeekRevenue >= 0 ? '+' : ''}${vsLastWeekRevenue.toFixed(1)}%</strong> CA</p>
                </td>
              </tr>
            </table>

            ${recommendations ? `
            <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 10px;">💡 Insights IA</h3>
            <div style="padding: 15px; background: #eff6ff; border-radius: 8px; margin-bottom: 20px;">
              <ul style="margin: 0; padding-left: 20px; color: #1e40af;">${recommendations}</ul>
            </div>
            ` : ''}

            ${anomalies ? `
            <h3 style="color: #dc2626; font-size: 16px; margin: 0 0 10px;">⚠️ Anomalies détectées</h3>
            <div style="padding: 15px; background: #fef2f2; border-radius: 8px; margin-bottom: 20px;">
              <ul style="margin: 0; padding-left: 20px;">${anomalies}</ul>
            </div>
            ` : ''}
          </td>
        </tr>

        <tr>
          <td style="padding: 20px; text-align: center; background: #f3f4f6; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">AURA OS - African Unified Reasoning Assistant</p>
            <p style="color: #9ca3af; font-size: 11px; margin: 5px 0 0;">Rapport généré automatiquement le ${new Date().toLocaleDateString('fr-FR')}</p>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
  }

  generateDashboardData(report: Report): any {
    const content = report.content || {};
    return {
      reportId: report.id,
      type: report.type,
      status: report.status,
      period: report.period,
      generatedAt: report.generatedAt,
      summary: content.summary || {},
      sales: {
        topProducts: (content.sales?.topProducts || []).slice(0, 10),
        paymentBreakdown: content.sales?.paymentBreakdown || [],
        hourlyBreakdown: content.sales?.hourlyBreakdown || [],
        categoryBreakdown: content.sales?.categoryBreakdown || [],
      },
      financial: content.financial || {},
      inventory: {
        stockAlerts: (content.inventory?.stockAlerts || []).slice(0, 10),
        summary: content.inventory?.summary || {},
      },
      customers: content.customers || {},
      employees: {
        performance: (content.employees?.performance || []).slice(0, 10),
      },
      aiInsights: content.aiInsights || {},
      comparison: content.comparison || {},
      healthScore: content.healthScore || null,
    };
  }

  private formatMoney(amount: number): string {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(0);
  }
}
