// Regression test for BUG-102
// A second addGrade for the same student and course must be rejected, and the
// grade already on record must survive. Corrections go through changeGrade.
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { TranscriptStore } from "../src/transcriptStore.js";
import { createAppServer } from "../src/server.js";

describe("BUG-102: addGrade rejects a duplicate course grade", () => {
  let store;

  beforeEach(() => {
    store = new TranscriptStore();
  });

  test("the second addGrade for a course throws", () => {
    const studentID = store.addStudent("Lin");
    store.addGrade(studentID, "CS360", 85);

    assert.throws(
      () => store.addGrade(studentID, "CS360", 40),
      /Grade already exists for course CS360/,
    );
  });

  test("the grade on record is left untouched by the rejected call", () => {
    const studentID = store.addStudent("Lin");
    store.addGrade(studentID, "CS360", 85);

    assert.throws(() => store.addGrade(studentID, "CS360", 40));

    assert.equal(store.getGrade(studentID, "CS360"), 85);
    assert.deepEqual(store.getTranscript(studentID).grades, [
      { studentID, course: "CS360", grade: 85 },
    ]);
  });

  test("the duplicate is detected after course normalization", () => {
    const studentID = store.addStudent("Lin");
    store.addGrade(studentID, "CS360", 85);

    assert.throws(
      () => store.addGrade(studentID, "  cs360 ", 70),
      /Grade already exists for course CS360/,
    );
  });

  test("changeGrade remains the way to correct a grade", () => {
    const studentID = store.addStudent("Lin");
    store.addGrade(studentID, "CS360", 85);

    assert.deepEqual(store.changeGrade(studentID, "CS360", 92), {
      studentID,
      course: "CS360",
      grade: 92,
    });
    assert.equal(store.getGrade(studentID, "CS360"), 92);
  });

  test("a different course for the same student is still accepted", () => {
    const studentID = store.addStudent("Lin");
    store.addGrade(studentID, "CS360", 85);

    assert.deepEqual(store.addGrade(studentID, "CS101", 77), {
      studentID,
      course: "CS101",
      grade: 77,
    });
  });

  test("the same course for a different student is still accepted", () => {
    const first = store.addStudent("Lin");
    const second = store.addStudent("Ada");
    store.addGrade(first, "CS360", 85);

    assert.deepEqual(store.addGrade(second, "CS360", 91), {
      studentID: second,
      course: "CS360",
      grade: 91,
    });
  });

  test("POST of a duplicate grade answers 409 and keeps the stored grade", async () => {
    const server = createAppServer(store);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;

    try {
      const created = await fetch(`${base}/transcripts`, {
        method: "POST",
        body: JSON.stringify({ name: "Lin" }),
      });
      const { studentID } = await created.json();

      const first = await fetch(`${base}/transcripts/${studentID}/CS360`, {
        method: "POST",
        body: JSON.stringify({ grade: 85 }),
      });
      assert.equal(first.status, 201);

      const duplicate = await fetch(`${base}/transcripts/${studentID}/CS360`, {
        method: "POST",
        body: JSON.stringify({ grade: 40 }),
      });
      assert.equal(duplicate.status, 409);
      assert.deepEqual(await duplicate.json(), {
        error: "Grade already exists for course CS360",
      });

      const stored = await fetch(`${base}/transcripts/${studentID}/CS360`);
      assert.equal((await stored.json()).grade, 85);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
