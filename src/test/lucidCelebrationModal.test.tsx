import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LucidCelebrationModal } from '../components/celebration/LucidCelebrationModal';
import { LucidCelebrationEvent } from '../services/celebrationService';

describe('<LucidCelebrationModal /> Pure Celebration UI', () => {
  it('renders nothing when event is null', () => {
    const { container } = render(<LucidCelebrationModal event={null} onDismiss={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders enormous congratulatory headlines and lucid message without gamification badges or return button', () => {
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
    expect(screen.getByText('Click anywhere to continue')).toBeInTheDocument();

    // Verify NO gamification / achievement text or badges exist
    expect(screen.queryByText(/FIRST LUCID DREAM UNLOCKED/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/LUCID DREAM #/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Milestone/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Achievement/i)).not.toBeInTheDocument();

    // Verify Return to Journal button and top-right close X button are removed
    expect(screen.queryByRole('button', { name: /Return to Journal/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Dismiss celebration/i)).not.toBeInTheDocument();

    // Clicking anywhere on the screen dismisses
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders "Want to turn it off?" link and clicking it calls onGoToSettings without propagating dismiss', () => {
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

    // Has the link to turn it off
    const turnOffLink = screen.getByRole('button', { name: /Want to turn it off\?/i });
    expect(turnOffLink).toBeInTheDocument();

    fireEvent.click(turnOffLink);
    expect(handleGoToSettings).toHaveBeenCalledTimes(1);
    expect(handleDismiss).not.toHaveBeenCalled();
  });

  it('dismisses when pressing Escape', () => {
    const event: LucidCelebrationEvent = {
      isFirstLucid: false,
      lucidCount: 2,
    };

    const handleDismiss = vi.fn();
    render(<LucidCelebrationModal event={event} onDismiss={handleDismiss} />);

    // Dismiss with Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleDismiss).toHaveBeenCalledTimes(1);
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
