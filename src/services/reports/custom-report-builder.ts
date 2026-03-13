import { ReportConfiguration, ReportSection, ReportTemplate } from './types';

export class CustomReportBuilder {
  private templates: Map<string, ReportTemplate> = new Map();

  createCustomReport(config: {
    name: string;
    description?: string;
    sections: string[];
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
    filters: any;
    styling?: any;
    userId: string;
  }): ReportConfiguration {
    const sections: ReportSection[] = config.sections.map((sectionType, index) => ({
      id: `section_${index}`,
      name: this.getSectionDisplayName(sectionType),
      type: sectionType as any,
      order: index + 1,
      config: this.getDefaultSectionConfig(sectionType),
      isVisible: true
    }));

    const reportConfig: ReportConfiguration = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      description: config.description,
      type: 'custom',
      format: 'pdf',
      dateRange: {
        ...config.dateRange,
        type: 'fixed'
      },
      filters: config.filters,
      sections,
      styling: config.styling || this.getDefaultStyling(),
      distribution: {
        email: { enabled: false, recipients: [] },
        storage: { enabled: true, path: '/reports/custom' }
      },
      created_by: config.userId,
      created_at: new Date(),
      updated_at: new Date()
    };

    return reportConfig;
  }

  private getSectionDisplayName(sectionType: string): string {
    const displayNames: Record<string, string> = {
      'summary': 'Financial Summary',
      'table': 'Transaction Details',
      'chart': 'Visual Charts',
      'breakdown': 'Category Breakdown',
      'trends': 'Spending Trends',
      'insights': 'Financial Insights'
    };
    
    return displayNames[sectionType] || sectionType;
  }

  private getDefaultSectionConfig(sectionType: string): any {
    const defaultConfigs: Record<string, any> = {
      'summary': { 
        showPercentages: true, 
        showTrends: true 
      },
      'table': { 
        sortBy: 'date', 
        sortOrder: 'desc', 
        limit: 100 
      },
      'chart': { 
        chartType: 'pie', 
        groupBy: 'category', 
        showPercentages: true 
      },
      'breakdown': { 
        groupBy: 'category', 
        showSubcategories: true 
      },
      'trends': { 
        groupBy: 'month', 
        showTrends: true 
      },
      'insights': {}
    };

    return defaultConfigs[sectionType] || {};
  }

  private getDefaultStyling(): any {
    return {
      theme: 'corporate',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      fontFamily: 'Arial',
      fontSize: 12,
      includeLogo: false,
      headerText: 'Financial Report'
    };
  }

  saveAsTemplate(config: ReportConfiguration, templateName: string): string {
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const template: ReportTemplate = {
      id: templateId,
      name: templateName,
      description: config.description || '',
      type: config.type,
      sections: config.sections,
      styling: config.styling,
      isBuiltIn: false,
      created_at: new Date()
    };

    this.templates.set(templateId, template);
    return templateId;
  }

  getCustomTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values()).filter(t => !t.isBuiltIn);
  }

  deleteTemplate(templateId: string): boolean {
    const template = this.templates.get(templateId);
    if (!template || template.isBuiltIn) return false;
    
    return this.templates.delete(templateId);
  }

  cloneReport(sourceConfig: ReportConfiguration, newName: string): ReportConfiguration {
    return {
      ...sourceConfig,
      id: `clone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      created_at: new Date(),
      updated_at: new Date()
    };
  }
}