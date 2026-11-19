# CS360 Assignment 5 — Maintenance log

**Name:** Samadjon Sayfullayev
**Student ID:** 240474
**Course:** CS360 Software Engineering
**GitHub username:** `ssamadjon3106`
**Repository:** https://github.com/ssamadjon3106/cs360-assignment5

Four tracked work items were handled: three bug reports and one refactor
request. Each one got its own issue, its own branch, a failing regression test
committed *before* the code change, a separate fix commit, a reviewed pull
request, and a merge back into `main`.

## Ticket summary

| Ticket | Issue | Branch | PR | Required outcome |
| --- | --- | --- | --- | --- |
| BUG-101 | [#1](https://github.com/ssamadjon3106/cs360-assignment5/issues/1) | `fix/bug-101-delete-removes-grades` | [#5](https://github.com/ssamadjon3106/cs360-assignment5/pull/5) | Deleting a student also removes stored grades; a deleted student's grade request returns 404. |
| BUG-102 | [#2](https://github.com/ssamadjon3106/cs360-assignment5/issues/2) | `fix/bug-102-reject-duplicate-grade` | [#6](https://github.com/ssamadjon3106/cs360-assignment5/pull/6) | A second grade for the same student and course throws `Grade already exists for course <COURSE>`; `changeGrade` remains for corrections. |
| BUG-103 | [#3](https://github.com/ssamadjon3106/cs360-assignment5/issues/3) | `fix/bug-103-name-search-normalization` | [#7](https://github.com/ssamadjon3106/cs360-assignment5/pull/7) | Name search trims surrounding whitespace and ignores case; the stored display name is unchanged. |
| REF-201 | [#4](https://github.com/ssamadjon3106/cs360-assignment5/issues/4) | `refactor/ref-201-shared-validation` | [#8](https://github.com/ssamadjon3106/cs360-assignment5/pull/8) | Shared course and grade validation extracted into one place; public behavior preserved, committed separately. |

## BUG-101 — orphaned grades survived deletion

**Root cause.** `TranscriptStore` keeps `#students` and `#grades` as two maps
keyed by student id. `deleteStudent` removed only the `#students` entry, so the
grade rows were orphaned. `getGrade` reads `#grades` directly without checking
that the student exists, so it kept resolving the old grade with HTTP 200 while
`GET /transcripts/:id` already answered 404 — the API contradicted itself, and
the store leaked a row on every deletion.

**Fix.** `this.#grades.delete(parsedID)` after the student row is removed.

**Regression test.** `test/bug101.deleteStudent.test.js` — 4 cases, including an
end-to-end HTTP case. Red before the fix: `85 !== undefined` and `200 !== 404`.

## BUG-102 — addGrade silently overwrote a grade of record

**Root cause.** `addGrade` ended with an unconditional
`studentGrades.set(normalizedCourse, numericGrade)`. `Map.set` overwrites, so
the method behaved as an upsert: a repeated POST destroyed a real grade,
answered `201 Created`, and left no audit trail. Insert and update were
indistinguishable.

**Fix.** Guard the insert with `studentGrades.has(normalizedCourse)` and throw
`Grade already exists for course ${normalizedCourse}`. The check runs *after*
course normalization, so `cs360`, `  cs360 ` and `CS360` are one course.
`src/server.js` needed no change: the message does not contain "not found", so
the existing mapping returns **409 Conflict**.

**Regression test.** `test/bug102.duplicateGrade.test.js` — 7 cases. Red before
the fix: 4 failures. Cases also pin the behavior that must *not* change —
`changeGrade` still corrects a grade, a different course for the same student is
still accepted, and the same course for a different student is still accepted.

## BUG-103 — name search missed on case and whitespace

**Root cause.** `getStudentIDs` compared raw values:
`student.studentName === String(name)`. Strict equality is case- and
whitespace-sensitive, so a name pasted with a trailing space or typed in
lowercase returned `[]` for an enrolled student. Staff concluded the student did
not exist and re-added them, producing duplicate ids and split transcripts.

**Fix.** A private static `#searchKey(name)` applies `.trim().toLowerCase()`,
and **both** sides of the comparison go through it. Normalization is used for
matching only — nothing is written back, so the stored `studentName` keeps its
original display form (asserted by its own test case).

**Regression test.** `test/bug103.nameSearch.test.js` — 8 cases. Red before the
fix: 7 failures. Cases also pin that the query is not treated as a substring
(`"grace"` returns `[]`) and that a no-argument call still lists everyone.

## REF-201 — duplicated validation extracted

`addGrade` and `changeGrade` each carried an identical eight-line copy of the
course-name and grade-range checks, and `getGrade` repeated the course
normalization a third time.

The rules now live in `src/validation.js`:

| Export | Used by |
| --- | --- |
| `normalizeCourse(course)` | via `normalizeCourseGrade` |
| `normalizeGrade(grade)` | via `normalizeCourseGrade` |
| `normalizeCourseGrade(course, grade)` | `addGrade`, `changeGrade` |
| `normalizeCourseForLookup(course)` | `getGrade` |
| `MIN_GRADE`, `MAX_GRADE` | interpolated into the range message, so bounds and text cannot drift apart |

`getGrade` keeps a separate lookup helper on purpose: a read of a blank or
unknown course is a miss that returns `undefined`, not an input error. Folding it
into `normalizeCourse` would have turned a 404 into a 409 — a behavior change the
ticket forbids.

**Public behavior preserved.** Identical error strings, identical return shapes,
no change to `src/server.js` and therefore none to the status mapping. **No test
assertion was modified** — the suite that guards the three bug fixes passes
untouched. After the refactor the grade-range check exists in exactly one place
in `src/`.

## Branch integration and merge conflicts

`refactor/ref-201-shared-validation` was deliberately cut from `main` *before*
BUG-102 and BUG-103 merged, so the refactor and the duplicate-grade guard both
changed `addGrade`.

When `main` was merged into the refactor branch (commit `af9c92c`), Git
auto-merged `src/transcriptStore.js` successfully: the two edits landed in
hunks far enough apart that no conflict markers were produced. **No merge
conflict occurred in this project**, so there are no conflict markers to show.
The integration merge was still reviewed line by line and re-verified with the
full suite rather than trusted on Git's word, because the two changes interact:
the BUG-102 guard references `normalizedCourse`, which the refactor now obtains
by destructuring the shared validator's result. Both changes were kept and the
merged `addGrade` is correct — 23 tests pass on the merge commit.

## Verification

`npm test` on `main`:

```
ℹ tests 23
ℹ suites 4
ℹ pass 23
ℹ fail 0
```

Live check against `npm start` (`PORT=4071`), confirming all three required
outcomes through the HTTP API:

```
BUG-103  GET /studentids?name=" grace lee "   -> [1]
         stored display name                  -> Grace Lee
BUG-102  POST /transcripts/1/CS360 {85}       -> 201
         POST /transcripts/1/CS360 {40}       -> 409 Grade already exists for course CS360
         GET  /transcripts/1/CS360            -> {"grade":85}   (original grade intact)
         PUT  /transcripts/1/CS360 {92}       -> 200            (changeGrade still corrects)
BUG-101  DELETE /transcripts/1                -> 204
         GET /transcripts/1/CS360             -> 404 Grade not found
```

## Running the project

```
npm install
npm test
npm start      # PORT=4001 by default
```
