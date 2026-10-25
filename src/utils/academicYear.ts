/** Indonesian school year begins in July. */
export const getCurrentAcademicYear = (date = new Date()): string => {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 6 ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
};

export const getCurrentAcademicYearStart = (date = new Date()): number => {
  const year = date.getFullYear();
  return date.getMonth() >= 6 ? year : year - 1;
};
