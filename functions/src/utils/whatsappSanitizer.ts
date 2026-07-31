/**
 * Utility functions to sanitize template parameters for Meta WhatsApp Cloud API.
 * Rule: Parameter text cannot have new-line/tab characters or more than 4 consecutive spaces.
 */

/**
 * Clean a single parameter value to satisfy Meta WhatsApp API requirements.
 * Replaces newlines (\r\n, \r, \n) and tabs (\t) with single space,
 * collapses 4+ consecutive spaces into a single space,
 * trims leading/trailing whitespace, and falls back to default if empty.
 */
export function sanitizeTemplateParam(value: any, fallback: string = 'N/A'): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  let str = String(value);
  // Replace newlines and tabs with single space
  str = str.replace(/[\r\n\t]+/g, ' ');
  // Replace 4 or more consecutive spaces with a single space
  str = str.replace(/\s{4,}/g, ' ');
  // Collapse multiple spaces into a single space
  str = str.replace(/ {2,}/g, ' ');
  // Trim leading/trailing spaces
  str = str.trim();
  return str.length > 0 ? str : fallback;
}

/**
 * Traverses a WhatsApp Meta API components array and sanitizes all 'text' parameters.
 */
export function sanitizeComponents(components: any[]): any[] {
  if (!Array.isArray(components)) return components;
  return components.map(comp => {
    if (!comp || !Array.isArray(comp.parameters)) return comp;
    return {
      ...comp,
      parameters: comp.parameters.map((param: any) => {
        if (param && param.type === 'text') {
          return {
            ...param,
            text: sanitizeTemplateParam(param.text)
          };
        }
        return param;
      })
    };
  });
}
