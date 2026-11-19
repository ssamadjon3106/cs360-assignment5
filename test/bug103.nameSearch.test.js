// Regression test for BUG-103
// Name search must trim surrounding whitespace and ignore case, while the
// stored display name stays exactly as it was entered.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { TranscriptStore } from "../src/transcriptStore.js";
import { createAppServer } from "../src/server.js";

describe("BUG-103: name search trims whitespace and ignores case", () => {
  let store;

  beforeEach(() => {
    store = new TranscriptStore();
  });

  test("a lowercase query finds the student", () => {
    const studentID = store.addStudent("Grace Lee");

    assert.deepEqual(store.getStudentIDs("grace lee"), [studentID]);
  });

  test("an uppercase query finds the student", () => {
    const studentID = store.addStudent("Grace Lee");

    assert.deepEqual(store.getStudentIDs("GRACE LEE"), [studentID]);
  });

  test("surrounding whitespace in the query is ignored", () => {
    const studentID = store.addStudent("Grace Lee");

    assert.deepEqual(store.getStudentIDs("   Grace Lee   "), [studentID]);
    assert.deepEqual(store.getStudentIDs("\t grace lee \n"), [studentID]);
  });

  test("the stored display name is left exactly as entered", () => {
    const studentID = store.addStudent("Grace Lee");

    assert.deepEqual(store.getStudentIDs("grace lee"), [studentID]);
    assert.equal(
      store.getTranscript(studentID).student.studentName,
      "Grace Lee",
    );
  });

  test("a different student is still not matched", () => {
    store.addStudent("Grace Lee");
    const other = store.addStudent("Grace Hall");

    assert.deepEqual(store.getStudentIDs("grace hall"), [other]);
    assert.deepEqual(store.getStudentIDs("grace"), []);
  });

  test("every namesake is returned", () => {
    const first = store.addStudent("Grace Lee");
    const second = store.addStudent("grace lee");

    assert.deepEqual(store.getStudentIDs("GRACE LEE"), [first, second]);
  });

  test("no name argument still lists every student", () => {
    const first = store.addStudent("Grace Lee");
    const second = store.addStudent("Ada");

    assert.deepEqual(store.getStudentIDs(), [first, second]);
  });

  test("GET /studentids finds the student by a lowercase padded name", async () => {
    const server = createAppServer(store);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;

    try {
      const created = await fetch(`${base}/transcripts`, {
        method: "POST",
        body: JSON.stringify({ name: "Grace Lee" }),
      });
      const { studentID } = await created.json();

      const found = await fetch(
        `${base}/studentids?name=${encodeURIComponent(" grace lee ")}`,
      );
      assert.equal(found.status, 200);
      assert.deepEqual(await found.json(), [studentID]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
