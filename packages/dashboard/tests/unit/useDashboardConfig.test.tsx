import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { useDashboardConfig } from '../../src/app/useDashboardConfig';

function Probe(): React.ReactElement {
  const { state, config, errorMessage } = useDashboardConfig();
  return (
    <div>
      <span data-testid="state">{state}</span>
      <span data-testid="views">{config?.views?.length ?? 0}</span>
      <span data-testid="error">{errorMessage}</span>
    </div>
  );
}

describe('useDashboardConfig', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('enters ready state for valid config', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ views: [{ type: 'image', settings: { src: '/a.png' } }] }),
    } as never);

    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(getByTestId('state').textContent).toBe('ready'));
    expect(getByTestId('views').textContent).toBe('1');
  });

  it('enters empty state when config endpoint returns 404', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as never);

    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(getByTestId('state').textContent).toBe('empty'));
  });
});
