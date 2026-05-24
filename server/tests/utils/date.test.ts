import {
  localDateStr,
  strToUTC,
  strToLocal,
  strToUTCEnd,
  daysAgoStr,
  isoWeek,
  prevIsoWeek,
} from "@/utils/date";

describe("date utils", () => {
  describe("localDateStr", () => {
    it("returns YYYY-MM-DD for a given date", () => {
      const d = new Date(2026, 2, 5); // 5 Mar 2026
      expect(localDateStr(d)).toBe("2026-03-05");
    });

    it("pads single-digit month and day", () => {
      const d = new Date(2026, 0, 1);
      expect(localDateStr(d)).toBe("2026-01-01");
    });

    it("uses today's date when no argument is passed", () => {
      const result = localDateStr();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("strToUTC", () => {
    it("converts YYYY-MM-DD to UTC midnight Date", () => {
      const d = strToUTC("2026-03-05");
      expect(d.toISOString()).toBe("2026-03-05T00:00:00.000Z");
    });
  });

  describe("strToUTCEnd", () => {
    it("converts YYYY-MM-DD to UTC end-of-day Date", () => {
      const d = strToUTCEnd("2026-03-05");
      expect(d.toISOString()).toBe("2026-03-05T23:59:59.999Z");
    });
  });

  describe("strToLocal", () => {
    it("converts YYYY-MM-DD to local Date", () => {
      const d = strToLocal("2026-03-05");
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(2);
      expect(d.getDate()).toBe(5);
    });

    it("throws on invalid format", () => {
      expect(() => strToLocal("not-a-date")).toThrow("Invalid date format");
      expect(() => strToLocal("2026-13")).toThrow("Invalid date format");
    });
  });

  describe("daysAgoStr", () => {
    it("returns N days ago as YYYY-MM-DD", () => {
      const today = new Date();
      const expected = new Date(today);
      expected.setDate(today.getDate() - 7);
      const exp = localDateStr(expected);
      expect(daysAgoStr(7)).toBe(exp);
    });

    it("returns today for 0", () => {
      expect(daysAgoStr(0)).toBe(localDateStr());
    });
  });

  describe("isoWeek", () => {
    it("returns YYYY-Www format", () => {
      const d = new Date(2026, 2, 5);
      expect(isoWeek(d)).toMatch(/^\d{4}-W\d{2}$/);
    });

    it("returns the same week for two days in the same week", () => {
      const mon = new Date(2026, 0, 5); // Mon
      const wed = new Date(2026, 0, 7); // Wed
      expect(isoWeek(mon)).toBe(isoWeek(wed));
    });

    it("returns different weeks for two days a week apart", () => {
      const a = new Date(2026, 0, 5);
      const b = new Date(2026, 0, 19);
      expect(isoWeek(a)).not.toBe(isoWeek(b));
    });
  });

  describe("prevIsoWeek", () => {
    it("returns the previous ISO week", () => {
      const thisWeek = isoWeek(new Date(2026, 2, 5));
      const prev = prevIsoWeek(thisWeek);
      expect(prev).toMatch(/^\d{4}-W\d{2}$/);
      expect(prev).not.toBe(thisWeek);
    });

    it("throws on invalid format", () => {
      expect(() => prevIsoWeek("not-a-week")).toThrow("Invalid ISO week format");
      expect(() => prevIsoWeek("abcd-Wxx")).toThrow("Invalid ISO week format");
    });

    it("round-trips: prev of next ≈ same week", () => {
      const wk = isoWeek(new Date(2026, 5, 15));
      const prev = prevIsoWeek(wk);
      const back = prevIsoWeek(prev);
      expect(back).toMatch(/^\d{4}-W\d{2}$/);
    });
  });
});
