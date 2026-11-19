// Regression test for BUG-101
// Deleting a student must also remove that student's stored grades, and a
// grade request for a deleted student must report "not found" (HTTP 404).
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { TranscriptStore } from "../src/transcriptStore.js";
import { createAppServer } from "../src/server.js";

describe("BUG-101: deleting a student removes stored grades", () => {
  let store;

  beforeEach(() => {
    store = new TranscriptStore();
  });

  test("getGrade reports nothing for a deleted student", () => {
    const studentID = store.addStudent("Ada");
    store.addGrade(studentID, "CS360", 85);
    assert.equal(store.getGrade(studentID, "CS360"), 85);

    store.deleteStudent(studentID);

    assert.equal(store.getGrade(studentID, "CS360"), undefined);
  });

  test("grades are not revived when a student id is reused", () => {
    const studentID = store.addStudent("Ada");
    store.addGrade(studentID, "CS360", 85);
    store.deleteStudent(studentID);

    // A fresh student must start with an empty transcript even if the store
    // ever hands out the same numeric id again.
    const rehiredID = store.addStudent("Ada");
    assert.deepEqual(store.getTranscript(rehiredID).grades, []);
  });

  test("the deleted student's transcript is gone too", () => {
    const studentID = store.addStudent("Ada");
    store.addGrade(studentID, "CS360", 85);
    store.deleteStudent(studentID);

    assert.throws(() => store.getTranscript(studentID), /Student not found/);
  });

  test("GET /transcripts/:id/:course returns 404 after the student is deleted", async () => {
    const server = createAppServer(store);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;

    try {
      const created = await fetch(`${base}/transcripts`, {
        method: "POST",
        body: JSON.stringify({ name: "Ada" }),
      });
      const { studentID } = await created.json();

      const graded = await fetch(`${base}/transcripts/${studentID}/CS360`, {
        method: "POST",
        body: JSON.stringify({ grade: 85 }),
      });
      assert.equal(graded.status, 201);

      const deleted = await fetch(`${base}/transcripts/${studentID}`, {
        method: "DELETE",
      });
      assert.equal(deleted.status, 204);

      const afterDelete = await fetch(`${base}/transcripts/${studentID}/CS360`);
      assert.equal(afterDelete.status, 404);
      assert.deepEqual(await afterDelete.json(), { error: "Grade not found" });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
