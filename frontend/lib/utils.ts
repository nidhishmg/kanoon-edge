import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getStrengthColor(strength: number): string {
  if (strength >= 75) return "text-success";
  if (strength >= 50) return "text-warning";
  return "text-danger";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "analyzed":
      return "bg-success/10 text-success border-success/20";
    case "uploaded":
      return "bg-warning/10 text-warning border-warning/20";
    case "processing":
      return "bg-info/10 text-info border-info/20";
    case "error":
      return "bg-danger/10 text-danger border-danger/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
