/// <reference types="bun" />

import { expect, test } from "bun:test";
import { parseArray, parseObject } from "./lighton"

test("parseArray", () => {
  expect(parseArray("[]").res).toEqual([])
  expect(parseArray("[a,   b  ,   ]").res).toEqual(["a", "b"])
  expect(parseArray("[a, [b, c], d]").res).toEqual(["a", ["b", "c"], "d"])
  expect(parseArray(`[
      [[infos, CIP], {fr: CIP}],
      [1, 2]
    ]`).pos).toEqual<any>([["infos", "CIP"], { fr: "CIP" }, [1, 2]])

})

test("parseObject", () => {
  expect(parseObject(`{
    infos: [
      [[infos, CIP], {fr: CIP}],
    ],
  }`).res).toEqual({infos: [
    [[ "infos", "CIP" ], { fr: "CIP" }],
  ]})
})
