import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowTemplate } from '../entities/workflow-template.entity';

interface SeedTemplate {
  name: string;
  description: string;
  category: string;
  industry: string;
  tags: string[];
  jsonTemplate: Record<string, any>;
}

@Injectable()
export class WorkflowTemplateSeedService {
  private readonly logger = new Logger(WorkflowTemplateSeedService.name);

  constructor(
    @InjectRepository(WorkflowTemplate)
    private readonly templateRepo: Repository<WorkflowTemplate>,
  ) {}

  async run(): Promise<void> {
    const count = await this.templateRepo.count();
    if (count > 0) {
      this.logger.log(`Templates already seeded (${count} found). Skipping.`);
      return;
    }

    const templates = this.getTemplates();
    for (const template of templates) {
      const existing = await this.templateRepo.findOne({ where: { name: template.name } });
      if (!existing) {
        await this.templateRepo.save(
          this.templateRepo.create({
            ...template,
            isSystem: true,
            isActive: true,
            usageCount: 0,
          }),
        );
      }
    }

    this.logger.log(`Seeded ${templates.length} workflow templates`);
  }

  private getTemplates(): SeedTemplate[] {
    return [
      {
        name: 'Social Media Auto-Post',
        description: 'Generate content, create visuals, publish on social media, track engagement',
        category: 'marketing',
        industry: 'all',
        tags: ['social', 'content', 'automation', 'marketing'],
        jsonTemplate: {
          name: 'Social Media Auto-Post',
          nodes: [
            { id: 'trigger-manual', name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [250, 300], parameters: {} },
            { id: 'generate-content', name: 'Generate Content', type: 'n8n-nodes-base.code', typeVersion: 1, position: [450, 300], parameters: { jsCode: '// Generate post content\nreturn [{ json: { content: "Today update", hashtags: ["#business"] } }];' } },
            { id: 'generate-image', name: 'Create Visual', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [650, 300], parameters: { method: 'POST', url: '={{$env.IMAGE_GEN_URL}}', body: { prompt: '={{$json.content}}', size: '1024x1024' } } },
            { id: 'publish-facebook', name: 'Publish Facebook', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [850, 200], parameters: { method: 'POST', url: 'https://graph.facebook.com/{{$env.FACEBOOK_PAGE_ID}}/feed', body: { message: '={{$json.content}}', access_token: '={{$env.ACCESS_TOKEN}}' } } },
            { id: 'publish-instagram', name: 'Publish Instagram', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [850, 400], parameters: { method: 'POST', url: 'https://graph.facebook.com/{{$env.INSTAGRAM_ACCOUNT_ID}}/media', body: { image_url: '={{$json.imageUrl}}', caption: '={{$json.content}}', access_token: '={{$env.ACCESS_TOKEN}}' } } },
            { id: 'track-metrics', name: 'Track Engagement', type: 'n8n-nodes-base.code', typeVersion: 1, position: [1050, 300], parameters: { jsCode: '// Track engagement metrics\nreturn [{ json: { success: true, postId: $json.id } }];' } },
          ],
          connections: {
            'trigger-manual': { main: [[{ node: 'Generate Content', type: 'main', index: 0 }]] },
            'Generate Content': { main: [[{ node: 'Create Visual', type: 'main', index: 0 }]] },
            'Create Visual': { main: [[{ node: 'Publish Facebook', type: 'main', index: 0 }, { node: 'Publish Instagram', type: 'main', index: 0 }]] },
            'Publish Facebook': { main: [[{ node: 'Track Engagement', type: 'main', index: 0 }]] },
            'Publish Instagram': { main: [[{ node: 'Track Engagement', type: 'main', index: 0 }]] },
          },
        },
      },
      {
        name: 'WhatsApp Auto Reply',
        description: 'Receive message, analyze intent, respond automatically, update CRM',
        category: 'whatsapp',
        industry: 'all',
        tags: ['whatsapp', 'crm', 'automation', 'support'],
        jsonTemplate: {
          name: 'WhatsApp Auto Reply',
          nodes: [
            { id: 'trigger-webhook', name: 'Webhook Trigger', type: 'n8n-nodes-base.webhook', typeVersion: 1, position: [250, 300], parameters: { path: 'aura-whatsapp-incoming', httpMethod: 'POST', responseMode: 'onReceived' } },
            { id: 'analyze-intent', name: 'Analyze Intent (AI)', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [450, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/ai/analyze-intent"}}', body: { message: '={{$json.message}}', context: '={{$json.sender}}' } } },
            { id: 'check-response-type', name: 'Check Response Type', type: 'n8n-nodes-base.if', typeVersion: 1, position: [650, 300], parameters: { conditions: { string: [{ value1: '={{$json.intent}}', operation: 'equals', value2: 'support' }] } } },
            { id: 'send-support-msg', name: 'Send Support Reply', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [850, 200], parameters: { method: 'POST', url: '={{$env.WHATSAPP_API_URL + "/api/send"}}', body: { to: '={{$json.to}}', message: '={{$json.replySupport}}' } } },
            { id: 'send-general-msg', name: 'Send General Reply', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [850, 400], parameters: { method: 'POST', url: '={{$env.WHATSAPP_API_URL + "/api/send"}}', body: { to: '={{$json.to}}', message: '={{$json.replyGeneral}}' } } },
            { id: 'update-crm', name: 'Update CRM', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [1050, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/crm/activities"}}', body: { type: 'whatsapp_interaction', contact: '={{$json.sender}}', content: '={{$json.message}}' } } },
          ],
          connections: {
            'Webhook Trigger': { main: [[{ node: 'Analyze Intent (AI)', type: 'main', index: 0 }]] },
            'Analyze Intent (AI)': { main: [[{ node: 'Check Response Type', type: 'main', index: 0 }]] },
            'Check Response Type': { main: [[{ node: 'Send Support Reply', type: 'main', index: 0 }], [{ node: 'Send General Reply', type: 'main', index: 0 }]] },
            'Send Support Reply': { main: [[{ node: 'Update CRM', type: 'main', index: 0 }]] },
            'Send General Reply': { main: [[{ node: 'Update CRM', type: 'main', index: 0 }]] },
          },
        },
      },
      {
        name: 'Email Nurturing Sequence',
        description: 'Welcome email, nurturing sequence, lead scoring, sales follow-up',
        category: 'email',
        industry: 'all',
        tags: ['email', 'nurturing', 'leads', 'automation'],
        jsonTemplate: {
          name: 'Email Nurturing Sequence',
          nodes: [
            { id: 'trigger-webhook', name: 'New Lead Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1, position: [250, 300], parameters: { path: 'aura-email-new-lead', httpMethod: 'POST', responseMode: 'onReceived' } },
            { id: 'send-welcome', name: 'Send Welcome Email', type: 'n8n-nodes-base.emailSend', typeVersion: 1, position: [450, 300], parameters: { fromEmail: '={{$env.EMAIL_FROM}}', toEmail: '={{$json.email}}', subject: 'Welcome!', html: '<h1>Welcome {{$json.name}}!</h1>' } },
            { id: 'wait-2-days', name: 'Wait 2 Days', type: 'n8n-nodes-base.wait', typeVersion: 1, position: [650, 300], parameters: { amount: 2, unit: 'days' } },
            { id: 'send-nurture', name: 'Send Nurture Email', type: 'n8n-nodes-base.emailSend', typeVersion: 1, position: [850, 300], parameters: { fromEmail: '={{$env.EMAIL_FROM}}', toEmail: '={{$json.email}}', subject: 'Tips and insights for you', html: '<p>Here are some tips...</p>' } },
            { id: 'score-lead', name: 'Update Lead Score', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [1050, 300], parameters: { method: 'PATCH', url: '={{$env.AURA_API_URL + "/api/crm/contacts/" + json.contactId}}', body: { leadScore: '={{$json.score + 10}}' } } },
            { id: 'notify-sales', name: 'Notify Sales', type: 'n8n-nodes-base.emailSend', typeVersion: 1, position: [1250, 300], parameters: { fromEmail: '={{$env.EMAIL_FROM}}', toEmail: '={{$env.SALES_EMAIL}}', subject: 'Hot Lead Alert!', text: 'New hot lead: {{$json.name}} (Score: {{$json.score}})' } },
          ],
          connections: {
            'New Lead Webhook': { main: [[{ node: 'Send Welcome Email', type: 'main', index: 0 }]] },
            'Send Welcome Email': { main: [[{ node: 'Wait 2 Days', type: 'main', index: 0 }]] },
            'Wait 2 Days': { main: [[{ node: 'Send Nurture Email', type: 'main', index: 0 }]] },
            'Send Nurture Email': { main: [[{ node: 'Update Lead Score', type: 'main', index: 0 }]] },
            'Update Lead Score': { main: [[{ node: 'Notify Sales', type: 'main', index: 0 }]] },
          },
        },
      },
      {
        name: 'CRM Lead Capture',
        description: 'Form submission, create contact, assign sales rep, send notification',
        category: 'crm',
        industry: 'all',
        tags: ['crm', 'lead', 'contact', 'automation'],
        jsonTemplate: {
          name: 'CRM Lead Capture',
          nodes: [
            { id: 'trigger-webhook', name: 'Form Submission', type: 'n8n-nodes-base.webhook', typeVersion: 1, position: [250, 300], parameters: { path: 'aura-crm-new-lead', httpMethod: 'POST', responseMode: 'onReceived' } },
            { id: 'validate-data', name: 'Validate Data', type: 'n8n-nodes-base.if', typeVersion: 1, position: [450, 300], parameters: { conditions: { string: [{ value1: '={{$json.email}}', operation: 'isNotEmpty' }] } } },
            { id: 'create-contact', name: 'Create Contact', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [650, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/crm/contacts"}}', body: { name: '={{$json.name}}', email: '={{$json.email}}', phone: '={{$json.phone}}', source: '={{$json.source || "form"}}' } } },
            { id: 'assign-rep', name: 'Assign Sales Rep', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [850, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/crm/tasks"}}', body: { type: 'follow_up', contactId: '={{$json.id}}', assignedTo: '={{$json.salesRepId}}' } } },
            { id: 'notify-team', name: 'Notify Team', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [1050, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/notifications"}}', body: { type: 'new_lead', message: 'New lead: {{$json.name}}' } } },
          ],
          connections: {
            'Form Submission': { main: [[{ node: 'Validate Data', type: 'main', index: 0 }]] },
            'Validate Data': { main: [[{ node: 'Create Contact', type: 'main', index: 0 }], []] },
            'Create Contact': { main: [[{ node: 'Assign Sales Rep', type: 'main', index: 0 }]] },
            'Assign Sales Rep': { main: [[{ node: 'Notify Team', type: 'main', index: 0 }]] },
          },
        },
      },
      {
        name: 'Support Ticket Auto-Router',
        description: 'Open ticket, classify priority, assign agent, auto-respond, monitor SLA',
        category: 'support',
        industry: 'all',
        tags: ['support', 'ticket', 'sla', 'automation'],
        jsonTemplate: {
          name: 'Support Ticket Auto-Router',
          nodes: [
            { id: 'trigger-webhook', name: 'New Ticket Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 1, position: [250, 300], parameters: { path: 'aura-support-new-ticket', httpMethod: 'POST', responseMode: 'onReceived' } },
            { id: 'classify-priority', name: 'AI Priority Classification', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [450, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/ai/classify-priority"}}', body: { subject: '={{$json.subject}}', message: '={{$json.message}}' } } },
            { id: 'check-urgency', name: 'Is Urgent?', type: 'n8n-nodes-base.if', typeVersion: 1, position: [650, 300], parameters: { conditions: { string: [{ value1: '={{$json.priority}}', operation: 'equals', value2: 'urgent' }] } } },
            { id: 'escalate-ticket', name: 'Escalate (Urgent)', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [850, 200], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/support/tickets/escalate"}}', body: { ticketId: '={{$json.ticketId}}', priority: 'urgent' } } },
            { id: 'auto-assign', name: 'Auto-Assign Agent', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [850, 400], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/support/tickets/assign"}}', body: { ticketId: '={{$json.ticketId}}', category: '={{$json.category}}' } } },
            { id: 'auto-response', name: 'Send Auto Response', type: 'n8n-nodes-base.emailSend', typeVersion: 1, position: [1050, 300], parameters: { fromEmail: '={{$env.SUPPORT_EMAIL}}', toEmail: '={{$json.email}}', subject: 'Ticket received: {{$json.subject}}', text: 'We received your request. Ticket #{{$json.ticketId}}.' } },
          ],
          connections: {
            'New Ticket Webhook': { main: [[{ node: 'AI Priority Classification', type: 'main', index: 0 }]] },
            'AI Priority Classification': { main: [[{ node: 'Is Urgent?', type: 'main', index: 0 }]] },
            'Is Urgent?': { main: [[{ node: 'Escalate (Urgent)', type: 'main', index: 0 }], [{ node: 'Auto-Assign Agent', type: 'main', index: 0 }]] },
            'Escalate (Urgent)': { main: [[{ node: 'Send Auto Response', type: 'main', index: 0 }]] },
            'Auto-Assign Agent': { main: [[{ node: 'Send Auto Response', type: 'main', index: 0 }]] },
          },
        },
      },
      {
        name: 'Sales Pipeline Automation',
        description: 'New opportunity, notify rep, send proposal, follow-up, record outcome',
        category: 'sales',
        industry: 'all',
        tags: ['sales', 'pipeline', 'deal', 'automation'],
        jsonTemplate: {
          name: 'Sales Pipeline Automation',
          nodes: [
            { id: 'trigger-webhook', name: 'New Opportunity', type: 'n8n-nodes-base.webhook', typeVersion: 1, position: [250, 300], parameters: { path: 'aura-sales-new-deal', httpMethod: 'POST', responseMode: 'onReceived' } },
            { id: 'qualify-lead', name: 'Qualify Lead Score', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [450, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/ai/qualify-lead"}}', body: { leadId: '={{$json.leadId}}', offer: '={{$json.offer}}' } } },
            { id: 'assign-rep', name: 'Assign to Rep', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [650, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/crm/tasks"}}', body: { type: 'sales_follow_up', contactId: '={{$json.leadId}}', priority: '={{$json.score > 70 ? "high" : "medium"}}' } } },
            { id: 'send-proposal', name: 'Send Proposal Email', type: 'n8n-nodes-base.emailSend', typeVersion: 1, position: [850, 300], parameters: { fromEmail: '={{$env.SALES_EMAIL}}', toEmail: '={{$json.email}}', subject: 'Proposal: {{$json.offer}}', html: '<p>Dear {{$json.name}},</p><p>Please find attached our proposal...</p>' } },
            { id: 'schedule-followup', name: 'Schedule Follow-up', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [1050, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/crm/tasks"}}', body: { type: 'follow_up_call', dueDate: '{{$now.plus({days: 3}).toISO()}}', contactId: '={{$json.leadId}}' } } },
          ],
          connections: {
            'New Opportunity': { main: [[{ node: 'Qualify Lead Score', type: 'main', index: 0 }]] },
            'Qualify Lead Score': { main: [[{ node: 'Assign to Rep', type: 'main', index: 0 }]] },
            'Assign to Rep': { main: [[{ node: 'Send Proposal Email', type: 'main', index: 0 }]] },
            'Send Proposal Email': { main: [[{ node: 'Schedule Follow-up', type: 'main', index: 0 }]] },
          },
        },
      },
      {
        name: 'Invoice Payment Reminder',
        description: 'Check overdue invoices, send reminder, escalate if needed',
        category: 'finance',
        industry: 'all',
        tags: ['finance', 'invoice', 'payment', 'reminder'],
        jsonTemplate: {
          name: 'Invoice Payment Reminder',
          nodes: [
            { id: 'trigger-schedule', name: 'Daily Schedule', type: 'n8n-nodes-base.cron', typeVersion: 1, position: [250, 300], parameters: { triggerTimes: { item: [{ mode: 'everyDay', hour: 9 }] } } },
            { id: 'check-overdue', name: 'Check Overdue Invoices', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [450, 300], parameters: { method: 'GET', url: '={{$env.AURA_API_URL + "/api/finance/invoices/overdue"}}' } },
            { id: 'loop-invoices', name: 'For Each Invoice', type: 'n8n-nodes-base.splitInBatches', typeVersion: 1, position: [650, 300], parameters: { batchSize: 1 } },
            { id: 'check-days-overdue', name: 'Days Overdue', type: 'n8n-nodes-base.if', typeVersion: 1, position: [850, 300], parameters: { conditions: { number: [{ value1: '={{$json.daysOverdue}}', operation: 'gt', value2: 30 }] } } },
            { id: 'escalate-invoice', name: 'Escalate to Collections', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [1050, 200], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/finance/invoices/" + $json.id + "/escalate"}}' } },
            { id: 'send-reminder', name: 'Send Reminder Email', type: 'n8n-nodes-base.emailSend', typeVersion: 1, position: [1050, 400], parameters: { fromEmail: '={{$env.FINANCE_EMAIL}}', toEmail: '={{$json.clientEmail}}', subject: 'Payment Reminder: Invoice #{{$json.invoiceNumber}}', html: '<p>Dear {{$json.clientName}},</p><p>Invoice #{{$json.invoiceNumber}} for <strong>${{$json.amount}}</strong> was due on {{$json.dueDate}}.</p>' } },
          ],
          connections: {
            'Daily Schedule': { main: [[{ node: 'Check Overdue Invoices', type: 'main', index: 0 }]] },
            'Check Overdue Invoices': { main: [[{ node: 'For Each Invoice', type: 'main', index: 0 }]] },
            'For Each Invoice': { main: [[{ node: 'Days Overdue', type: 'main', index: 0 }]] },
            'Days Overdue': { main: [[{ node: 'Escalate to Collections', type: 'main', index: 0 }], [{ node: 'Send Reminder Email', type: 'main', index: 0 }]] },
          },
        },
      },
      {
        name: 'Inactive Client Reactivation',
        description: 'Detect inactive clients, segment, send campaign, track response, update CRM',
        category: 'growth',
        industry: 'all',
        tags: ['growth', 'reactivation', 'email', 'crm'],
        jsonTemplate: {
          name: 'Inactive Client Reactivation',
          nodes: [
            { id: 'trigger-schedule', name: 'Weekly Schedule', type: 'n8n-nodes-base.cron', typeVersion: 1, position: [250, 300], parameters: { triggerTimes: { item: [{ mode: 'everyWeek', weekday: 1, hour: 10 }] } } },
            { id: 'detect-inactive', name: 'Detect Inactive Clients', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [450, 300], parameters: { method: 'GET', url: '={{$env.AURA_API_URL + "/api/crm/clients/inactive?days=30"}}' } },
            { id: 'segment-clients', name: 'Segment by Value', type: 'n8n-nodes-base.code', typeVersion: 1, position: [650, 300], parameters: { jsCode: 'const items = $input.all().map(i => i.json);\nreturn items.map(i => ({ json: { ...i, segment: i.lifetimeValue > 1000 ? "high" : i.lifetimeValue > 200 ? "medium" : "low" } }));' } },
            { id: 'generate-message', name: 'Generate Reactivation Message', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [850, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/ai/generate-content"}}', body: { type: 'reactivation_email', segment: '={{$json.segment}}', clientName: '={{$json.name}}' } } },
            { id: 'send-campaign', name: 'Send Reactivation Email', type: 'n8n-nodes-base.emailSend', typeVersion: 1, position: [1050, 300], parameters: { fromEmail: '={{$env.EMAIL_FROM}}', toEmail: '={{$json.email}}', subject: 'We miss you, {{$json.name}}!', html: '={{$json.emailBody}}' } },
            { id: 'update-crm', name: 'Update CRM Status', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [1250, 300], parameters: { method: 'PATCH', url: '={{$env.AURA_API_URL + "/api/crm/contacts/" + $json.id}}', body: { lastCampaignDate: '={{$now.toISO()}}', campaignType: 'reactivation' } } },
          ],
          connections: {
            'Weekly Schedule': { main: [[{ node: 'Detect Inactive Clients', type: 'main', index: 0 }]] },
            'Detect Inactive Clients': { main: [[{ node: 'Segment by Value', type: 'main', index: 0 }]] },
            'Segment by Value': { main: [[{ node: 'Generate Reactivation Message', type: 'main', index: 0 }]] },
            'Generate Reactivation Message': { main: [[{ node: 'Send Reactivation Email', type: 'main', index: 0 }]] },
            'Send Reactivation Email': { main: [[{ node: 'Update CRM Status', type: 'main', index: 0 }]] },
          },
        },
      },
      {
        name: 'Daily Team Summary',
        description: 'Generate daily summary, notify team, create tasks',
        category: 'operations',
        industry: 'all',
        tags: ['operations', 'summary', 'team', 'notification'],
        jsonTemplate: {
          name: 'Daily Team Summary',
          nodes: [
            { id: 'trigger-schedule', name: 'Daily at 8AM', type: 'n8n-nodes-base.cron', typeVersion: 1, position: [250, 300], parameters: { triggerTimes: { item: [{ mode: 'everyDay', hour: 8 }] } } },
            { id: 'gather-events', name: 'Gather Events', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [450, 300], parameters: { method: 'GET', url: '={{$env.AURA_API_URL + "/api/events/today"}}' } },
            { id: 'generate-summary', name: 'AI Generate Summary', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [650, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/ai/generate-summary"}}', body: { events: '={{$json.events}}', date: '={{$now.toISO()}}' } } },
            { id: 'send-slack', name: 'Send to Slack', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [850, 300], parameters: { method: 'POST', url: '={{$env.SLACK_WEBHOOK_URL}}', body: { text: '={{$json.summary}}' } } },
            { id: 'send-email', name: 'Send Email Digest', type: 'n8n-nodes-base.emailSend', typeVersion: 1, position: [1050, 300], parameters: { fromEmail: '={{$env.EMAIL_FROM}}', toEmail: '={{$env.TEAM_EMAIL}}', subject: 'Daily Summary - {{$now.format("yyyy-MM-dd")}}', html: '={{$json.summaryHtml}}' } },
          ],
          connections: {
            'Daily at 8AM': { main: [[{ node: 'Gather Events', type: 'main', index: 0 }]] },
            'Gather Events': { main: [[{ node: 'AI Generate Summary', type: 'main', index: 0 }]] },
            'AI Generate Summary': { main: [[{ node: 'Send to Slack', type: 'main', index: 0 }, { node: 'Send Email Digest', type: 'main', index: 0 }]] },
          },
        },
      },
      {
        name: 'Data Sync Between Services',
        description: 'Sync data between external services (CRM, Email, Calendar)',
        category: 'operations',
        industry: 'all',
        tags: ['sync', 'integration', 'data', 'operations'],
        jsonTemplate: {
          name: 'Data Sync Between Services',
          nodes: [
            { id: 'trigger-schedule', name: 'Every 6 Hours', type: 'n8n-nodes-base.cron', typeVersion: 1, position: [250, 300], parameters: { triggerTimes: { item: [{ mode: 'everyX', interval: 6, unit: 'hours' }] } } },
            { id: 'fetch-crm', name: 'Fetch CRM Updates', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [450, 200], parameters: { method: 'GET', url: '={{$env.AURA_API_URL + "/api/crm/changes?since=" + $env.LAST_SYNC}}' } },
            { id: 'fetch-email', name: 'Fetch Email Events', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [450, 400], parameters: { method: 'GET', url: '={{$env.EMAIL_API_URL + "/events?since=" + $env.LAST_SYNC}}' } },
            { id: 'merge-data', name: 'Merge and Deduplicate', type: 'n8n-nodes-base.code', typeVersion: 1, position: [650, 300], parameters: { jsCode: 'const crm = $("Fetch CRM Updates").all();\nconst email = $("Fetch Email Events").all();\nreturn [...crm, ...email];' } },
            { id: 'sync-targets', name: 'Sync to Targets', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [850, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/sync/apply"}}', body: { changes: '={{$json}}' } } },
            { id: 'log-sync', name: 'Log Sync Result', type: 'n8n-nodes-base.httpRequest', typeVersion: 1, position: [1050, 300], parameters: { method: 'POST', url: '={{$env.AURA_API_URL + "/api/logs/sync"}}', body: { timestamp: '={{$now.toISO()}}', records: '={{$json.changes.length}}' } } },
          ],
          connections: {
            'Every 6 Hours': { main: [[{ node: 'Fetch CRM Updates', type: 'main', index: 0 }, { node: 'Fetch Email Events', type: 'main', index: 0 }]] },
            'Fetch CRM Updates': { main: [[{ node: 'Merge and Deduplicate', type: 'main', index: 0 }]] },
            'Fetch Email Events': { main: [[{ node: 'Merge and Deduplicate', type: 'main', index: 0 }]] },
            'Merge and Deduplicate': { main: [[{ node: 'Sync to Targets', type: 'main', index: 0 }]] },
            'Sync to Targets': { main: [[{ node: 'Log Sync Result', type: 'main', index: 0 }]] },
          },
        },
      },
    ];
  }
}
