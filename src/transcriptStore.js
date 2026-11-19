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
    const matches = [];
    for (const student of this.#students.values()) {
      if (name === undefined || student.studentName === String(name)) {
        matches.push(student.studentID);
      }
    }
    return matches;
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
    // BUG-101: the grade map is keyed by student id, so it has to be cleared
    // with the student. Otherwise the rows are orphaned and stay readable.
    this.#grades.delete(parsedID);
  }

  addGrade(studentID, course, grade) {
    const parsedID = this.#requireStudent(studentID).studentID;
    const { course: normalizedCourse, grade: numericGrade } =
      normalizeCourseGrade(course, grade);

    const studentGrades = this.#grades.get(parsedID) ?? new Map();
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
