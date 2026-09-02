import { describe, expect, it } from "vitest";
import { calculateAge, calculateAgeBracket } from "../../lib/age-bracket";

const asOf = new Date("2026-06-15");

describe("calculateAge", () => {
  it("computes age when the birthday has already happened this year", () => {
    expect(calculateAge(new Date("2020-01-01"), asOf)).toBe(6);
  });

  it("computes age when the birthday hasn't happened yet this year", () => {
    expect(calculateAge(new Date("2020-12-31"), asOf)).toBe(5);
  });

  it("computes age on the exact birthday", () => {
    expect(calculateAge(new Date("2020-06-15"), asOf)).toBe(6);
  });
});

describe("calculateAgeBracket", () => {
  it.each([
    ["2022-01-01", "Tots"], // turns 4 this year
    ["2018-01-01", "Bantams"], // turns 8
    ["2016-01-01", "Midget"], // turns 10
    ["2014-01-01", "Junior"], // turns 12
    ["2013-01-01", "Intermediate"], // turns 13
  ] as const)("birthday %s -> %s", (birthday, expected) => {
    expect(calculateAgeBracket(new Date(birthday), asOf)).toBe(expected);
  });

  it("returns null outside the 4-13 range", () => {
    expect(calculateAgeBracket(new Date("2024-01-01"), asOf)).toBeNull(); // 2, too young
    expect(calculateAgeBracket(new Date("2005-01-01"), asOf)).toBeNull(); // 21, too old
  });
});
