import DOMPurify from 'dompurify'

// Làm sạch HTML trước khi đưa vào v-html (nội dung từ LLM / người dùng / log).
export const sanitizeHtml = (html) => DOMPurify.sanitize(html ?? '')

export const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const escapeRegExp = (text) => String(text ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
