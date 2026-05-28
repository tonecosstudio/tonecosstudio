import { beforeEach, describe, it, expect, vi } from 'vitest';
import { compressImage } from '../image-compression';
import imageCompression from 'browser-image-compression';

// Mock the browser-image-compression library
vi.mock('browser-image-compression', () => ({
  default: vi.fn(),
}));

describe('Image Compression Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockFile = (name: string, type: string, size: number = 1024): File => {
    const blob = new Blob(['x'.repeat(size)], { type });
    return new File([blob], name, { type });
  };

  it('should compress image files', async () => {
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 2048);
    const mockCompressed = createMockFile('test.jpg', 'image/jpeg', 512);

    vi.mocked(imageCompression).mockResolvedValue(mockCompressed as never);

    const result = await compressImage(mockFile);

    expect(imageCompression).toHaveBeenCalledWith(mockFile, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    });
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('test.jpg');
  });

  it('should return original file if not an image', async () => {
    const mockFile = createMockFile('document.pdf', 'application/pdf');

    const result = await compressImage(mockFile);

    expect(imageCompression).not.toHaveBeenCalled();
    expect(result).toBe(mockFile);
  });

  it('should handle compression errors gracefully', async () => {
    const mockFile = createMockFile('test.png', 'image/png');

    vi.mocked(imageCompression).mockRejectedValue(new Error('Compression failed'));

    await expect(compressImage(mockFile)).rejects.toThrow(
      'Image compression failed: Compression failed'
    );
  });

  it('should handle different image types', async () => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    for (const type of imageTypes) {
      const mockFile = createMockFile(`test.${type.split('/')[1]}`, type);
      const mockCompressed = createMockFile(`test.${type.split('/')[1]}`, type, 512);

      vi.mocked(imageCompression).mockResolvedValue(mockCompressed as never);

      const result = await compressImage(mockFile);

      expect(result).toBeInstanceOf(File);
      expect(result.type).toBe(type);
    }
  });

  it('should preserve file name after compression', async () => {
    const mockFile = createMockFile('my-photo.jpg', 'image/jpeg');
    const mockCompressed = new Blob(['compressed'], { type: 'image/jpeg' });

    vi.mocked(imageCompression).mockResolvedValue(mockCompressed as never);

    const result = await compressImage(mockFile);

    expect(result.name).toBe('my-photo.jpg');
  });
});
