// Shared checks for course names and grades (REF-201).
// Before this, addGrade and changeGrade had the same code twice and getGrade
// repeated the course part a third time.

export const MIN_GRADE = 0;
export const MAX_GRADE = 100;

// Makes the course name upper case, and throws if it is empty.
export function normalizeCourse(course) {
  const normalizedCourse = String(course ?? "").trim().toUpperCase();
  if (!normalizedCourse) {
    throw new Error("Course name is required");
  }
  return normalizedCourse;
}

// Same thing but for reading a grade. Here an empty or unknown course is just
// not found, so it should not throw an error.
export function normalizeCourseForLookup(course) {
  return String(course ?? "").trim().toUpperCase();
}

// Checks that the grade is a whole number between 0 and 100.
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

// addGrade and changeGrade both need the course and the grade checked.
export function normalizeCourseGrade(course, grade) {
  return {
    course: normalizeCourse(course),
    grade: normalizeGrade(grade),
  };
}
