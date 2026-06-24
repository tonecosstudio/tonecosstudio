import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LOCALE } from "@/config/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata valor monetário usando a configuração central de locale.
 */
export function formatCurrency(
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat(LOCALE.DEFAULT_LANGUAGE, {
    style: "currency",
    currency: LOCALE.CURRENCY,
    ...options,
  }).format(value);
}

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat(LOCALE.DEFAULT_LANGUAGE, options).format(value);
}

export function formatDate(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat(LOCALE.DEFAULT_LANGUAGE, options).format(new Date(value));
}
