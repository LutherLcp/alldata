import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../utils/render';
import { factories } from '@alldata/shared/tests/factories';

describe('Web Test Utilities', () => {
  it('should render with providers', () => {
    const { container } = renderWithProviders(
      <div data-testid="test">Hello World</div>
    );
    expect(container.querySelector('[data-testid="test"]')).toHaveTextContent('Hello World');
  });

  it('should work with react-router', () => {
    const { container } = renderWithProviders(
      <div data-testid="router-test">Router Test</div>,
      { initialEntries: ['/dashboard'] }
    );
    expect(container.querySelector('[data-testid="router-test"]')).toHaveTextContent('Router Test');
  });
});

describe('Factories', () => {
  it('should create user factory', () => {
    const user = factories.user({ role: 'admin' });
    expect(user.role).toBe('admin');
    expect(user.id).toMatch(/^user-\d+-[a-f0-9-]+$/);
  });

  it('should create project factory', () => {
    const project = factories.project({ status: 'active' });
    expect(project.status).toBe('active');
    expect(project.code).toMatch(/^proj_[a-z0-9]{8}$/);
  });

  it('should create multiple items with createMany', () => {
    const users = factories.createMany(factories.user, 3, { status: 'active' });
    expect(users).toHaveLength(3);
    users.forEach(u => expect(u.status).toBe('active'));
  });

  it('should reset counters', () => {
    factories.user();
    factories.project();
    factories.resetCounters();
    const user = factories.user();
    const project = factories.project();
    expect(user.id).toMatch(/^user-1-/);
    expect(project.id).toMatch(/^project-1-/);
  });
});