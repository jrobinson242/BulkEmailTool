const logger = require('../utils/logger');

class TemplateService {
  /**
   * Parse and replace placeholders in template
   * Supports {{variable}} and conditional logic
   */
  static renderTemplate(template, data) {
    let rendered = template;

    // Replace simple placeholders: {{variable}}
    rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });

    // Handle conditional blocks: {{#if variable}}content{{/if}}
    rendered = rendered.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
      return data[key] ? content : '';
    });

    // Handle conditional else: {{#if variable}}content{{else}}alternative{{/if}}
    rendered = rendered.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, 
      (match, key, ifContent, elseContent) => {
        return data[key] ? ifContent : elseContent;
      });

    return rendered;
  }

  /**
   * Extract placeholder variables from template
   */
  static extractPlaceholders(template) {
    const placeholders = new Set();
    const regex = /\{\{(\w+)\}\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      placeholders.add(match[1]);
    }

    return Array.from(placeholders);
  }

  /**
   * Validate template syntax
   */
  static validateTemplate(template) {
    const errors = [];

    // Check for unclosed placeholders
    const openCount = (template.match(/\{\{/g) || []).length;
    const closeCount = (template.match(/\}\}/g) || []).length;
    if (openCount !== closeCount) {
      errors.push('Mismatched placeholder brackets');
    }

    // Check for unclosed conditionals
    const ifCount = (template.match(/\{\{#if/g) || []).length;
    const endifCount = (template.match(/\{\{\/if\}\}/g) || []).length;
    if (ifCount !== endifCount) {
      errors.push('Mismatched conditional blocks');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Add tracking pixel to email body
   */
  static addTrackingPixel(body, trackingId) {
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const trackingUrl = `${backendUrl}/api/analytics/track/${trackingId}`;
    const pixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none;" />`;
    
    // Insert before closing body tag or at the end
    if (body.includes('</body>')) {
      return body.replace('</body>', `${pixel}</body>`);
    }
    return body + pixel;
  }

  /**
   * Add tracking to links in email
   */
  static addLinkTracking(body, campaignId, contactId) {
    const urlRegex = /<a\s+href="([^"]+)"/gi;
    
    return body.replace(urlRegex, (match, url) => {
      const separator = url.includes('?') ? '&' : '?';
      const trackedUrl = `${url}${separator}utm_campaign=${campaignId}&utm_contact=${contactId}`;
      return `<a href="${trackedUrl}"`;
    });
  }
}

module.exports = TemplateService;
