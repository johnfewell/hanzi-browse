import { fireEvent, render, screen, cleanup } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

afterEach(cleanup);

describe('EmptyState', () => {
  it('shows human-focused examples by default', () => {
    render(<EmptyState onSelectExample={vi.fn()} />);
    expect(screen.getByText('Summarize my open Jira tickets')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('shows agent-focused examples in agent mode', () => {
    render(<EmptyState onSelectExample={vi.fn()} primaryMode="agent" />);
    expect(screen.getByText('Check the staging deployment for errors')).toBeTruthy();
    expect(screen.queryByText('Summarize my open Jira tickets')).toBeNull();
  });

  it('calls onSelectExample with the chip text when clicked', () => {
    const onSelectExample = vi.fn();
    render(<EmptyState onSelectExample={onSelectExample} />);
    fireEvent.click(screen.getByText('Compare prices for flights to Tokyo next week'));
    expect(onSelectExample).toHaveBeenCalledWith('Compare prices for flights to Tokyo next week');
  });
});
