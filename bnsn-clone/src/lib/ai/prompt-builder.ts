import { Blueprint, TemplateType } from '@/types';
import { MASTER_COPYWRITER_PROMPT } from './prompts/master';
import { EMAIL_PROMPTS } from './prompts/emails';
import { AD_PROMPTS } from './prompts/ads';
import { HOOK_PROMPTS } from './prompts/hooks';
import { VSL_PROMPTS } from './prompts/vsl';
import { LANDING_PAGE_PROMPTS } from './prompts/landing-pages';
import { BONUS_PROMPTS } from './prompts/bonuses';
import { REDDIT_PROMPTS } from './prompts/reddit';
import { ADVERTORIAL_PROMPTS } from './prompts/advertorials';
import { ARTICLE_PROMPTS } from './prompts/articles';

export interface PromptContext {
  blueprint: Blueprint;
  templateType: TemplateType;
  templateName: string;
  additionalContext?: string;
}

function formatBlueprintContext(blueprint: Blueprint): string {
  return `
## PRODUCT INFORMATION
- **Product Name**: ${blueprint.product_name}
- **Description**: ${blueprint.product_description}

## TARGET AUDIENCE
- **Who They Are**: ${blueprint.target_audience}
- **Their Pain Points**: ${blueprint.pain_points}
- **Their Desires**: ${blueprint.desires}

## PROBLEM & SOLUTION
- **Main Problem**: ${blueprint.main_problem}
- **The Solution**: ${blueprint.solution}
- **Unique Mechanism**: ${blueprint.unique_mechanism}

## KEY BENEFITS
${blueprint.benefits?.map((b, i) => `${i + 1}. ${b}`).join('\n') || 'Not specified'}

## COMMON OBJECTIONS TO ADDRESS
${blueprint.objections?.map((o, i) => `${i + 1}. ${o}`).join('\n') || 'Not specified'}

## OFFER DETAILS
- **Price**: ${blueprint.price}
- **Guarantee**: ${blueprint.guarantee}
- **Bonuses**: ${blueprint.bonuses?.join(', ') || 'None specified'}

## AUTHOR/BRAND
- **Name**: ${blueprint.author_name}
- **Bio**: ${blueprint.author_bio}
`.trim();
}

function getTemplatePrompt(templateType: TemplateType, templateName: string): string {
  switch (templateType) {
    case 'emails':
      return EMAIL_PROMPTS[templateName] || EMAIL_PROMPTS.default;
    case 'ads':
      return AD_PROMPTS[templateName] || AD_PROMPTS.default;
    case 'hooks':
      return HOOK_PROMPTS[templateName] || HOOK_PROMPTS.default;
    case 'vsl':
      return VSL_PROMPTS[templateName] || VSL_PROMPTS.default;
    case 'landing-page':
      return LANDING_PAGE_PROMPTS[templateName] || LANDING_PAGE_PROMPTS.default;
    case 'bonuses':
      return BONUS_PROMPTS[templateName] || BONUS_PROMPTS.default;
    case 'reddit':
      return REDDIT_PROMPTS[templateName] || REDDIT_PROMPTS.default;
    case 'advertorials':
      return ADVERTORIAL_PROMPTS[templateName] || ADVERTORIAL_PROMPTS.default;
    case 'articles':
      return ARTICLE_PROMPTS[templateName] || ARTICLE_PROMPTS.default;
    default:
      return 'Generate compelling marketing copy based on the provided information.';
  }
}

export function buildPrompt(context: PromptContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const blueprintContext = formatBlueprintContext(context.blueprint);
  const templatePrompt = getTemplatePrompt(context.templateType, context.templateName);

  const systemPrompt = MASTER_COPYWRITER_PROMPT;

  const userPrompt = `
${templatePrompt}

---

# PRODUCT/SERVICE BLUEPRINT

${blueprintContext}

${context.additionalContext ? `\n## ADDITIONAL CONTEXT\n${context.additionalContext}` : ''}

---

Now write the copy following the template instructions above. Make it compelling, specific to this product, and ready to use.
`.trim();

  return { systemPrompt, userPrompt };
}

export function buildRefinementPrompt(
  originalContent: string,
  refinementType: string,
  refinementPrompt: string
): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: MASTER_COPYWRITER_PROMPT,
    userPrompt: `${refinementPrompt}

---

ORIGINAL COPY:

${originalContent}

---

Rewrite the copy according to the instructions above. Maintain the core message and product details while applying the requested changes.`,
  };
}
