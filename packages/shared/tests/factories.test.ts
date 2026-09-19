import { describe, expect, it } from 'vitest';
import { factories } from './factories/index.js';

describe('shared factories', () => {
  it('creates user with overrides', () => {
    const user = factories.user({ role: 'admin' });
    expect(user.role).toBe('admin');
    expect(user.id).toMatch(/^user-\d+-/);
  });

  it('creates project with overrides', () => {
    const project = factories.project({ status: 'active' });
    expect(project.status).toBe('active');
    expect(project.id).toMatch(/^project-\d+-/);
  });

  it('creates many items with createMany', () => {
    const users = factories.createMany(factories.user, 3);
    expect(users).toHaveLength(3);
  });

  it('resets counters', () => {
    factories.user();
    factories.project();
    factories.resetCounters();
    const user = factories.user();
    const project = factories.project();
    expect(user.id).toMatch(/^user-1-/);
    expect(project.id).toMatch(/^project-1-/);
  });
});
