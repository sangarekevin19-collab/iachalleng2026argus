import { Injectable, Logger } from '@nestjs/common';
import { WorkflowCategory } from '../entities/automation-workflow.entity';

export interface WorkflowGenerationRequest {
  objective: string;
  category?: WorkflowCategory;
  industry?: string;
  triggerType?: 'schedule' | 'webhook' | 'event' | 'manual';
  steps?: string[];
  requiresApproval?: boolean;
}

export interface GeneratedWorkflow {
  name: string;
  description: string;
  category: WorkflowCategory;
  steps: string[];
  nodes: any[];
  connections: Record<string, any>;
  triggers: Record<string, any>[];
  requiresApproval: boolean;
}

@Injectable()
export class WorkflowGeneratorService {
  private readonly logger = new Logger(WorkflowGeneratorService.name);

  private readonly workflowBlueprints: Record<string, () => Partial<GeneratedWorkflow>> = {
    marketing_campaign: () => ({
      name: 'Marketing Campaign',
      description: 'Generate content, create visuals, publish on social media, track performance',
      category: WorkflowCategory.MARKETING,
      steps: ['Generate Content', 'Create Visual', 'Review', 'Publish', 'Track Performance'],
      requiresApproval: true,
    }),
    whatsapp_auto_reply: () => ({
      name: 'WhatsApp Auto Reply',
      description: 'Receive message, analyze intent, respond automatically, update CRM',
      category: WorkflowCategory.WHATSAPP,
      steps: ['Receive Webhook', 'Analyze Intent', 'Generate Response', 'Send Reply', 'Log to CRM'],
      requiresApproval: false,
    }),
    email_sequence: () => ({
      name: 'Email Nurturing Sequence',
      description: 'Welcome email, nurturing sequence, lead scoring, sales follow-up',
      category: WorkflowCategory.EMAIL,
      steps: ['New Lead Trigger', 'Welcome Email', 'Wait 2 days', 'Nurture Email', 'Score Lead', 'Sales Follow-up'],
      requiresApproval: true,
    }),
    crm_lead_capture: () => ({
      name: 'CRM Lead Capture',
      description: 'Form submission, create contact, assign sales rep, send notification',
      category: WorkflowCategory.CRM,
      steps: ['Form Submission', 'Create Contact', 'Enrich Data', 'Assign to Sales', 'Notification'],
      requiresApproval: false,
    }),
    appointment_reminder: () => ({
      name: 'Appointment Reminder',
      description: 'Calendar event, send reminder, handle confirmation, notify team',
      category: WorkflowCategory.SALES,
      steps: ['Calendar Event', 'Schedule Reminder', 'Send Reminder', 'Handle Response', 'Update Calendar'],
      requiresApproval: false,
    }),
    support_ticket: () => ({
      name: 'Support Ticket Automation',
      description: 'Open ticket, classify priority, assign agent, auto-respond, escalate if needed',
      category: WorkflowCategory.SUPPORT,
      steps: ['New Request', 'Classify Priority', 'Create Ticket', 'Auto Response', 'Assign Agent', 'Monitor SLA'],
      requiresApproval: true,
    }),
    inactive_client_reactivation: () => ({
      name: 'Inactive Client Reactivation',
      description: 'Detect inactive clients, segment, send campaign, track response, update CRM',
      category: WorkflowCategory.MARKETING,
      steps: ['Detect Inactivity', 'Segment Clients', 'Generate Message', 'Send Campaign', 'Track Response', 'Update CRM'],
      requiresApproval: true,
    }),
    social_media_scheduler: () => ({
      name: 'Social Media Publisher',
      description: 'Generate post, create image, review, publish across platforms, track engagement',
      category: WorkflowCategory.MARKETING,
      steps: ['Content Generation', 'Image Creation', 'Approval Gate', 'Multi-platform Publish', 'Engagement Tracking'],
      requiresApproval: true,
    }),
    sales_pipeline: () => ({
      name: 'Sales Pipeline Automation',
      description: 'New opportunity, assign rep, send proposal, follow-up, record outcome',
      category: WorkflowCategory.SALES,
      steps: ['New Opportunity', 'Qualify Lead', 'Assign Rep', 'Send Proposal', 'Follow-up', 'Record Outcome'],
      requiresApproval: false,
    }),
    invoice_reminder: () => ({
      name: 'Invoice Payment Reminder',
      description: 'Check unpaid invoices, send reminder, escalate, update status',
      category: WorkflowCategory.FINANCE,
      steps: ['Check Overdue', 'Calculate Days', 'Send Reminder', 'Escalate if Needed', 'Update Status'],
      requiresApproval: true,
    }),
  };

