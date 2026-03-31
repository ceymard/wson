/*
Light object notation.

This version parses arrays and objects, similar to YaML inline blocks.

Strings do not need to be quoted, and neither do property names.
Numbers, "true", "false" or "null", are parsed as such, as well as ISO dates.
When quoting, typographic double quotes are interpreted as regular double quotes.
Single quotes are considered regular text.
Spaces are limited to " ", "\t", "\n" and "\r" : the rest is kept as is.
*/

// Characters considered double quotes, because Excel tries to insert them
const dbl_quotes = new Set([
  "\"",
  "“",
  "”",
])

const spaces = new Set([
  " ",
  "\t",
  "\n",
  "\r",
])

const stack = new Array<any>(64)

const re_date = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(Z|([+-]\d{2}):(\d{2}))?$/

// Figure out if a value is a string, a number, a boolean, a null or a date
function getValue(text: string): unknown {
  let value: any
  if (text === "true") {
    return true
  }
  if (text === "false") {
    return false
  }
  if (text === "null" || text === "~") {
    return null
  }
  if (text.length > 0 && !Number.isNaN(Number(text))) {
    return Number(text)
  }
  if (re_date.test(text)) {
    value = new Date(text)
    if (Number.isNaN(value.getTime())) {
      return text
    }
    return value
  }
  return text
}

// Parse an object in simple notation
// pos is already after the opening {
// Returns the parsed object and the position after the closing }
// Properties ignore space before and after them
// Strings do not need to be quoted
export function parseObject(text: string, pos = 0): { res: any, pos: number } {
  const res = {} as any
  let start = pos
  let last_non_space = pos
  const len = text.length

  if (text[pos] === "{") {
    last_non_space = start = pos = pos + 1
  }

  while (pos < len) {

    // advance to the first non-space character
    while (pos < len && spaces.has(text[pos])) {
      last_non_space = start = pos = pos + 1
    }

    if (pos >= len) {
      break
    }

    if (text[pos] === "}") {
      pos++
      break
    }

    while (pos < len && text[pos] !== ":") {
      if (!spaces.has(text[pos])) {
        last_non_space = pos + 1
      }
      pos++
    }

    let prop = text.slice(start, last_non_space)

    // We should be on a property name
    if (text[pos] !== ":") {
      console.error("prop", prop)
      console.error("end", text.slice(pos))
      console.error("res", res)

      throw new Error("Expected : after property name")
    }
    pos++

    // skip spaces
    while (pos < len && spaces.has(text[pos])) {
      last_non_space = start = pos = pos + 1
    }

    if (pos >= len) {
      break
    }

    // We're now on a non-space character
    if (text[pos] === "[") {
      const { res: sub_res, pos: sub_pos } = parseArray(text, pos)
      res[prop] = sub_res
      start = last_non_space = pos = sub_pos
    } else if (text[pos] === "{" ) {
      const { res: sub_res, pos: sub_pos } = parseObject(text, pos)
      res[prop] = sub_res
      start = last_non_space = pos = sub_pos
    } else {

      while (pos < len && text[pos] !== "," && text[pos] !== "}") {
        if (!spaces.has(text[pos])) {
          last_non_space = pos + 1
        }
        pos++
      }

      res[prop] = getValue(text.slice(start, last_non_space))
    }

    // advance to the first non-space character
    while (pos < len && spaces.has(text[pos])) {
      last_non_space = start = pos = pos + 1
    }

    if (pos >= len) {
      break
    }

    if (text[pos] === ",") {
      pos++
      continue
    }

    // advance to the first non-space character
    while (pos < len && spaces.has(text[pos])) {
      last_non_space = start = pos = pos + 1
    }

    if (pos >= len) {
      break
    }

    if (text[pos] === "}") {
      pos++
      break
    }
  }

  return { res, pos }
}

// Parse an array in simple notation
// pos is already after the opening [
// Returns the parsed array and the position after the closing ]
// Elements ignore space before and after them
export function parseArray(text: string, pos = 0): { res: any, pos: number } {
  const res = [] as any
  let start = pos
  let last_non_space = pos
  const len = text.length

  if (text[pos] === "[") {
    last_non_space = start = pos = pos + 1
  }

  console.error("start", text.slice(pos))
  while (pos < len) {

    // advance to the first non-space character
    while (pos < len && spaces.has(text[pos])) {
      last_non_space = start = pos = pos + 1
    }

    if (pos >= len) {
      break
    }

    if (text[pos] === "]") {
      console.error("end", text.slice(pos))
      pos++
      break
    }

    // We're now on a non-space character
    if (text[pos] === "[") {
      const { res: sub_res, pos: sub_pos } = parseArray(text, pos)
      res.push(sub_res)
      start = last_non_space = pos = sub_pos
    } else if (text[pos] === "{" ) {
      const { res: sub_res, pos: sub_pos } = parseObject(text, pos)
      res.push(sub_res)
      start = last_non_space = pos = sub_pos
    } else {

      while (pos < len && text[pos] !== "," && text[pos] !== "]") {
        if (!spaces.has(text[pos])) {
          last_non_space = pos + 1
        }
        pos++
      }

      if (text[pos] !== "]" || start < last_non_space) {
        res.push(getValue(text.slice(start, last_non_space)))
      }
    }

    // advance to the first non-space character
    while (pos < len && spaces.has(text[pos])) {
      last_non_space = start = pos = pos + 1
    }

    if (pos >= len) {
      break
    }

    if (text[pos] === ",") {
      pos++
    }

  }

  return { res, pos }
}
