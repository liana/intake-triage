// Canonical submitter and AI-assigned vocabularies. See SPEC.md §3.
// Fixed lists rather than free text: this is what keeps the list filterable and
// model output comparable across submissions.

export const INDUSTRIES = [
  'Healthcare & Life Sciences',
  'Fintech & Financial Services',
  'E-Commerce & Retail',
  'Enterprise SaaS',
  'Industrial & Manufacturing',
  'Public Sector & Education',
  'Other',
] as const;

export const BUDGET_RANGES = [
  'Under $50k',
  '$50k–$100k',
  '$100k–$250k',
  '$250k+',
  'Not yet determined',
] as const;

export const TIMELINES = [
  'Under 4 weeks',
  '4–8 weeks',
  '2–6 months',
  '6+ months',
  'Not yet determined',
] as const;

export const TECHNICAL_PATTERNS = [
  'RAG & Knowledge Search',
  'Fine-Tuning & Custom Models',
  'Autonomous Agents & Workflows',
  'Computer Vision & Multimodal',
  'Predictive Analytics & Forecasting',
  'Data Engineering & Pipelines',
  'Legacy Migration & Integration',
  'Other',
] as const;

export const ENGAGEMENT_SHAPES = [
  'Strategy & Roadmap',
  'Discovery & Feasibility',
  'Prototype / PoC',
  'Production Build',
  'Optimization & Scaling',
  'Audit & Assessment',
  'Team Augmentation',
  'Other',
] as const;

export type Industry = (typeof INDUSTRIES)[number];
export type BudgetRange = (typeof BUDGET_RANGES)[number];
export type Timeline = (typeof TIMELINES)[number];
export type TechnicalPattern = (typeof TECHNICAL_PATTERNS)[number];
export type EngagementShape = (typeof ENGAGEMENT_SHAPES)[number];
