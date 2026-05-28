import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LazyImage } from '../LazyImage';

describe('LazyImage Component', () => {
  const defaultProps = {
    src: 'https://example.com/image.jpg',
    alt: 'Test image',
  };

  it('should render image with lazy loading by default', () => {
    render(<LazyImage {...defaultProps} />);
    const img = screen.getByAltText('Test image');

    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('should render image with eager loading when priority is true', () => {
    render(<LazyImage {...defaultProps} priority={true} />);
    const img = screen.getByAltText('Test image');

    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });

  it('should apply custom className', () => {
    render(<LazyImage {...defaultProps} className="custom-class" />);
    const img = screen.getByAltText('Test image');

    expect(img).toHaveClass('custom-class');
  });

  it('should start with opacity-0 and transition to opacity-100 on load', async () => {
    render(<LazyImage {...defaultProps} />);
    const img = screen.getByAltText('Test image') as HTMLImageElement;

    // Initially should have opacity-0
    expect(img).toHaveClass('opacity-0');

    // Simulate image load
    fireEvent.load(img);

    // Should transition to opacity-100
    await waitFor(() => {
      expect(img).toHaveClass('opacity-100');
    });
  });

  it('should pass through additional HTML attributes', () => {
    render(
      <LazyImage
        {...defaultProps}
        width={800}
        height={600}
        data-testid="custom-image"
      />
    );
    const img = screen.getByTestId('custom-image');

    expect(img).toHaveAttribute('width', '800');
    expect(img).toHaveAttribute('height', '600');
  });

  it('should have transition-opacity class for smooth loading', () => {
    render(<LazyImage {...defaultProps} />);
    const img = screen.getByAltText('Test image');

    expect(img).toHaveClass('transition-opacity');
    expect(img).toHaveClass('duration-300');
  });
});
