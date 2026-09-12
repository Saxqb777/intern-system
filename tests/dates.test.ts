import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dayArabic,
  dayOf,
  dayShort,
  humanMinutes,
  isWeekday,
  minutesBetween,
  officeTime,
  officeToday,
  sheetDate,
  sheetDays,
  weekOf,
  weekdaysBetween,
} from "../src/lib/dates.ts";

// The placement the university sheet was drawn up for.
const START = "2026-09-07"; // a Monday

test("the working week is Monday to Friday", () => {
  assert.equal(isWeekday("2026-09-07"), true, "Monday");
  assert.equal(isWeekday("2026-09-11"), true, "Friday");
  assert.equal(isWeekday("2026-09-12"), false, "Saturday");
  assert.equal(isWeekday("2026-09-13"), false, "Sunday");
});

test("a week of dates skips the weekend", () => {
  assert.deepEqual(weekdaysBetween("2026-09-07", "2026-09-13"), [
    "2026-09-07",
    "2026-09-08",
    "2026-09-09",
    "2026-09-10",
    "2026-09-11",
  ]);
});

test("the whole placement is 65 working days", () => {
  // Every row the Word sheet will contain, Sep 7 to Dec 4.
  assert.equal(weekdaysBetween(START, "2026-12-04").length, 65);
});

test("week numbers count from the placement, not the calendar", () => {
  assert.equal(weekOf("2026-09-07", START), 1, "first Monday");
  assert.equal(weekOf("2026-09-11", START), 1, "same week, Friday");
  assert.equal(weekOf("2026-09-14", START), 2, "next Monday");
  assert.equal(weekOf("2026-12-04", START), 13, "last day of the placement");
});

test("a placement starting mid-week still begins at week 1", () => {
  const wed = "2026-09-09";
  assert.equal(weekOf(wed, wed), 1);
  assert.equal(weekOf("2026-09-11", wed), 1, "Friday of that same week");
  assert.equal(weekOf("2026-09-14", wed), 2, "the Monday after");
});

test("dates are written the way the sheet writes them", () => {
  assert.equal(sheetDate("2026-09-07"), "Sep 07, 2026");
  assert.equal(sheetDate("2026-12-04"), "Dec 04, 2026");
  assert.equal(dayShort("2026-09-11"), "Fri");
  assert.equal(dayArabic("2026-09-11"), "الجمعة");
});

test("times are shown in Gulf time, not the server's", () => {
  // 05:02 UTC is 09:02 in Al Ain. A server in Washington must not say 01:02.
  assert.equal(officeTime("2026-09-11T05:02:00.000Z"), "09:02");
  assert.equal(officeTime("2026-09-11T13:04:00.000Z"), "17:04");
  assert.equal(officeTime(null), null);
});

test("a punch just before Gulf midnight belongs to that day", () => {
  // 20:30 UTC is 00:30 the next morning in Al Ain.
  assert.equal(
    officeToday(new Date("2026-09-11T20:30:00.000Z")),
    "2026-09-12"
  );
  assert.equal(
    officeToday(new Date("2026-09-11T19:30:00.000Z")),
    "2026-09-11",
    "23:30 local is still the same day"
  );
});

test("hours worked", () => {
  assert.equal(
    minutesBetween("2026-09-11T05:02:00Z", "2026-09-11T13:04:00Z"),
    482
  );
  assert.equal(minutesBetween("2026-09-11T05:02:00Z", null), 0, "still signed in");
  assert.equal(
    minutesBetween("2026-09-11T13:04:00Z", "2026-09-11T05:02:00Z"),
    0,
    "never negative"
  );
});

test("durations read the way a person would say them", () => {
  assert.equal(humanMinutes(482), "8h 02m");
  assert.equal(humanMinutes(194), "3h 14m");
  assert.equal(humanMinutes(0), "0h 00m");
  assert.equal(humanMinutes(60), "1h 00m");
});

// The driver hands date columns back as JavaScript Date objects, not strings,
// and there is no option to change that. This is the seam that absorbs it, so
// it gets tested against both shapes.
test("a calendar day is read the same from a Date or a string", () => {
  assert.equal(dayOf(new Date("2026-09-11T00:00:00.000Z")), "2026-09-11");
  assert.equal(dayOf("2026-09-11"), "2026-09-11");
  assert.equal(dayOf("2026-09-11T00:00:00.000Z"), "2026-09-11");
});

test("a timestamp keeps the day it happened on", () => {
  // 05:02 UTC is 09:02 in Al Ain, same day either way.
  assert.equal(dayOf(new Date("2026-09-11T05:02:00.000Z")), "2026-09-11");
  assert.equal(dayOf("2026-09-11T13:04:00.000Z"), "2026-09-11");
});

test("a missing date does not throw", () => {
  assert.equal(dayOf(null), "");
  assert.equal(dayOf(undefined), "");
});

// A Saturday shift is real. The university's form has no Saturday row, so the
// sheet grows one rather than dropping the punch. This was live for a day and
// a real test punch vanished into it.
test("a sheet shows recorded days the working week does not cover", () => {
  // Sep 7 is a Monday, Sep 12 a Saturday.
  assert.deepEqual(sheetDays("2026-09-07", "2026-09-13", []), [
    "2026-09-07",
    "2026-09-08",
    "2026-09-09",
    "2026-09-10",
    "2026-09-11",
  ]);

  assert.deepEqual(sheetDays("2026-09-07", "2026-09-13", ["2026-09-12"]), [
    "2026-09-07",
    "2026-09-08",
    "2026-09-09",
    "2026-09-10",
    "2026-09-11",
    "2026-09-12",
  ]);
});

test("a recorded day is never listed twice", () => {
  const days = sheetDays("2026-09-07", "2026-09-11", [
    "2026-09-08",
    "2026-09-08",
  ]);
  assert.equal(days.length, 5);
  assert.equal(new Set(days).size, 5);
});

test("records outside the range asked for stay out of it", () => {
  assert.deepEqual(
    sheetDays("2026-09-07", "2026-09-08", ["2026-08-30", "2026-12-25"]),
    ["2026-09-07", "2026-09-08"]
  );
});
