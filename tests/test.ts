
import * as path from "path"
import { readFileSync } from "fs"
import { SmolWorkbook } from "smol-xlsx"
import { WsonReader } from ".."

const wb_array = readFileSync(path.join(__dirname, "wson-test.xlsx"))
const wb = new SmolWorkbook()

wb.read(wb_array)

for (const sheet of wb.sheets) {
  const reader = new WsonReader({
    get: (row, column) => sheet.get(row, column)?.v,
    bounds: () => ({
      min: { row: sheet.min_row, column: sheet.min_col },
      max: { row: sheet.max_row, column: sheet.max_col },
    }),
  })
  const result = reader.getTopLevel()
  console.log(sheet.name, result)
}

// console.log(wb)