import { parseArray, parseObject } from "./lighton";

export type Primitive = string | number | Date | boolean | null
export type Result = {[name: string]: Result | Primitive } | Result[] | Primitive

export const enum Modifier {
  OBJECT = ">",
  INLINE = "<",
  TABLE = "<<",
  TOP_LEVEL_APPEND = ">>",
  NULL = "~",

  INLINE_OBJECT = "..{",
  INLINE_ARRAY = "..[",
}

const re_obj_modifier = new RegExp("\\s*(" + [Modifier.OBJECT, Modifier.INLINE, Modifier.TABLE].join("|") + ")$")

export type PathComponent = {
  prop: string
  array?: boolean
  on_last?: boolean
}

export interface SheetIterator {
  get(row: number, column: number): Primitive | undefined
  bounds(): { min: { row: number, column: number }, max: { row: number, column: number } }
}

export type ShonSetter = (result: Result, value: Result | Primitive) => void

export class ShonReader {

  constructor(public iterator: SheetIterator) {
    const bounds = iterator.bounds()
    this.max_row = bounds.max.row
    this.max_column = bounds.max.column
    this.min_row = bounds.min.row
    this.min_column = bounds.min.column
  }
  max_row: number
  max_column: number
  min_row: number
  min_column: number

  getCell(row: number, column: number): Primitive | undefined {
    const cell = this.iterator.get(row, column)
    if (cell == null) {
      return undefined
    }
    if (cell === Modifier.NULL) {
      return null
    }
    if (typeof cell === "string") {
      if (cell[0] === Modifier.NULL) {
        let nb = 1
        for ( ; nb < cell.length; nb++) {
          if (cell[nb] === Modifier.NULL) {
            nb++
          } else {
            return cell
          }
        }
        return cell.slice(0, nb - 1)
      }

      if (cell.startsWith(Modifier.INLINE_OBJECT) || cell.startsWith(Modifier.INLINE_ARRAY)) {
        if (cell[2] === "{") {
          return parseObject(cell.slice(2)).res
        } else if (cell[2] === "[") {
          return parseArray(cell.slice(2)).res
        }
        return cell
      }
    }
    return cell
  }

  isEmpty(row: number, column: number): boolean {
    // if (row < this.min_row || row > this.max_row || column < this.min_column || column > this.max_column) {
    //   return true
    // }
    return this.getCell(row, column) === undefined
  }

