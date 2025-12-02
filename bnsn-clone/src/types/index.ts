// User types
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// Blueprint types
export interface Testimonial {
  id: string;
  name: string;
  role?: string;
  quote: string;
  result?: string;
}

export interface Bonus {
  id: string;
  name: string;
  description: string;
  value: number;
}

export interface Blueprint {
  id: string;
  user_id: string;
  name: string;
  product_name: string;
  product_description: string;
  target_audience: string;
  pain_points: string;
  desires: string;
  main_problem: string;
  solution: string;
  unique_mechanism: string;
  benefits: string[];
  objections: string[];
  testimonials: Testimonial[];
  price: string;
  guarantee: string;
  bonuses: string[];
  author_name: string;
  author_bio: string;
  created_at: string;
  updated_at: string;
}

export interface BlueprintFormData {
  name: string;
  product_name: string;
  product_description: string;
  target_audience: string;
  pain_points: string;
  desires: string;
  main_problem: string;
  solution: string;
  unique_mechanism: string;
  benefits: string[];
  objections: string[];
  testimonials: Testimonial[];
  price: string;
  guarantee: string;
  bonuses: string[];
  author_name: string;
  author_bio: string;
}

// Project types
export type TemplateType = 'emails' | 'ads' | 'hooks' | 'vsl' | 'landing-page' | 'bonuses' | 'reddit' | 'advertorials' | 'articles';

export interface Project {
  id: string;
  user_id: string;
  blueprint_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  project_id: string;
  template_type: TemplateType;
  template_name: string;
  content: string;
  words_used: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Generation types
export interface GenerationRequest {
  blueprint_id: string;
  template_type: TemplateType;
  template_name: string;
  additional_context?: string;
}

export interface GenerationResponse {
  content: string;
  words_used: number;
}

// Quality score types
export interface QualityScore {
  overall: number;
  emotional_impact: number;
  clarity: number;
  call_to_action: number;
  urgency: number;
  suggestion?: string;
}

// Email sequence types
export const EMAIL_SEQUENCE = [
  { id: 1, title: 'Minimize Risks', purpose: 'Address fear of trying something new' },
  { id: 2, title: 'How Much Time?', purpose: 'Address time investment concerns' },
  { id: 3, title: 'The Success-Blocking Belief', purpose: 'Challenge limiting beliefs' },
  { id: 4, title: 'Bad Ideas', purpose: 'Show what doesn\'t work' },
  { id: 5, title: 'Keep An Open Mind', purpose: 'Prepare for the solution' },
  { id: 6, title: 'A Powerful New Way', purpose: 'Introduce the solution (THE PIVOT)' },
  { id: 7, title: 'Bad Habits', purpose: 'What to stop doing' },
  { id: 8, title: 'Success Story', purpose: 'Social proof' },
  { id: 9, title: 'Your First Step', purpose: 'Call to action' },
  { id: 10, title: 'Special Bonus', purpose: 'Urgency close' },
] as const;

// Ad types
export type AdPlatform = 'facebook' | 'youtube' | 'instagram' | 'tiktok';

export const AD_PLATFORMS: { id: AdPlatform; name: string; icon: string }[] = [
  { id: 'facebook', name: 'Facebook', icon: 'facebook' },
  { id: 'youtube', name: 'YouTube', icon: 'youtube' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram' },
  { id: 'tiktok', name: 'TikTok', icon: 'music' },
];

// Hook types
export const HOOK_TYPES = [
  { id: 'contrarian', name: 'Contrarian', description: 'Challenge a common belief' },
  { id: 'curiosity', name: 'Curiosity', description: 'Create an open loop' },
  { id: 'result', name: 'Result', description: 'Lead with the outcome' },
  { id: 'story', name: 'Story', description: 'Start mid-action' },
  { id: 'question', name: 'Question', description: 'Engage with direct question' },
  { id: 'callout', name: 'Call-Out', description: 'Directly address avatar' },
] as const;

// VSL section types
export const VSL_SECTIONS = [
  { id: 1, name: 'Snap Suggestion', slides: '10-15', purpose: 'Capture attention, create curiosity' },
  { id: 2, name: 'The Big Problem', slides: '25-35', purpose: 'Agitate the problem, establish authority' },
  { id: 3, name: 'The Bigger Solution', slides: '25-40', purpose: 'Introduce hope, present solution' },
  { id: 4, name: 'The Grand Offer', slides: '45+', purpose: 'Present offer, stack value, close' },
] as const;

// Landing page types
export type LandingPageType = 'sales' | 'optin';

export const LANDING_PAGE_TYPES: { id: LandingPageType; name: string; description: string }[] = [
  { id: 'sales', name: 'Sales Page', description: 'Long-form sales page with full offer' },
  { id: 'optin', name: 'Opt-in Page', description: 'Lead magnet or free offer page' },
];

// Quick start templates
export const QUICK_START_TEMPLATES = [
  {
    id: 'saas',
    name: 'SaaS Product',
    description: 'Software subscription pitch',
    defaults: {
      product_name: 'Your SaaS Product',
      target_audience: 'Business owners and entrepreneurs',
      main_problem: 'Spending too much time on manual tasks',
      solution: 'Automated software solution',
    },
  },
  {
    id: 'course',
    name: 'Online Course',
    description: 'Info product marketing',
    defaults: {
      product_name: 'Your Course Name',
      target_audience: 'People wanting to learn a new skill',
      main_problem: 'Lack of knowledge or skills in specific area',
      solution: 'Step-by-step training program',
    },
  },
  {
    id: 'agency',
    name: 'Agency Services',
    description: 'B2B service offering',
    defaults: {
      product_name: 'Your Agency Service',
      target_audience: 'Business owners needing expert help',
      main_problem: 'Not getting results from current efforts',
      solution: 'Done-for-you professional service',
    },
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Product-based selling',
    defaults: {
      product_name: 'Your Product',
      target_audience: 'Consumers with specific need',
      main_problem: 'Current products don\'t solve their problem',
      solution: 'Better designed product solution',
    },
  },
  {
    id: 'coaching',
    name: 'Coaching/Consulting',
    description: 'Personal brand offers',
    defaults: {
      product_name: 'Your Coaching Program',
      target_audience: 'Individuals seeking transformation',
      main_problem: 'Stuck and unable to achieve goals alone',
      solution: 'Personalized guidance and accountability',
    },
  },
] as const;
