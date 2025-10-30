import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripTrailingNumber(title: string) {
  return String(title).replace(/\s+\d+$/,'');
}
