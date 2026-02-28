/**
 * Standalone Purchase Button Component
 * 
 * Button component that enforces cutoff rules for standalone purchases.
 * Displays appropriate messages when purchase is not allowed.
 * 
 * Requirements: 7.6
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Clock } from "lucide-react";
import { isBeforeCutoff, formatTimeUntilCutoff } from "@/lib/cutoff-middleware";
import { canCreateStandalonePurchase } from "@/services/standalone-purchase-service";

interface StandalonePurchaseButtonProps {
  cycleId: string;
  collectionId: string;
  collectionName: string;
  onPurchase: () => void;
  disabled?: boolean;
}

/**
 * Button component for creating standalone purchases
 * 
 * This component checks:
 * 1. If current time is before cutoff
 * 2. If cycle is still open
 * 3. If capacity is available
 * 
 * Requirements: 7.6
 */
export function StandalonePurchaseButton({
  cycleId,
  collectionId,
  collectionName,
  onPurchase,
  disabled = false
}: StandalonePurchaseButtonProps) {
  const [canPurchase, setCanPurchase] = useState(true);
  const [reason, setReason] = useState<string | undefined>();
  const [timeUntilCutoff, setTimeUntilCutoff] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Check if purchase is allowed
  useEffect(() => {
    const checkPurchaseAvailability = async () => {
      setIsLoading(true);
      try {
        const result = await canCreateStandalonePurchase(cycleId);
        setCanPurchase(result.canCreate);
        setReason(result.reason);
      } catch (error) {
        console.error("Failed to check purchase availability:", error);
        setCanPurchase(false);
        setReason("Failed to check availability");
      } finally {
        setIsLoading(false);
      }
    };

    checkPurchaseAvailability();
  }, [cycleId]);

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      setTimeUntilCutoff(formatTimeUntilCutoff());
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Check if before cutoff for UI display
  const [beforeCutoff, setBeforeCutoff] = useState(true);
  useEffect(() => {
    const checkCutoff = async () => {
      const result = await isBeforeCutoff();
      setBeforeCutoff(result);
    };

    checkCutoff();
    const interval = setInterval(checkCutoff, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Button disabled>
        Checking availability...
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cutoff countdown - show when before cutoff */}
      {beforeCutoff && canPurchase && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Time until cutoff: {timeUntilCutoff}
          </AlertDescription>
        </Alert>
      )}

      {/* Error messages - show when purchase not allowed */}
      {!canPurchase && reason && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {reason === "Cutoff has passed - production has started" && (
              <>
                <strong>Purchase not available</strong>
                <br />
                The cutoff deadline has passed. Production has started for this cycle.
                Please wait for the next cycle to make a purchase.
              </>
            )}
            {reason?.includes("Cycle is") && (
              <>
                <strong>Cycle not accepting purchases</strong>
                <br />
                {reason}. Only open cycles accept new standalone purchases.
              </>
            )}
            {reason === "Capacity limit exceeded" && (
              <>
                <strong>Sold out</strong>
                <br />
                The production capacity for this cycle has been reached.
                Please check back next cycle.
              </>
            )}
            {!reason.includes("Cutoff") && !reason.includes("Cycle") && !reason.includes("Capacity") && (
              <>
                <strong>Purchase not available</strong>
                <br />
                {reason}
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Purchase button */}
      <Button
        onClick={onPurchase}
        disabled={disabled || !canPurchase || !beforeCutoff}
        className="w-full"
        size="lg"
      >
        {!canPurchase
          ? "Purchase Not Available"
          : !beforeCutoff
          ? "Cutoff Passed"
          : `Purchase ${collectionName}`}
      </Button>

      {/* Additional info */}
      {canPurchase && beforeCutoff && (
        <p className="text-sm text-muted-foreground text-center">
          Deposit: R$ 100,00 • Balance due after production
        </p>
      )}
    </div>
  );
}
