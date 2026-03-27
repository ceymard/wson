# WSON : The WorkSheet Object Notation


WSON is a way to describe objects much like JSON, YaML or TOML do, but with a spreadsheet instead of text.

It functions with two modes :

- Table, with a first line of headers and objects as rows in tabular fashion
- Object, a more visually-oriented mode, suited for single objects and deep-nested data

By default, a spreadsheet is in Table format.

The sheet is considered to be in Object-mode if the first non-empty cell in the first non-empty row contains `>` (single object) or `+>` (several objects that will result in an array).

# Table mode

Table mode reads the first row as setters, and calls them in turn for each row it finds below, excluding entirely empty rows.

# Null value and empty cells

The `null` value is WSON is `~`. To output a series of `~`, just write one more `~`. The cell `~~~~~~` will give `"~~~~"`.

An empty cell is not a `null` value. Setters are not called on empty cells. Objects may thus not all have the same number of properties. Use `~` to explicitely set them to NULL.

# Setters

The object being built sees its properties set by setters.

At its simplest, it is just a name, which will set a property on the current object value being processed.

A setter may be several "properties", separated by `.`. Pathed properties allow for creating subobjects on the fly.

A property may be double quoted. The escape sequence in a double quote is `""`, like in most spreadsheet software. It can also

They can also be enclosed in `[]` to indicate array building :

- `prop` : a simple object path. It is an error if the property was set before
- `[prop]` : append to the array at `prop` in the current object. Errors if `prop` existed and was not an array. Creates the array if it didn't exist
- `[<prop]` : act on the last element of the array at `prop`. Only to be used with `.` and a subsequent property. Errors if `prop` is not an array. Creates the `prop` array if it didn't exist. Creates either an object or an array depending on the next property if `prop` array is empty.


# Modifiers in object mode

Modifiers can appear after a setter in object mode. They change the way values are read.

- `>` enters object-mode starting in the cell to the right to create a sub object and give it to the setter. Stops whenever something is encountered below the original property.
- `<<` enters inline-array mode to the right, just for the current line, in which all cells are read and given in turn to the setter. Mostly just useful for `[array.setters]`
- `>>` enters table mode on the right, and until content is found below the cell that contained the modifier.
- `+>` is a special modifier that can only appear at the top level. When it does, it enters object mode to its right and appends the value to what is now the top level-object.

Modifiers can appear on their own with no setter ; they will be applied to the last encountered setter.


## Types

Values may be `TRUE` or `FALSE`, dates, numbers or text. The single character `~` is interpreted as the `null` value.
