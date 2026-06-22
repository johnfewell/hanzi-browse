import { fireEvent, render, screen, cleanup } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanModal } from './PlanModal';

afterEach(cleanup);

const plan = { domains: ['github.com', 'jira.example'], approach: ['Open repo', 'Read issues'] };

function setup(props = {}) {
  const defaults = { plan, onApprove: vi.fn(), onCancel: vi.fn() };
  return { ...render(<PlanModal {...defaults} {...props} />), props: { ...defaults, ...props } };
}

describe('PlanModal', () => {
  it('renders the plan domains and approach steps', () => {
    setup();
    expect(screen.getByText('github.com')).toBeTruthy();
    expect(screen.getByText('jira.example')).toBeTruthy();
    expect(screen.getByText('Open repo')).toBeTruthy();
    expect(screen.getByText('Read issues')).toBeTruthy();
  });

  it('accepts a string approach (not just an array)', () => {
    setup({ plan: { domains: [], approach: 'Just do the thing' } });
    expect(screen.getByText('Just do the thing')).toBeTruthy();
  });

  it('calls onApprove when Approve is clicked', () => {
    const { props } = setup();
    fireEvent.click(screen.getByText('Approve & Continue'));
    expect(props.onApprove).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const { props } = setup();
    fireEvent.click(screen.getByText('Cancel'));
    expect(props.onCancel).toHaveBeenCalled();
  });

  it('calls onCancel on Escape', () => {
    const { props } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when clicking the overlay but not the modal body', () => {
    const { props, container } = setup();
    fireEvent.click(screen.getByText('Review Plan')); // inside modal -> no cancel
    expect(props.onCancel).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('.modal-overlay'));
    expect(props.onCancel).toHaveBeenCalled();
  });
});
