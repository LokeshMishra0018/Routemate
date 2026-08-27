import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Select } from '../../src/components/ui/Select';
import { Modal } from '../../src/components/ui/Modal';
import { Tabs, RatingStars } from '../../src/components/ui/Tabs';
import { EmptyState, ErrorState } from '../../src/components/ui/EmptyState';

describe('UI Primitives Test Suite', () => {
  describe('Button Component', () => {
    it('renders with children and handles onClick', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      const btn = screen.getByRole('button', { name: /Click Me/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disables button and shows spinner when isLoading is true', () => {
      const handleClick = vi.fn();
      render(<Button isLoading onClick={handleClick}>Submit</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('applies variant styling classes properly', () => {
      const { rerender } = render(<Button variant="sos">Emergency SOS</Button>);
      expect(screen.getByRole('button')).toHaveClass('from-rose-600');

      rerender(<Button variant="success">Approved</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-emerald-600');
    });
  });

  describe('Input Component', () => {
    it('renders input with label, placeholder, and helper text', () => {
      render(
        <Input
          label="College ID"
          placeholder="KIET12345"
          helperText="Found on your smart card"
        />
      );
      expect(screen.getByText('College ID')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('KIET12345')).toBeInTheDocument();
      expect(screen.getByText('Found on your smart card')).toBeInTheDocument();
    });

    it('displays error message when error prop is provided', () => {
      render(<Input label="Email" error="Invalid institutional domain" />);
      expect(screen.getByText('Invalid institutional domain')).toBeInTheDocument();
    });
  });

  describe('Select Component', () => {
    it('renders options and responds to selection changes', () => {
      const handleChange = vi.fn();
      render(
        <Select
          label="Academic Year"
          options={[
            { value: '1', label: 'Year 1' },
            { value: '2', label: 'Year 2' },
          ]}
          onChange={handleChange}
        />
      );
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      fireEvent.change(select, { target: { value: '2' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Modal Component', () => {
    it('renders modal content and header when isOpen is true', () => {
      const handleClose = vi.fn();
      render(
        <Modal
          isOpen={true}
          onClose={handleClose}
          title="Modal Test Title"
          description="Detailed explanation inside dialog"
        >
          <p>Modal Body Content</p>
        </Modal>
      );
      expect(screen.getByText('Modal Test Title')).toBeInTheDocument();
      expect(screen.getByText('Detailed explanation inside dialog')).toBeInTheDocument();
      expect(screen.getByText('Modal Body Content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()} title="Hidden Modal">
          <p>Should Not Appear</p>
        </Modal>
      );
      expect(screen.queryByText('Hidden Modal')).not.toBeInTheDocument();
    });
  });

  describe('Tabs Component', () => {
    it('renders tabs with count badges and calls onChange on tab switch', () => {
      const handleTabChange = vi.fn();
      render(
        <Tabs
          tabs={[
            { id: 'tab1', label: 'Pending', count: 3 },
            { id: 'tab2', label: 'Completed', count: 12 },
          ]}
          activeTab="tab1"
          onChange={handleTabChange}
        />
      );
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      const tab2 = screen.getByText('Completed');
      fireEvent.click(tab2);
      expect(handleTabChange).toHaveBeenCalledWith('tab2');
    });
  });

  describe('RatingStars Component', () => {
    it('renders correct number of stars and supports interactive click', () => {
      const handleRatingChange = vi.fn();
      render(<RatingStars rating={4} interactive onChange={handleRatingChange} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);
      fireEvent.click(buttons[4]); // 5th star
      expect(handleRatingChange).toHaveBeenCalledWith(5);
    });
  });

  describe('EmptyState and ErrorState', () => {
    it('renders empty state with custom action button', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No Routes"
          description="Try changing your filters"
          actionLabel="Add Route"
          onAction={handleAction}
        />
      );
      expect(screen.getByText('No Routes')).toBeInTheDocument();
      const actionBtn = screen.getByRole('button', { name: /Add Route/i });
      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalled();
    });

    it('renders error state with retry button', () => {
      const handleRetry = vi.fn();
      render(<ErrorState message="Server connection failed" onRetry={handleRetry} />);
      expect(screen.getByText('Server connection failed')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Try Again/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalled();
    });
  });
});
