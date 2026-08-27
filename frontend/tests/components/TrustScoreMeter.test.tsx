import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrustScoreMeter } from '../../src/components/ui/TrustScoreMeter';
import { Badge, Avatar } from '../../src/components/ui/Badge';

describe('TrustScoreMeter Component', () => {
  it('renders trust score correctly with tier badge', () => {
    render(<TrustScoreMeter score={85} size="md" showLabel={true} />);

    expect(screen.getByText(/85/)).toBeInTheDocument();
    expect(screen.getByText(/\(High Trust\)/)).toBeInTheDocument();
  });

  it('renders lower tier for lower scores', () => {
    render(<TrustScoreMeter score={45} size="sm" showLabel={true} />);

    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText(/\(Verified\)/)).toBeInTheDocument();
  });
});

describe('Badge and Avatar Components', () => {
  it('renders badges with appropriate styling variants', () => {
    render(<Badge variant="success">Verified</Badge>);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders avatar with initials when no image provided', () => {
    render(<Avatar name="Aarav Sharma" verified={true} />);
    expect(screen.getByText('AS')).toBeInTheDocument();
  });
});
