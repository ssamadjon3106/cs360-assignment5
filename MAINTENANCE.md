# CS360 Assignment 5 - maintenance notes

Name: Samadjon Sayfullayev
Student ID: 240474
GitHub username: ssamadjon3106
Repository: https://github.com/ssamadjon3106/cs360-assignment5

I fixed three bugs and did one refactor. Each one has its own issue, its own
branch, a test that fails first, then the fix, and a pull request that was
merged into main.

| Ticket | Issue | Branch | PR |
| --- | --- | --- | --- |
| BUG-101 | #1 | fix/bug-101-delete-removes-grades | #5 |
| BUG-102 | #2 | fix/bug-102-reject-duplicate-grade | #6 |
| BUG-103 | #3 | fix/bug-103-name-search-normalization | #7 |
| REF-201 | #4 | refactor/ref-201-shared-validation | #8 |

## BUG-101

The store has two maps, `#students` and `#grades`, and both use the student id
as the key. `deleteStudent` only removed the student from `#students`, so the
grades stayed behind. `getGrade` reads `#grades` directly and does not check if
the student exists, so the grade of a deleted student could still be read with
status 200 even though `GET /transcripts/:id` already returned 404.

Fix: also delete the grades for that id inside `deleteStudent`.

Test file: `test/bug101.deleteStudent.test.js` (4 cases). Before the fix it
fails with `85 !== undefined` and `200 !== 404`.

## BUG-102

`addGrade` ended with `studentGrades.set(...)` with no check before it. `Map.set`
overwrites, so adding a grade twice for the same course replaced the old grade
and still answered 201.

Fix: check `studentGrades.has(normalizedCourse)` first and throw
`Grade already exists for course <COURSE>`. The check happens after the course
name is normalised, so `cs360` and `CS360` count as the same course. I did not
change `src/server.js` because the message does not contain "not found", so it
already becomes 409.

Test file: `test/bug102.duplicateGrade.test.js` (7 cases). 4 of them fail before
the fix. I also added cases for what should still work, like `changeGrade` and
adding a different course.

## BUG-103

`getStudentIDs` compared the query and the stored name with `===`, so searching
"grace lee" or " Grace Lee " found nothing.

Fix: a private helper `#searchKey(name)` does `.trim().toLowerCase()` and both
sides go through it. This is only for comparing. The stored name is not changed,
so the transcript still shows "Grace Lee".

Test file: `test/bug103.nameSearch.test.js` (8 cases). 7 of them fail before the
fix.

## REF-201

`addGrade` and `changeGrade` had the same 8 lines of validation, and `getGrade`
repeated the course part again. I moved the rules into `src/validation.js`:
`normalizeCourse`, `normalizeGrade`, `normalizeCourseGrade` for add and change,
and `normalizeCourseForLookup` for `getGrade`. `MIN_GRADE` and `MAX_GRADE` go
into the error message so the numbers and the text stay the same.

`getGrade` uses its own function on purpose, because reading a course that does
not exist should return `undefined` (404) and not throw an error (409).

Nothing changed for the user: same error messages, same return values, no change
to `src/server.js`, and I did not edit any test assertion.

## Merging

I created the REF-201 branch from main before BUG-102 and BUG-103 were merged,
so that branch and BUG-102 both changed `addGrade`. When I merged main into the
refactor branch, git merged the file by itself and there were no conflict
markers, so there is no conflict screenshot to show. I still read the merged
`addGrade` and ran the whole test suite, because the BUG-102 check uses
`normalizedCourse` which now comes from the shared validation.

## Running it

```
npm install
npm test
npm start
```

`npm test` gives 23 passing and 0 failing.
