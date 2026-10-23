import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LucidCelebrationModal } from '../components/celebration/LucidCelebrationModal';
import { LucidCelebrationEvent } from '../services/celebrationService';

describe('<LucidCelebrationModal /> Pure Celebration UI', () => {
  it('renders nothing when event is null', () => {
    const { container } = render(<LucidCelebrationModal event={null} onDismiss={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders enormous congratulatory headlines and lucid message without gamification or achievement badges', () => {
    const event: LucidCelebrationEvent = {
      isFirstLucid: true,
      lucidCount: 1,
      dreamTitle: 'The Celestial Lake',
    };

    const handleDismiss = vi.fn();
    render(<LucidCelebrationModal event={event} onDismiss={handleDismiss} />);

    // Bold, dominant celebratory headlines
    expect(screen.getByText('YOU DID IT!')).toBeInTheDocument();
    expect(screen.getByText('CONGRATULATIONS!')).toBeInTheDocument();
    expect(screen.getByText('You had a lucid dream!')).toBeInTheDocument();
    expect(screen.getByText(/The Celestial Lake/)).toBeInTheDocument();

    // Verify NO gamification / achievement text or badges exist
    expect(screen.queryByText(/FIRST LUCID DREAM UNLOCKED/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/LUCID DREAM #/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Milestone/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Achievement/i)).not.toBeInTheDocument();

    // Return to Journal button works
    const returnBtn = screen.getByRole('button', { name: /Return to Journal/i });
    expect(returnBtn).toBeInTheDocument();

    fireEvent.click(returnBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders "Want to turn it off?" link on subsequent celebrations and navigates to settings', () => {
    const event: LucidCelebrationEvent = {
      isFirstLucid: false,
      lucidCount: 3,
      dreamTitle: 'Soaring Over the Ocean',
    };

    const handleDismiss = vi.fn();
    const handleGoToSettings = vi.fn();
    render(
      <LucidCelebrationModal
        event={event}
        onDismiss={handleDismiss}
        onGoToSettings={handleGoToSettings}
      />
    );

    // Headlines
    expect(screen.getByText('YOU DID IT!')).toBeInTheDocument();
    expect(screen.getByText('CONGRATULATIONS!')).toBeInTheDocument();
    expect(screen.getByText('You had a lucid dream!')).toBeInTheDocument();

    // Subsequent has the link to turn it off
    const turnOffLink = screen.getByRole('button', { name: /Want to turn it off\?/i });
    expect(turnOffLink).toBeInTheDocument();

    fireEvent.click(turnOffLink);
    expect(handleGoToSettings).toHaveBeenCalledTimes(1);
  });

  it('does NOT render "Want to turn it off?" link on the first lucid dream celebration', () => {
    const event: LucidCelebrationEvent = {
      isFirstLucid: true,
      lucidCount: 1,
    };

    render(<LucidCelebrationModal event={event} onDismiss={() => {}} />);
    expect(screen.queryByRole('button', { name: /Want to turn it off\?/i })).not.toBeInTheDocument();
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
    expect(screen.getByText(/Developer Test Mode · No records altered/i)).toBeInTheDocument();
  });
});
