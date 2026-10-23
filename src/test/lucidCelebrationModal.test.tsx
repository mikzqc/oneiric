import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LucidCelebrationModal } from '../components/celebration/LucidCelebrationModal';
import { LucidCelebrationEvent } from '../services/celebrationService';

describe('<LucidCelebrationModal /> Component', () => {
  it('renders nothing when event is null', () => {
    const { container } = render(<LucidCelebrationModal event={null} onDismiss={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders First Lucid Dream celebration banner and headline', () => {
    const event: LucidCelebrationEvent = {
      isFirstLucid: true,
      lucidCount: 1,
      dreamTitle: 'The Celestial Lake',
    };

    const handleDismiss = vi.fn();
    render(<LucidCelebrationModal event={event} onDismiss={handleDismiss} />);

    expect(screen.getByText('FIRST LUCID DREAM UNLOCKED')).toBeInTheDocument();
    expect(screen.getByText('YOU DID IT!')).toBeInTheDocument();
    expect(screen.getByText('YOU HAD A LUCID DREAM!')).toBeInTheDocument();
    expect(screen.getByText('You recognized the dream. Your practice is paying off.')).toBeInTheDocument();
    expect(screen.getByText(/The Celestial Lake/)).toBeInTheDocument();

    const returnBtn = screen.getByRole('button', { name: /Return to Journal/i });
    expect(returnBtn).toBeInTheDocument();

    fireEvent.click(returnBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders Subsequent Lucid Dream with counter badge', () => {
    const event: LucidCelebrationEvent = {
      isFirstLucid: false,
      lucidCount: 5,
      dreamTitle: 'Flying Across the Sea',
    };

    render(<LucidCelebrationModal event={event} onDismiss={() => {}} />);

    expect(screen.getByText('LUCID DREAM #5')).toBeInTheDocument();
    expect(screen.getByText('YOU DID IT!')).toBeInTheDocument();
  });

  it('dismisses when clicking close button or pressing Escape', () => {
    const event: LucidCelebrationEvent = {
      isFirstLucid: false,
      lucidCount: 2,
    };

    const handleDismiss = vi.fn();
    render(<LucidCelebrationModal event={event} onDismiss={handleDismiss} />);

    // Dismiss with Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleDismiss).toHaveBeenCalledTimes(1);

    // Dismiss with top-right X button
    const closeBtn = screen.getByLabelText(/Dismiss celebration/i);
    fireEvent.click(closeBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(2);
  });

  it('displays developer test mode indicator when isDevPreview is true', () => {
    const event: LucidCelebrationEvent = {
      isFirstLucid: true,
      lucidCount: 1,
      isDevPreview: true,
    };

    render(<LucidCelebrationModal event={event} onDismiss={() => {}} />);
    expect(screen.getByText(/Developer Test Mode · No records modified/i)).toBeInTheDocument();
  });
});
