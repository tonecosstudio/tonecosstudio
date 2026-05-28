/**
 * Tests for FileUploadService
 * Requirements: 3.1-3.12, 14.1-14.15
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { FileUploadService } from "./file-upload-service";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock("./image-compression", () => ({
  compressImage: vi.fn(async (file: File) => file),
}));

vi.mock("./malware-scanner", () => ({
  malwareScanner: {
    scanFile: vi.fn(async () => ({
      safe: true,
      threats: [],
      scanner: "mock",
      scanTime: 1,
    })),
  },
}));

vi.mock("./notification-service", () => ({
  getNotificationService: () => ({
    sendPaymentUnderReview: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("FileUploadService", () => {
  let service: FileUploadService;
  const mockUserId = "user-123";
  const mockPaymentId = "payment-456";

  const mockUploadedFileRecord = () => ({
    id: "file-123",
    payment_id: mockPaymentId,
    file_name: "test.jpg",
    file_path: `${mockPaymentId}/test.jpg`,
    file_size: 1024,
    file_type: "image/jpeg",
    uploaded_by: mockUserId,
    created_at: new Date().toISOString(),
  });

  const mockPaymentOwnerQuery = (userId = mockUserId) => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { user_id: userId },
          error: null,
        }),
      }),
    }),
  });

  beforeEach(() => {
    service = new FileUploadService();
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        file: mockUploadedFileRecord(),
        firstFile: false,
      },
      error: null,
    });
  });

  describe("validateFile", () => {
    it("should accept valid JPEG file under 5MB", async () => {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 1024 * 1024 }); // 1MB

      const result = await service.validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept valid PNG file under 5MB", async () => {
      const file = new File(["test"], "test.png", { type: "image/png" });
      Object.defineProperty(file, "size", { value: 2 * 1024 * 1024 }); // 2MB

      const result = await service.validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept valid PDF file under 5MB", async () => {
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      Object.defineProperty(file, "size", { value: 3 * 1024 * 1024 }); // 3MB

      const result = await service.validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject file exceeding 5MB", async () => {
      const file = new File(["test"], "large.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 6 * 1024 * 1024 }); // 6MB

      const result = await service.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("File size exceeds 5MB limit. Please upload a smaller file.");
    });

    it("should accept file exactly 5MB", async () => {
      const file = new File(["test"], "exact.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 5 * 1024 * 1024 }); // Exactly 5MB

      const result = await service.validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject unsupported file type", async () => {
      const file = new File(["test"], "test.txt", { type: "text/plain" });
      Object.defineProperty(file, "size", { value: 1024 });

      const result = await service.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "File type not supported. Please upload JPG, PNG, or PDF files."
      );
    });

    it("should reject file with mismatched MIME type and extension", async () => {
      const file = new File(["test"], "test.jpg", { type: "application/pdf" });
      Object.defineProperty(file, "size", { value: 1024 });

      const result = await service.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "File type mismatch. The file extension does not match the file content."
      );
    });

    it("should reject executable files", async () => {
      const file = new File(["test"], "malware.exe", { type: "application/x-msdownload" });
      Object.defineProperty(file, "size", { value: 1024 });

      const result = await service.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Executable files are not allowed for security reasons.");
    });

    it("should reject .sh files", async () => {
      const file = new File(["test"], "script.sh", { type: "application/x-sh" });
      Object.defineProperty(file, "size", { value: 1024 });

      const result = await service.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Executable files are not allowed for security reasons.");
    });

    it("should reject .bat files", async () => {
      const file = new File(["test"], "script.bat", { type: "application/x-bat" });
      Object.defineProperty(file, "size", { value: 1024 });

      const result = await service.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Executable files are not allowed for security reasons.");
    });
  });

  describe("upload", () => {
    beforeEach(() => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          file: mockUploadedFileRecord(),
          firstFile: false,
        },
        error: null,
      });

      // Mock storage upload
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/signed-url" },
          error: null,
        }),
      });
      vi.mocked(supabase.storage.from).mockImplementation(mockStorageFrom);

      // Mock database operations
      const mockDbFrom = vi.fn((table: string) => {
        if (table === "manual_payments") {
          return mockPaymentOwnerQuery();
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: "file-123",
              payment_id: mockPaymentId,
              file_name: "test.jpg",
              file_path: `${mockPaymentId}/test.jpg`,
              file_size: 1024,
              file_type: "image/jpeg",
              uploaded_by: mockUserId,
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
          count: "exact",
          head: true,
        };
      });
      vi.mocked(supabase.from).mockImplementation(mockDbFrom);
    });

    it("should successfully upload a valid file", async () => {
      // Mock file count check
      const mockDbFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "file-123",
            payment_id: mockPaymentId,
            file_name: "test.jpg",
            file_path: `${mockPaymentId}/test.jpg`,
            file_size: 1024,
            file_type: "image/jpeg",
            uploaded_by: mockUserId,
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
        count: "exact",
        head: true,
      });

      // Override for count query
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "manual_payments") {
          return mockPaymentOwnerQuery();
        }

        if (table === "payment_files") {
          const chain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: "file-123",
                payment_id: mockPaymentId,
                file_name: "test.jpg",
                file_path: `${mockPaymentId}/test.jpg`,
                file_size: 1024,
                file_type: "image/jpeg",
                uploaded_by: mockUserId,
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          };

          // Mock count for the first call
          const selectSpy = chain.select as any;
          selectSpy.mockImplementationOnce(() => {
            return {
              ...chain,
              eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
            };
          });

          return chain;
        }
        return mockDbFrom(table);
      });

      const file = new File(["test content"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 1024 });

      const result = await service.upload(mockPaymentId, file);

      expect(result).toBeDefined();
      expect(result.file_name).toBe("test.jpg");
      expect(result.payment_id).toBe(mockPaymentId);
    });

    it("should reject upload when user is not authenticated", async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 1024 });

      await expect(service.upload(mockPaymentId, file)).rejects.toThrow("User not authenticated");
    });

    it("should reject upload when max files reached", async () => {
      // Mock count returning 5 files
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "manual_payments") {
          return mockPaymentOwnerQuery();
        }

        if (table === "payment_files") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 1024 });

      await expect(service.upload(mockPaymentId, file)).rejects.toThrow(
        "Maximum of 5 files per payment reached"
      );
    });

    it("should track upload progress", async () => {
      // Mock file count check
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "manual_payments") {
          return mockPaymentOwnerQuery();
        }

        if (table === "payment_files") {
          const chain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: "file-123",
                payment_id: mockPaymentId,
                file_name: "test.jpg",
                file_path: `${mockPaymentId}/test.jpg`,
                file_size: 1024,
                file_type: "image/jpeg",
                uploaded_by: mockUserId,
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          };

          const selectSpy = chain.select as any;
          selectSpy.mockImplementationOnce(() => {
            return {
              ...chain,
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            };
          });

          return chain;
        }
        return {} as any;
      });

      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 1024 });

      const progressCallback = vi.fn();
      await service.upload(mockPaymentId, file, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(100);
    });
  });

  describe("getSignedUrl", () => {
    it("should generate signed URL with default expiration", async () => {
      const mockSignedUrl = "https://example.com/signed-url";
      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null,
        }),
      } as any);

      const url = await service.getSignedUrl("path/to/file.jpg");

      expect(url).toBe(mockSignedUrl);
    });

    it("should generate signed URL with custom expiration", async () => {
      const mockSignedUrl = "https://example.com/signed-url";
      const customExpiry = 7200; // 2 hours

      const createSignedUrlMock = vi.fn().mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: createSignedUrlMock,
      } as any);

      const url = await service.getSignedUrl("path/to/file.jpg", customExpiry);

      expect(url).toBe(mockSignedUrl);
      expect(createSignedUrlMock).toHaveBeenCalledWith("path/to/file.jpg", customExpiry);
    });

    it("should throw error when signed URL generation fails", async () => {
      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: null,
          error: new Error("Failed to generate URL"),
        }),
      } as any);

      await expect(service.getSignedUrl("path/to/file.jpg")).rejects.toThrow(
        "Failed to generate file access URL"
      );
    });
  });

  describe("listByPayment", () => {
    it("should return list of files for a payment", async () => {
      const mockFiles = [
        {
          id: "file-1",
          payment_id: mockPaymentId,
          file_name: "proof1.jpg",
          file_path: "path/proof1.jpg",
          file_size: 1024,
          file_type: "image/jpeg",
          uploaded_by: mockUserId,
          created_at: new Date().toISOString(),
        },
        {
          id: "file-2",
          payment_id: mockPaymentId,
          file_name: "proof2.pdf",
          file_path: "path/proof2.pdf",
          file_size: 2048,
          file_type: "application/pdf",
          uploaded_by: mockUserId,
          created_at: new Date().toISOString(),
        },
      ];

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "manual_payments") {
          return mockPaymentOwnerQuery();
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockFiles, error: null }),
        } as any;
      });

      const files = await service.listByPayment(mockPaymentId);

      expect(files).toHaveLength(2);
      expect(files[0].file_name).toBe("proof1.jpg");
      expect(files[1].file_name).toBe("proof2.pdf");
    });

    it("should return empty array when no files exist", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "manual_payments") {
          return mockPaymentOwnerQuery();
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      });

      const files = await service.listByPayment(mockPaymentId);

      expect(files).toHaveLength(0);
    });

    it("should throw error when database query fails", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "manual_payments") {
          return mockPaymentOwnerQuery();
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: null,
            error: new Error("Database error"),
          }),
        } as any;
      });

      await expect(service.listByPayment(mockPaymentId)).rejects.toThrow(
        "Failed to retrieve files"
      );
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      // Reset rate limiting state
      vi.clearAllMocks();

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "manual_payments") {
          return mockPaymentOwnerQuery();
        }

        if (table === "payment_files") {
          const chain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: "file-123",
                payment_id: mockPaymentId,
                file_name: "test.jpg",
                file_path: `${mockPaymentId}/test.jpg`,
                file_size: 1024,
                file_type: "image/jpeg",
                uploaded_by: mockUserId,
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          };

          const selectSpy = chain.select as any;
          selectSpy.mockImplementation((query: any) => {
            if (query === "*") {
              return {
                ...chain,
                eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
              };
            }
            return chain;
          });

          return chain;
        }
        return {} as any;
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
      } as any);
    });

    it("should allow uploads within rate limit", async () => {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 1024 });

      // Upload 5 files (within limit of 10)
      for (let i = 0; i < 5; i++) {
        await expect(service.upload(mockPaymentId, file)).resolves.toBeDefined();
      }
    });
  });
});
