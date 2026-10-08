import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (value, options = {}) => {
  const number = parseFloat(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    ...options
  }).format(number);
};

export const formatDate = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

export const formatProjectName = (project, customer) => {
  if (!project) return "—";
  return [project.project_name].filter(Boolean).join(" - ") || "—";
};

export const stripHtmlTags = (str) => {
  if (typeof str !== 'string') return str;
  let text = str.replace(/<br\s*\/?>/gi, ' ');
  text = text.replace(/<\/(div|p|h1|h2|h3|h4|h5|h6|li)>/gi, ' ');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
};
