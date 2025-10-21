export function validateLessonNumber(lesson) {
  const parsed = parseInt(lesson, 10);
  if (isNaN(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

export function validateSegmentFormat(value) {
  const pattern = /^\d+-\d+-\d+$/;
  return typeof value === 'string' && pattern.test(value);
}

export function validateNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validatePositiveInteger(value) {
  const parsed = parseInt(value, 10);
  return !isNaN(parsed) && parsed > 0;
}
