import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ImageView } from '../../src/components/shared/ImageView';

describe('ImageView', () => {
  it('renders an image with the given src', () => {
    const { container } = render(
      <ImageView settings={{ src: '/assets/test.png', displayMode: 'contain' }} />
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img!.getAttribute('src')).toBe('/assets/test.png');
  });

  it('maps displayMode "contain" to object-fit: contain', () => {
    const { container } = render(
      <ImageView settings={{ src: '/test.png', displayMode: 'contain' }} />
    );
    const img = container.querySelector('img');
    expect(img!.style.objectFit).toBe('contain');
  });

  it('maps displayMode "cover" to object-fit: cover', () => {
    const { container } = render(
      <ImageView settings={{ src: '/test.png', displayMode: 'cover' }} />
    );
    const img = container.querySelector('img');
    expect(img!.style.objectFit).toBe('cover');
  });

  it('maps displayMode "stretch" to object-fit: fill', () => {
    const { container } = render(
      <ImageView settings={{ src: '/test.png', displayMode: 'stretch' }} />
    );
    const img = container.querySelector('img');
    expect(img!.style.objectFit).toBe('fill');
  });

  it('maps displayMode "center" to object-fit: none', () => {
    const { container } = render(
      <ImageView settings={{ src: '/test.png', displayMode: 'center' }} />
    );
    const img = container.querySelector('img');
    expect(img!.style.objectFit).toBe('none');
  });

  it('defaults to "contain" when displayMode is missing', () => {
    const { container } = render(
      <ImageView settings={{ src: '/test.png' }} />
    );
    const img = container.querySelector('img');
    expect(img!.style.objectFit).toBe('contain');
  });

  it('shows placeholder text when src is missing', () => {
    const { container } = render(
      <ImageView settings={{}} />
    );
    expect(container.textContent).toContain('No image source');
  });

  it('uses width: 100% and height: 100% for responsive scaling', () => {
    const { container } = render(
      <ImageView settings={{ src: '/test.png', displayMode: 'contain' }} />
    );
    const img = container.querySelector('img');
    expect(img!.style.width).toBe('100%');
    expect(img!.style.height).toBe('100%');
  });

  it('container has 100% width and height for responsive layout', () => {
    const { container } = render(
      <ImageView settings={{ src: '/test.png', displayMode: 'cover' }} />
    );
    const imageContainer = container.querySelector('[data-testid="image-container"]');
    expect(imageContainer).toBeTruthy();
    expect((imageContainer as HTMLElement).style.width).toBe('100%');
    expect((imageContainer as HTMLElement).style.height).toBe('100%');
  });

  it('container has overflow hidden to prevent scrollbars', () => {
    const { container } = render(
      <ImageView settings={{ src: '/test.png', displayMode: 'stretch' }} />
    );
    const imageContainer = container.querySelector('[data-testid="image-container"]');
    expect((imageContainer as HTMLElement).style.overflow).toBe('hidden');
  });
});
