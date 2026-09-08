import { describe, expect, it } from "vitest";
import { parseCourseProgress } from "./course-progress";

describe("course progress imports", () => {
  it("keeps compatible saved lessons", () => {
    expect(parseCourseProgress('{"completed":{"02-leccion-1":true,"p01-notas":false}}'))
      .toEqual({ completed: { "02-leccion-1": true, "p01-notas": false } });
  });
  it.each(['null', '[]', '{}', '{"completed":null}', '{"completed":[]}', '{"completed":{"x":"yes"}}', '{"completed":{"__proto__":true}}', 'broken'])
    ("rejects invalid or hostile storage: %s", (raw) => expect(() => parseCourseProgress(raw)).toThrow());
});
