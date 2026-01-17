/**
 * Resend Email Integration
 * Barrel exports for the Resend email library
 */

// Client exports
export {
  resend,
  sendEmail,
  isResendAvailable,
  getSenderEmail,
  type SendEmailOptions,
  type SendEmailResult,
} from './client';

// Template exports
export {
  wrapEmailHtml,
  generateSubject,
  generateSubjectOptions,
  createPlainText,
  generatePreview,
  type SubjectVariant,
} from './templates';
