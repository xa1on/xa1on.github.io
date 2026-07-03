export function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const ALLOWED_CLASSES = [
  'blue',
  'red',
  'green',
  'yellow',
  'cyan',
  'magenta',
  'white',
  'color-text',
  'color-dir',
  'color-file',
  'color-link',
  'color-error',
  'color-accent',
  'color-dim',
  'blue-color',
  'green-color',
  'red-color',
  'yellow-color',
  'cyan-color',
  'magenta-color',
  'white-color'
];

export function sanitizeHTML(str) {
  let escaped = escapeHTML(str);

  // Restore allowed span tags
  escaped = escaped.replace(/&lt;span class=&quot;([a-zA-Z\-]+)&quot;&gt;/g, (match, className) => {
    if (ALLOWED_CLASSES.includes(className)) {
      return `<span class="${className}">`;
    }
    return match;
  });

  // Restore closing span tags
  escaped = escaped.replace(/&lt;\/span&gt;/g, '</span>');

  return escaped;
}

export function parseMarkdown(text) {
  if (typeof text !== 'string') return '';

  const lines = text.split('\n');
  const processedLines = lines.map(line => {
    const sanitized = sanitizeHTML(line);

    const headerMatch = sanitized.match(/^(#+)\s*(.*)$/);
    if (headerMatch) {
      return `<span class="color-accent">${headerMatch[2]}</span>`;
    }

    let processed = sanitized;
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<span class="color-accent">$1</span>');
    processed = processed.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="color-link" target="_blank">$1</a>');
    processed = processed.replace(/\`(.*?)\`/g, '<span class="color-accent">$1</span>');
    return processed;
  });

  return processedLines.join('\n');
}
