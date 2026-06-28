import { expect, test } from "vite-plus/test";
import { parseDate } from "../src/date.ts";

const CASES: Array<[string, string, string]> = [
  ["en-uk", "Monday, 30 December 2024 14:46:33", "2024-12-30T14:46:33.000Z"],
  ["en-us 12h PM", "Monday, December 30, 2024 2:46:33 PM", "2024-12-30T14:46:33.000Z"],
  ["de", "Montag, 30. Dezember 2024 14:46:33", "2024-12-30T14:46:33.000Z"],
  ["fr", "lundi 30 septembre 2019 18:00:39", "2019-09-30T18:00:39.000Z"],
  ["es", "lunes, 30 de septiembre de 2019 18:00:39", "2019-09-30T18:00:39.000Z"],
  ["ru", "понедельник, 30 декабря 2024 г. в 14:46:33", "2024-12-30T14:46:33.000Z"],
  ["zh", "2019年9月30日星期一 18:00:39", "2019-09-30T18:00:39.000Z"],
  ["ja", "2024年12月30日月曜日 14:46:33", "2024-12-30T14:46:33.000Z"],
];

for (const [name, input, expected] of CASES) {
  test(`parses a ${name} date`, () => {
    expect(parseDate(input)).toBe(expected);
  });
}

test("returns undefined for an unreadable date", () => {
  expect(parseDate("sometime last week")).toBeUndefined();
});
