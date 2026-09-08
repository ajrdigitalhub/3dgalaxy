import { WhatsAppAutoReplyService as Service } from './whatsappAutoReplyService';

/**
 * Backward compatibility alias:
 * Redirects any legacy AI service calls directly to WhatsAppAutoReplyService
 * ensuring only single-greeting auto-reply logic is executed.
 */
export const WhatsAppAutoReplyService = Service;
export const WhatsAppAiService = Service;
