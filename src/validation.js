/**
 * REF-201: single home for the course and grade validation rules that were
 * duplicated across TranscriptStore.addGrade, changeGrade and getGrade.
 *
 * These helpers are deliberately pure and free of store state so that every
 * caller normalizes and rejects input identically. Messages are part of the
 * public contract: src/server.js maps them to HTTP status codes.
 */

export const MIN_GRADE = 0;
export const MAX_GRADE = 100;

/**
 * Normalize a course name to its canonical stored form.
 * @throws {Error} "Course name is required" when the name is blank.
 */
export function normalizeCourse(course) {
  const normalizedCourse = String(course ?? "").trim().toUpperCase();
  if (!normalizedCourse) {
    throw new Error("Course name is required");
  }
  return normalizedCourse;
}

/**
 * Normalize a course name for lookups, without rejecting a blank name.
 * A read of an unknown course is a miss, not an input error.
 */
export function normalizeCourseForLookup(course) {
  return String(course ?? "").trim().toUpperCase();
}

/**
 * Coerce a grade to an integer within the allowed range.
 * @throws {Error} "Grade must be an integer from 0 to 100" when out of range.
 */
export function normalizeGrade(grade) {
  const numericGrade = Number(grade);
  if (
    !Number.isInteger(numericGrade) ||
    numericGrade < MIN_GRADE ||
    numericGrade > MAX_GRADE
  ) {
    throw new Error(
      `Grade must be an integer from ${MIN_GRADE} to ${MAX_GRADE}`,
    );
  }
  return numericGrade;
}

/**
 * Validate the course/grade pair that addGrade and changeGrade both take.
 */
export function normalizeCourseGrade(course, grade) {
  return {
    course: normalizeCourse(course),
    grade: normalizeGrade(grade),
  };
}