  getSetter(value: string): {setter: ShonSetter | null, modifier: Modifier | null} {
    let modifier: Modifier | null = null
    value = value.replace(re_obj_modifier, (match, mod) => {
      modifier = mod as Modifier
      return ""
    })

    const re_components = /\[(?<last>\<)?(?<array>[^\]]+?)\]|"(?<prop>[^"]*)"|(?<prop>[^.]+)(?=\.|$)/g
    let paths = [] as PathComponent[]

    for (const component of value.matchAll(re_components)) {
      const grp = component.groups!
      if (grp.array) {
        paths.push({ prop: grp.array, array: true, on_last: !!grp.last })
      } else if (grp.prop) {
        paths.push({ prop: grp.prop, array: false, on_last: false })
      }
    }

    if (paths.length === 0) {
      return {setter: null, modifier}
    }

    if (paths[paths.length-1]?.on_last) {
      throw new Error("[<prop] cannot be the last path component")
    }

    return {setter: function (result: Result, value: Result | Primitive): void {
      let current: any = result
      for (let i = 0, len = paths.length; i < len; i++) {
        const path = paths[i]
        const is_last = i === len - 1

        if (path.array) {
          let arr = (current[path.prop] ??= [])
          if (!Array.isArray(arr)) {
            throw new Error("Property " + path.prop + " is not an array")
          }
          if (path.on_last) {
            if (arr.length === 0) {
              current = paths[i + 1].array ? [] : {}
              arr.push(current)
            } else {
              current = arr[arr.length - 1]
            }
            continue
          } else {
            if (is_last) {
              arr.push(value)
              return
            } else {
              current = paths[i + 1].array ? [] : {}
              arr.push(current)
            }
            continue
          }
        } else {
          if (is_last) {
            if (current[path.prop] == null) {
              current[path.prop] = value
            } else {
              throw new Error("Property " + path.prop + " already exists")
            }
          } else {
            current = (current[path.prop] ??= paths[i + 1].array ? [] : {})
          }
        }
      }
      return
    }, modifier}
  }

  getTopLevel() {
    let row = this.min_row
    let column = this.min_column

    let cell = this.getCell(row, column)

    if (cell?.toString() === Modifier.TOP_LEVEL_APPEND || cell?.toString() === Modifier.INLINE) {
      let res = [] as Result[]

      while (row <= this.max_row) {
        let cell = this.getCell(row, column)
        if (cell?.toString() === Modifier.TOP_LEVEL_APPEND) {
          const { result, row: new_row } = this.getObject(row, column + 1)
          row = new_row
          res.push(result)
        } else if (cell === undefined) {
          row++
        } else if (cell?.toString() === Modifier.INLINE) {
          const { result, row: new_row } = this.getInline(row, column + 1)
          row = new_row
          res.push(result)
        } else {
          throw new Error("Only top level appenders can appear in their own column when used")
        }
      }
      return res
    } else if (cell?.toString() === Modifier.OBJECT) {
      return this.getObject(row, column + 1)?.result
    }
    return this.getTable(row, column)?.result
  }

  getTable(row: number, column: number): { row: number, column: number, result: Result } {
    const res = [] as Result[]
    const headers: (ShonSetter | null)[] = []

    let col_iter = column
    for (; col_iter <= this.max_column; col_iter++) {
      const cell = this.getCell(row, col_iter)
      if (cell == null) {
        headers.push(null)
        continue
      }
      const setter = this.getSetter(cell.toString())
      if (setter.setter != null) {
        headers.push(setter.setter)
      }
      if (setter.modifier != null) {
        throw new Error(`Table headers cannot have modifiers (got "${setter.modifier}") at column ${cell.toString()}`)
      }
    }

    row++

    while (row <= this.max_row && this.isEmpty(row, column-1)) {
      let line = {} as Result
      let found_one = false
      for (let i = 0; i < headers.length; i++) {
        const value = this.getCell(row, column + i)
        if (value !== undefined) {
          found_one = true
          headers[i]?.(line, value)
        }
      }
      if (found_one) {
        res.push(line)
      }
      row++
    }
    return { row, column, result: res }
  }

  getInline(row: number, column: number): { row: number, column: number, result: Result[] } {
    const result = [] as Result[]
    let _next_row = row + 1

    do {
      for (let i = 0, l = this.max_column - column; i <= l; i++) {
        const cell = this.getCell(row, column + i)

        if (cell === Modifier.OBJECT) {
          const { result: sub_result, row: new_row, column: new_column } = this.getObject(row, column)
          _next_row = Math.max(_next_row, new_row)
          result.push(sub_result)
          column = new_column + 1
        } else if (cell === Modifier.INLINE) {
          const { result: sub_result, row: new_row } = this.getInline(row, column)
          _next_row = Math.max(_next_row, new_row)
          result.push(sub_result)
        } else if (cell !== undefined) {
          result.push(cell)
        }
      }

      row = _next_row
      _next_row = row + 1
    } while (row <= this.max_row && this.isEmpty(row, column-1))

    return { row, column: column, result: result }
  }

  getObject(row: number, column: number): { row: number, column: number, result: Result } {
    const res = {} as Result
    let last_setter: ShonSetter | null = null

    do {
      const current = this.getCell(row, column)?.toString()
      if (current == null) {
        row++
        continue
      }

      const setter = this.getSetter(current)
      if (setter.setter != null) {
        last_setter = setter.setter
      }

      switch (setter.modifier) {

        case Modifier.OBJECT: {
          const { result, row: new_row } = this.getObject(row, column + 1)
          row = new_row
          last_setter?.(res, result)
          break
        }

        case Modifier.INLINE: {
          const { result: sub_result, row: new_row } = this.getInline(row, column + 1)
          row = new_row
          last_setter?.(res, sub_result)
          break
        }

        case Modifier.TABLE: {
          const { result, row: new_row, column: new_column } = this.getTable(row, column + 1)
          row = new_row
          last_setter?.(res, result)
          break
        }

        default: {
          const cell = this.getCell(row, column + 1)
          if (cell !== undefined) {
            last_setter?.(res, cell)
          }
          row++
        }
      }

    } while (row <= this.max_row && this.isEmpty(row, column-1))

    return { row, column, result: res }
  }
}
