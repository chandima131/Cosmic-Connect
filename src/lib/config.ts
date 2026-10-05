export const jobTypes = ['Permanent', 'Temporary', 'Contract', 'Part Time', 'Full Time', 'Internship'];
export const experienceLevels = ['Entry level', 'Mid level', 'Senior', 'Leadership'];
export const applicationStatuses = ['NEW', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED'] as const;
export const jobStatuses = ['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'] as const;
export const date = (value: Date | string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
export const human = (s: string) => s.toLowerCase().replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
