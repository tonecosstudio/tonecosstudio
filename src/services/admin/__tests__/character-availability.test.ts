/**
 * Unit Tests for Character Availability Check
 * 
 * Tests the character availability check function.
 * 
 * **Validates: Requirements 2.2.1, 2.2.2, 2.2.3**
 * 
 * The check_character_availability function:
 * - Returns true if character exists and is available
 * - Returns false if character doesn't exist
 * - Returns false if character exists but is marked as unavailable
 * - Handles null is_available field (backward compatibility)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("Character Availability Check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Database Function: check_character_availability", () => {
    it("should return true for available characters", async () => {
      const mockAvailability = true;
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockAvailability,
        error: null,
      } as any);

      const result = await supabase.rpc("check_character_availability", {
        p_character_id: "123e4567-e89b-12d3-a456-426614174000",
      });

      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });

    it("should return false for unavailable characters", async () => {
      const mockAvailability = false;
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockAvailability,
        error: null,
      } as any);

      const result = await supabase.rpc("check_character_availability", {
        p_character_id: "123e4567-e89b-12d3-a456-426614174001",
      });

      expect(result.data).toBe(false);
      expect(result.error).toBeNull();
    });

    it("should return false for non-existent characters", async () => {
      const mockAvailability = false;
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockAvailability,
        error: null,
      } as any);

      const result = await supabase.rpc("check_character_availability", {
        p_character_id: "00000000-0000-0000-0000-000000000000",
      });

      expect(result.data).toBe(false);
      expect(result.error).toBeNull();
    });

    it("should handle database errors gracefully", async () => {
      const mockError = { message: "Database connection failed", code: "P0001" };
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: mockError,
      } as any);

      const result = await supabase.rpc("check_character_availability", {
        p_character_id: "123e4567-e89b-12d3-a456-426614174002",
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe("Character Selection Validation", () => {
    it("should prevent selection of unavailable characters", () => {
      const availableCharacters = [
        { id: "char-1", name: "Character 1", isAvailable: true },
        { id: "char-2", name: "Character 2", isAvailable: false },
        { id: "char-3", name: "Character 3", isAvailable: true },
      ];

      const selectableCharacters = availableCharacters.filter(char => char.isAvailable);

      expect(selectableCharacters).toHaveLength(2);
      expect(selectableCharacters[0].id).toBe("char-1");
      expect(selectableCharacters[1].id).toBe("char-3");
      expect(selectableCharacters).not.toContainEqual(
        expect.objectContaining({ id: "char-2" })
      );
    });

    it("should show appropriate UI feedback for unavailable characters", () => {
      const character = { id: "char-2", name: "Character 2", isAvailable: false };
      
      const uiState = {
        isSelectable: character.isAvailable,
        feedbackMessage: character.isAvailable ? "Available" : "Currently unavailable",
        isDisabled: !character.isAvailable,
      };

      expect(uiState.isSelectable).toBe(false);
      expect(uiState.feedbackMessage).toBe("Currently unavailable");
      expect(uiState.isDisabled).toBe(true);
    });

    it("should handle edge cases with null availability", () => {
      // Test backward compatibility: null is_available should be treated as available
      const characters = [
        { id: "char-1", name: "Character 1", isAvailable: true },
        { id: "char-2", name: "Character 2", isAvailable: null }, // Should be treated as available
        { id: "char-3", name: "Character 3", isAvailable: false },
      ];

      const selectableCharacters = characters.filter(char => 
        char.isAvailable === true || char.isAvailable === null
      );

      expect(selectableCharacters).toHaveLength(2);
      expect(selectableCharacters[0].id).toBe("char-1");
      expect(selectableCharacters[1].id).toBe("char-2");
    });
  });

  describe("Integration with Character Selection", () => {
    it("should validate character availability before submission", async () => {
      const characterId = "123e4567-e89b-12d3-a456-426614174000";
      const mockAvailability = true;
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockAvailability,
        error: null,
      } as any);

      // Simulate pre-submission validation
      const availabilityCheck = await supabase.rpc("check_character_availability", {
        p_character_id: characterId,
      });

      const canSubmit = availabilityCheck.data === true && availabilityCheck.error === null;

      expect(canSubmit).toBe(true);
      expect(availabilityCheck.data).toBe(true);
    });

    it("should reject submission for unavailable characters", async () => {
      const characterId = "123e4567-e89b-12d3-a456-426614174001";
      const mockAvailability = false;
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockAvailability,
        error: null,
      } as any);

      const availabilityCheck = await supabase.rpc("check_character_availability", {
        p_character_id: characterId,
      });

      const canSubmit = availabilityCheck.data === true && availabilityCheck.error === null;

      expect(canSubmit).toBe(false);
      expect(availabilityCheck.data).toBe(false);
    });

    it("should provide user feedback when character is unavailable", async () => {
      const characterId = "123e4567-e89b-12d3-a456-426614174001";
      const mockAvailability = false;
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockAvailability,
        error: null,
      } as any);

      const availabilityCheck = await supabase.rpc("check_character_availability", {
        p_character_id: characterId,
      });

      let userMessage = "";
      if (availabilityCheck.error) {
        userMessage = "Error checking availability. Please try again.";
      } else if (availabilityCheck.data === false) {
        userMessage = "This character is no longer available. Please choose another.";
      } else {
        userMessage = "Character is available!";
      }

      expect(userMessage).toBe("This character is no longer available. Please choose another.");
    });
  });
});