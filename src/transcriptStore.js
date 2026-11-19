import {
  normalizeCourseForLookup,
  normalizeCourseGrade,
} from "./validation.js";

export class TranscriptStore {
  #students = new Map();
  #grades = new Map();
  #nextStudentId = 1;

  addStudent(name) {
    const studentName = String(name ?? "").trim();
    if (!studentName) {
      throw new Error("Student name is required");
    }

    const studentID = this.#nextStudentId++;
    this.#students.set(studentID, { studentID, studentName });
    return studentID;
  }

  getStudentIDs(name) {
    // This is only used for comparing. The name we store does not change.
    const query = name === undefined ? undefined : TranscriptStore.#searchKey(name);
    const matches = [];
    for (const student of this.#students.values()) {
      if (query === undefined || TranscriptStore.#searchKey(student.studentName) === query) {
        matches.push(student.studentID);
      }
    }
    return matches;
  }

  static #searchKey(name) {
    return String(name).trim().toLowerCase();
  }

  getTranscript(studentID) {
    const student = this.#requireStudent(studentID);
    return {
      student,
      grades: this.#listGrades(studentID),
    };
  }

  deleteStudent(studentID) {
    const parsedID = this.#parseStudentID(studentID);
    if (!this.#students.delete(parsedID)) {
      throw new Error(`Student not found: ${parsedID}`);
    }
    // The grades use the same id as the key, so delete them too.
    this.#grades.delete(parsedID);
  }

  addGrade(studentID, course, grade) {
    const parsedID = this.#requireStudent(studentID).studentID;
    const { course: normalizedCourse, grade: numericGrade } =
      normalizeCourseGrade(course, grade);

    const studentGrades = this.#grades.get(parsedID) ?? new Map();
    // addGrade should only add. To change a grade, changeGrade is used.
    if (studentGrades.has(normalizedCourse)) {
      throw new Error(`Grade already exists for course ${normalizedCourse}`);
    }
    studentGrades.set(normalizedCourse, numericGrade);
    this.#grades.set(parsedID, studentGrades);
    return { studentID: parsedID, course: normalizedCourse, grade: numericGrade };
  }

  changeGrade(studentID, course, grade) {
    const parsedID = this.#requireStudent(studentID).studentID;
    const { course: normalizedCourse, grade: numericGrade } =
      normalizeCourseGrade(course, grade);

    const studentGrades = this.#grades.get(parsedID);
    if (!studentGrades?.has(normalizedCourse)) {
      throw new Error(`Grade not found for course ${normalizedCourse}`);
    }
    studentGrades.set(normalizedCourse, numericGrade);
    return { studentID: parsedID, course: normalizedCourse, grade: numericGrade };
  }

  getGrade(studentID, course) {
    const parsedID = this.#parseStudentID(studentID);
    const normalizedCourse = normalizeCourseForLookup(course);
    return this.#grades.get(parsedID)?.get(normalizedCourse);
  }

  #listGrades(studentID) {
    const parsedID = this.#parseStudentID(studentID);
    return [...(this.#grades.get(parsedID)?.entries() ?? [])].map(
      ([course, grade]) => ({ studentID: parsedID, course, grade }),
    );
  }

  #parseStudentID(studentID) {
    const parsedID = Number(studentID);
    if (!Number.isInteger(parsedID) || parsedID <= 0) {
      throw new Error("Student ID must be a positive integer");
    }
    return parsedID;
  }

  #requireStudent(studentID) {
    const parsedID = this.#parseStudentID(studentID);
    const student = this.#students.get(parsedID);
    if (!student) {
      throw new Error(`Student not found: ${parsedID}`);
    }
    return student;
  }
}
