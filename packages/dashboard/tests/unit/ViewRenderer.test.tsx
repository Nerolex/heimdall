import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ViewRenderer } from '../../src/components/shared/ViewRenderer';

describe('ViewRenderer', () => {
  it('renders ErrorState for unknown component type', () => {
    const { container } = render(
      <ViewRenderer type="nonexistent" settings={{}} />
    );
    expect(container.textContent).toContain('Unknown component type');
  });

  it('renders the registered component for a known type', () => {
    // ImageView should be registered — renders an img or container
    const { container } = render(
      <ViewRenderer type="image" settings={{ src: '/assets/placeholder.png' }} />
    );
    // Should render something (not the error state)
    expect(container.querySelector('[data-testid="error-state"]')).toBeNull();
  });
});
