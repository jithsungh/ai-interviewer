import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get initials from a user's full name
 * @param name - Full name (e.g., "John Doe", "Alice Smith Johnson")
 * @returns Initials (e.g., "JD", "AS")
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    // Single name: use first two characters
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  // Multiple names: use first letter of first and last name
  const firstInitial = parts[0][0];
  const lastInitial = parts[parts.length - 1][0];
  return (firstInitial + lastInitial).toUpperCase();
}