  async generateWorkflow(request: WorkflowGenerationRequest): Promise<GeneratedWorkflow> {
    this.logger.log(`Generating workflow for: ${request.objective}`);

    // Find matching blueprint
    const blueprintKey = this.findBlueprint(request.objective);
    const blueprint = blueprintKey
      ? this.workflowBlueprints[blueprintKey]()
      : this.generateGenericBlueprint(request);

    const steps = request.steps || blueprint.steps || ['Step 1', 'Step 2', 'Step 3'];

    // Generate n8n-compatible nodes
    const nodes = this.generateNodes(steps, blueprint.category || WorkflowCategory.CUSTOM, request.triggerType || 'manual');
    const connections = this.generateConnections(nodes);
    const triggers = this.generateTriggers(request.triggerType || 'manual', request.objective);

    return {
      name: blueprint.name || `Auto: ${request.objective}`,
      description: blueprint.description || request.objective,
      category: blueprint.category || request.category || WorkflowCategory.CUSTOM,
      steps,
      nodes,
      connections,
      triggers,
      requiresApproval: request.requiresApproval ?? blueprint.requiresApproval ?? true,
    };
  }

  private findBlueprint(objective: string): string | null {
    const lower = objective.toLowerCase();

    if (lower.includes('market') || lower.includes('campaign') || lower.includes('social')) {
      if (lower.includes('inactiv') || lower.includes('reactiv')) return 'inactive_client_reactivation';
      if (lower.includes('schedule') || lower.includes('publish')) return 'social_media_scheduler';
      if (lower.includes('content') || lower.includes('post')) return 'marketing_campaign';
      return 'marketing_campaign';
    }
    if (lower.includes('whatsapp') || lower.includes('wa ')) return 'whatsapp_auto_reply';
    if (lower.includes('email') || lower.includes('newsletter') || lower.includes('sequence')) return 'email_sequence';
    if (lower.includes('crm') || lower.includes('lead') || lower.includes('contact')) return 'crm_lead_capture';
    if (lower.includes('appointment') || lower.includes('calendar') || lower.includes('reminder')) return 'appointment_reminder';
    if (lower.includes('support') || lower.includes('ticket') || lower.includes('help')) return 'support_ticket';
    if (lower.includes('sale') || lower.includes('pipeline') || lower.includes('deal')) return 'sales_pipeline';
    if (lower.includes('invoice') || lower.includes('payment')) return 'invoice_reminder';

    return null;
  }

  private generateGenericBlueprint(request: WorkflowGenerationRequest): Partial<GeneratedWorkflow> {
    return {
      name: request.objective,
      description: `Automated workflow for: ${request.objective}`,
      category: request.category || WorkflowCategory.CUSTOM,
      steps: request.steps || ['Trigger', 'Process', 'Output'],
      requiresApproval: request.requiresApproval ?? true,
    };
  }

  private generateNodes(steps: string[], category: WorkflowCategory, triggerType: string): any[] {
    const nodes: any[] = [];

    // Trigger node
    switch (triggerType) {
      case 'webhook':
        nodes.push({
          id: 'trigger-webhook',
          name: 'Webhook Trigger',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300],
          parameters: {
            path: `aura-${category}-${Date.now()}`,
            httpMethod: 'POST',
            responseMode: 'onReceived',
          },
        });
        break;
      case 'schedule':
        nodes.push({
          id: 'trigger-schedule',
          name: 'Schedule Trigger',
          type: 'n8n-nodes-base.cron',
          typeVersion: 1,
          position: [250, 300],
          parameters: {
            triggerTimes: { item: [{ mode: 'everyDay', hour: 9 }] },
          },
        });
        break;
      default:
        nodes.push({
          id: 'trigger-manual',
          name: 'Manual Trigger',
          type: 'n8n-nodes-base.manualTrigger',
          typeVersion: 1,
          position: [250, 300],
          parameters: {},
        });
    }

