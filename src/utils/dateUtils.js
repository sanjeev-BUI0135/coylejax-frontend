import { format } from "date-fns";

export const safeDate = (dateValue, fallback = null) => {
  if (!dateValue) return fallback;
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn("⚠️ Invalid date detected:", dateValue);
      return fallback;
    }
    return date;
  } catch (error) {
    console.warn("⚠️ Date parsing error:", dateValue, error);
    return fallback;
  }
};

export const formatSafeDate = (dateValue, formatString = "MMM d, yyyy", fallback = "Invalid Date") => {
  const date = safeDate(dateValue);
  return date ? format(date, formatString) : fallback;
};
