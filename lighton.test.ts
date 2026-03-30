/// <reference types="bun" />

import { expect, test } from "bun:test";
import { parseArray } from "./lighton"

test("parseArray", () => {
  expect(parseArray("[]").res).toEqual([])
  expect(parseArray("[a,   b  ,   ]").res).toEqual(["a", "b"])
  expect(parseArray("[a, [b, c], d]").res).toEqual(["a", ["b", "c"], "d"])
})