    // Step nodes
    steps.forEach((step, index) => {
      const nodeId = `step-${index}`;

      if (step.toLowerCase().includes('review') || step.toLowerCase().includes('approval')) {
        nodes.push({
          id: nodeId,
          name: step,
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [450 + index * 200, 300],
          parameters: {
            conditions: {
              boolean: [{ value1: true, value2: true }],
            },
          },
        });
      } else if (step.toLowerCase().includes('wait') || step.toLowerCase().includes('delay')) {
        nodes.push({
          id: nodeId,
          name: step,
          type: 'n8n-nodes-base.wait',
          typeVersion: 1,
          position: [450 + index * 200, 300],
          parameters: {
            amount: 2,
            unit: 'hours',
          },
        });
      } else if (step.toLowerCase().includes('email') || step.toLowerCase().includes('send')) {
        nodes.push({
          id: nodeId,
          name: step,
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 1,
          position: [450 + index * 200, 300],
          parameters: {},
        });
      } else if (step.toLowerCase().includes('http') || step.toLowerCase().includes('api')) {
        nodes.push({
          id: nodeId,
          name: step,
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [450 + index * 200, 300],
          parameters: {
            method: 'POST',
            url: '={{ $json.url }}',
          },
        });
      } else {
        nodes.push({
          id: nodeId,
          name: step,
          type: 'n8n-nodes-base.code',
          typeVersion: 1,
          position: [450 + index * 200, 300],
          parameters: {
            jsCode: `// ${step}\nreturn $input.all();`,
          },
        });
      }
    });

    return nodes;
  }

  private generateConnections(nodes: any[]): Record<string, any> {
    const connections: Record<string, any> = {};

    for (let i = 0; i < nodes.length - 1; i++) {
      const current = nodes[i];
      const next = nodes[i + 1];

      if (!connections[current.id]) {
        connections[current.id] = { main: [] };
      }
      connections[current.id].main.push([
        { node: next.id, type: 'main', index: 0 },
      ]);
    }

    return connections;
  }

  private generateTriggers(triggerType: string, objective: string): Record<string, any>[] {
    const triggers: Record<string, any>[] = [];

    switch (triggerType) {
      case 'webhook':
        triggers.push({
          type: 'webhook',
          event: 'incoming_data',
          description: `Webhook trigger for: ${objective}`,
        });
        break;
      case 'schedule':
        triggers.push({
          type: 'schedule',
          cron: '0 9 * * *',
          description: 'Daily at 9:00 AM',
        });
        break;
      case 'event':
        triggers.push({
          type: 'event',
          event: 'business_event',
          description: `Event trigger for: ${objective}`,
        });
        break;
      default:
        triggers.push({
          type: 'manual',
          description: 'Manual trigger',
        });
    }

    return triggers;
  }

  async generateFromLLM(objective: string, llmSuggestion: {
    name?: string;
    steps?: string[];
    category?: string;
    requiresApproval?: boolean;
  }): Promise<GeneratedWorkflow> {
    const category = (llmSuggestion.category as WorkflowCategory) || WorkflowCategory.CUSTOM;
    const steps = llmSuggestion.steps || ['Process', 'Output'];
    const nodes = this.generateNodes(steps, category, 'manual');
    const connections = this.generateConnections(nodes);

    return {
      name: llmSuggestion.name || objective,
      description: objective,
      category,
      steps,
      nodes,
      connections,
      triggers: [{ type: 'manual', description: 'Manual trigger' }],
      requiresApproval: llmSuggestion.requiresApproval ?? true,
    };
  }
}
