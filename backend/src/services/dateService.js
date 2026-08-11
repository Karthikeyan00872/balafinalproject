export function addYears(dateValue, years) {
  const date = new Date(dateValue);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

export function calculateAge(dob, today = new Date()) {
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function ageBracket(age) {
  if (age >= 60) return '60_PLUS';
  if (age >= 51) return '51_59';
  if (age >= 36) return '36_50';
  return '18_35';
}

export function lifecycleStatus(dob, nextDueDate, today = new Date()) {
  if (calculateAge(dob, today) >= 60) return 'PENSIONER';
  return new Date(nextDueDate) < new Date(today.toISOString().slice(0, 10)) ? 'OVERDUE' : 'ACTIVE';
}
