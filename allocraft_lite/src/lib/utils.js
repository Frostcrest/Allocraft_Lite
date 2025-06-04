import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Formats a number as currency (e.g., $1,234.56)
export function formatCurrency(amount, locale = "en-US", currency = "USD") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount
  );
}

// Calculates the total value of a wheel (assumes wheel is an array of numbers or objects with a value property)
export function calculateWheelTotal(wheel) {
  if (!Array.isArray(wheel)) return 0;
  return wheel.reduce((total, item) => {
    if (typeof item === "number") return total + item;
    if (typeof item === "object" && item.value) return total + item.value;
    return total;
  }, 0);
}