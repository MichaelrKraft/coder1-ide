// Outreach Components - LeadPoint.ai
// Export all outreach-related components

export { ToneSelector, TONE_OPTIONS } from "./tone-selector";
export type { MessageTone } from "./tone-selector";

export { VariableInserter, AVAILABLE_VARIABLES } from "./variable-inserter";
export type { VariableOption } from "./variable-inserter";

export { MessagePreview, substituteVariables, formatFollowerCount } from "./message-preview";

export { MessageTemplates, DEFAULT_TEMPLATES } from "./message-templates";
export type { TemplateCategory } from "./message-templates";

export { OutreachComposer } from "./outreach-composer";
export type { MessageType } from "./outreach-composer";

export { OutreachHistory, STATUS_CONFIG, formatRelativeTime } from "./outreach-history";

export { OutreachCard, OutreachCardCompact } from "./outreach-card";
