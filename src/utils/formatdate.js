export const formatDateUS = (date) => {
  if (!date) return "";

  const d = new Date(date);

  if (isNaN(d)) return "";

  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();

  return `${month}/${day}/${year}`;
};

export const formatDateUTC = (date) => {
  if (!date) return "";

  // If the date is an ISO string, extract the date directly to avoid timezone shift
  if (typeof date === "string" && date.includes("T")) {
    const [year, month, day] = date.split("T")[0].split("-");
    return `${month}/${day}/${year}`;
  }

  const d = new Date(date);
  if (isNaN(d)) return "";

  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const year = d.getUTCFullYear();

  return `${month}/${day}/${year}`;
};

export const formatDateTimeUS = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";

  const datePart = formatDateUS(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  return `${datePart} ${hours}:${minutes} ${ampm}`;
};