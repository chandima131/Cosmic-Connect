import type { Job } from '@prisma/client';
const roles = [
  ['Senior Software Engineer', 'Manchester', 'Engineering', 'Senior', 65000, 85000],
  ['Project Manager', 'London', 'Project management', 'Senior', 55000, 70000],
  ['Business Analyst', 'Birmingham', 'Business analysis', 'Mid level', 40000, 55000],
  ['Recruitment Consultant', 'Manchester', 'Recruitment', 'Mid level', 28000, 38000],
  ['Operations Coordinator', 'Leeds', 'Operations', 'Entry level', 26000, 32000],
] as const;
export const demoJobs: Job[] = roles.map(([title, location, skill, experienceRequired, salaryMin, salaryMax], i) => ({
  id: `demo-job-${i + 1}`, title, location, slug: `${title}-${location}`.toLowerCase().replaceAll(' ', '-'),
  description: `Take the next step as a ${title.toLowerCase()} with a collaborative, forward-thinking team. Bring your expertise to meaningful projects and find the space to grow. This is a fictional vacancy for demonstration purposes.`,
  jobType: i === 2 ? 'Contract' : 'Permanent', experienceRequired, salaryMin, salaryMax, salaryVisible: true, salaryText: null,
  skills: [skill, 'Communication', 'Collaboration'], responsibilities: 'Deliver high-quality work in your area of expertise.\nCollaborate with colleagues and stakeholders.\nIdentify opportunities to improve processes.',
  requirements: 'Relevant professional experience or qualifications.\nClear communication and a thoughtful approach to solving problems.\nA commitment to continuous learning.',
  benefits: 'Flexible working arrangements\nProfessional development\nSupportive team culture', closingDate: new Date('2026-12-31'), status: 'OPEN',
  createdAt: new Date(`2026-09-${24 - i}`), updatedAt: new Date('2026-09-24'), publishedAt: new Date(`2026-09-${24 - i}`),
}));
