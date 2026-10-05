import type { Job } from '@prisma/client';
export function jobPosting(job: Job) {
  const employmentTypes: Record<string, string> = { Permanent: 'FULL_TIME', Temporary: 'TEMPORARY', Contract: 'CONTRACTOR', 'Part Time': 'PART_TIME', 'Full Time': 'FULL_TIME', Internship: 'INTERN' };
  return { '@context': 'https://schema.org', '@type': 'JobPosting', title: job.title, description: job.description, datePosted: (job.publishedAt || job.createdAt).toISOString(), validThrough: job.closingDate.toISOString(), employmentType: employmentTypes[job.jobType], hiringOrganization: { '@type': 'Organization', name: 'Cosmic Connect' }, jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location, addressCountry: 'GB' } }, ...(job.salaryVisible && job.salaryMin ? { baseSalary: { '@type': 'MonetaryAmount', currency: 'GBP', value: { '@type': 'QuantitativeValue', minValue: job.salaryMin, maxValue: job.salaryMax || job.salaryMin, unitText: 'YEAR' } } } : {}) };
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function jobHtml(html: string, job: Job, origin: string) {
  const title = escapeHtml(`${job.title} in ${job.location} | Cosmic Connect`); const description = escapeHtml(job.description.slice(0, 160));
  let output = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`).replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${description}"/>`).replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}"/>`).replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${description}"/>`);
  output = output.replace('</head>', `<link rel="canonical" href="${escapeHtml(origin)}/jobs/${encodeURIComponent(job.slug)}"/></head>`);
  if (job.status === 'OPEN' && job.closingDate > new Date()) output = output.replace('</head>', `<script type="application/ld+json">${JSON.stringify(jobPosting(job)).replaceAll('<', '\\u003c')}</script></head>`);
  return output;
}
