import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { CompaniesService } from '../modules/companies/companies.service';

// ─── Types ─────────────────────────────────────────────────────

export interface DashboardModule {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface DashboardPage {
  id: string;
  name: string;
  route: string;
  icon: string;
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  config: Record<string, any>;
}

export interface DashboardKpi {
  id: string;
  name: string;
  target: string;
  unit: string;
}

export interface DashboardAutomation {
  id: string;
  name: string;
  trigger: string;
  action: string;
}

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  order: number;
}

export interface DashboardConfig {
  modules: DashboardModule[];
  pages: DashboardPage[];
  widgets: DashboardWidget[];
  kpis: DashboardKpi[];
  automations: DashboardAutomation[];
  navigation: DashboardNavItem[];
}

export interface CompanyProfile {
  sector: string;
  sub_sector: string;
  activity_description: string;
  size: string;
  country: string;
  city: string;
  products: string[];
  services: string[];
  target_clients: string[];
  objectives: string[];
  challenges: string[];
  estimated_revenue: string;
  business_processes: string[];
  tools_used: string[];
  communication_channels: string[];
  priority_needs: string[];
  opportunities: string[];
  risks: string[];
}

export interface FullPlatformConfig {
  company_profile: CompanyProfile;
  dashboard_config: DashboardConfig;
  agents_config: any[];
  workflows: any[];
}

// ─── Stored record shape ───────────────────────────────────────

interface StoredDashboardRecord {
  companyId: string;
  companyProfile: CompanyProfile;
  dashboardConfig: DashboardConfig;
  agentsConfig: any[];
  workflows: any[];
  generatedAt: string;
  updatedAt: string;
}

// ─── Service ───────────────────────────────────────────────────

@Injectable()
export class DashboardEngineService {
  private readonly logger = new Logger('DashboardEngine');

  constructor(
    private readonly companiesService: CompaniesService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  //  GENERATE — store the LLM-designed dashboard config
  // ═══════════════════════════════════════════════════════════════

  async generateDashboard(
    companyId: string,
    fullPlatformConfig: FullPlatformConfig,
  ): Promise<StoredDashboardRecord> {
    // Validate company exists
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException(`Company "${companyId}" not found`);
    }

    // Validate the incoming config has the minimum required sections
    this.validateDashboardConfig(fullPlatformConfig.dashboard_config);

    const now = new Date().toISOString();

    const record: StoredDashboardRecord = {
      companyId,
      companyProfile: fullPlatformConfig.company_profile,
      dashboardConfig: fullPlatformConfig.dashboard_config,
      agentsConfig: fullPlatformConfig.agents_config,
      workflows: fullPlatformConfig.workflows,
      generatedAt: now,
      updatedAt: now,
    };

    // Persist inside the company's aiProfile jsonb column
    await this.companiesService.update(companyId, {
      aiProfile: {
        ...(company.aiProfile ?? {}),
        dashboard: record,
      },
    } as any);

    this.logger.log(
      `Dashboard generated for company "${company.name}" (${companyId}) — ` +
      `${record.dashboardConfig.modules.length} modules, ` +
      `${record.dashboardConfig.widgets.length} widgets, ` +
      `${record.dashboardConfig.kpis.length} KPIs, ` +
      `${record.dashboardConfig.automations.length} automations`,
    );

    return record;
  }

  // ═══════════════════════════════════════════════════════════════
  //  GET — retrieve the stored dashboard config
  // ═══════════════════════════════════════════════════════════════

  async getDashboard(companyId: string): Promise<StoredDashboardRecord> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException(`Company "${companyId}" not found`);
    }

    const record: StoredDashboardRecord | undefined = company.aiProfile?.dashboard;
    if (!record) {
      throw new NotFoundException(
        `No dashboard config found for company "${companyId}". Call generateDashboard first.`,
      );
    }

    return record;
  }

  // ═══════════════════════════════════════════════════════════════
  //  UPDATE — partial patch of the stored dashboard config
  // ═══════════════════════════════════════════════════════════════

  async updateDashboard(
    companyId: string,
    updates: Partial<DashboardConfig>,
  ): Promise<StoredDashboardRecord> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException(`Company "${companyId}" not found`);
    }

    const existing: StoredDashboardRecord | undefined = company.aiProfile?.dashboard;
    if (!existing) {
      throw new NotFoundException(
        `No dashboard config found for company "${companyId}". Call generateDashboard first.`,
      );
    }

    // Deep-merge only the sections that were provided
    const mergedConfig: DashboardConfig = {
      modules: updates.modules ?? existing.dashboardConfig.modules,
      pages: updates.pages ?? existing.dashboardConfig.pages,
      widgets: updates.widgets ?? existing.dashboardConfig.widgets,
      kpis: updates.kpis ?? existing.dashboardConfig.kpis,
      automations: updates.automations ?? existing.dashboardConfig.automations,
      navigation: updates.navigation ?? existing.dashboardConfig.navigation,
    };

    const updatedRecord: StoredDashboardRecord = {
      ...existing,
      dashboardConfig: mergedConfig,
      updatedAt: new Date().toISOString(),
    };

    await this.companiesService.update(companyId, {
      aiProfile: {
        ...(company.aiProfile ?? {}),
        dashboard: updatedRecord,
      },
    } as any);

    this.logger.log(`Dashboard updated for company "${company.name}" (${companyId})`);

    return updatedRecord;
  }

  // ═══════════════════════════════════════════════════════════════
  //  DELETE — remove the dashboard config
  // ═══════════════════════════════════════════════════════════════

  async deleteDashboard(companyId: string): Promise<void> {
    const company = await this.companiesService.findById(companyId);
    if (!company) {
      throw new NotFoundException(`Company "${companyId}" not found`);
    }

    const aiProfile = { ...(company.aiProfile ?? {}) };
    delete aiProfile.dashboard;

    await this.companiesService.update(companyId, { aiProfile } as any);

    this.logger.log(`Dashboard deleted for company "${company.name}" (${companyId})`);
  }

  // ═══════════════════════════════════════════════════════════════
  //  VALIDATION
  // ═══════════════════════════════════════════════════════════════

  private validateDashboardConfig(config: DashboardConfig): void {
    const required: [keyof DashboardConfig, string][] = [
      ['modules', 'DashboardModule[]'],
      ['pages', 'DashboardPage[]'],
      ['widgets', 'DashboardWidget[]'],
      ['kpis', 'DashboardKpi[]'],
      ['automations', 'DashboardAutomation[]'],
      ['navigation', 'DashboardNavItem[]'],
    ];

    for (const [key, typeName] of required) {
      if (!Array.isArray(config[key])) {
        throw new BadRequestException(
          `dashboard_config.${key} is required and must be an array (${typeName})`,
        );
      }
    }
  }
}
