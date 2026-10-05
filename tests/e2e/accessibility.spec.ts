import 'dotenv/config';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('public pages and candidate form meet automated accessibility checks', async ({ page }) => {
  for (const path of ['/', '/jobs', '/jobs/senior-software-engineer-manchester', '/apply/demo-job-1', '/about', '/contact', '/admin/login']) {
    await page.goto(path); await expect(page.locator('h1,h2').first()).toBeVisible();
    if (path === '/jobs') await expect(page.locator('.job-card').first()).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, failure: n.failureSummary })) })), `Accessibility violations on ${path}`).toEqual([]);
  }
});
test('recruiter dashboard meets automated accessibility checks', async ({ page }) => {
  test.skip(!process.env.DATABASE_URL || !process.env.ADMIN_PASSWORD, 'Requires seeded PostgreSQL.');
  await page.goto('/admin/login'); await page.getByLabel('Email address').fill(process.env.ADMIN_EMAIL!); await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD!); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, failure: n.failureSummary })) }))).toEqual([]);
  await page.screenshot({ path: 'test-results/admin-dashboard.png', fullPage: true });
});
