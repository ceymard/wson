# WSON : The WorkSheet Object Notation

A workbook sheet usually starts as

## Types

Values may be `TRUE` or `FALSE`, dates, numbers or text. The single character `~` is interpreted as the `null` value.

## Object mode

In object mode, keys are read vertically.

Empty lines are ignored.

An empty cell to the right of a key is `null`.

| **key**         | text value |
| --------------- | ---------- |
| **another-key** | 123        |
| **boolean**     | TRUE       |
| **null**        | ~          |
| **still null**  |            |

Gives

```json
{
  "key": "text value",
  "another-key": 123,
  "boolean": true,
  "null": null,
  "still null": null
}
```

Keys may be formatted to change parsing mode in their value. The default mode is to read a single value in the cell to the right.

## [Simple-value] lists

`[key]` : Values are read starting immediately to the right and until an empty cell on the same line and are appended to the `key` property. If the property didn't exist, create an empty array first. It is an error if it existed but was not an array.

A simple array property may be specified multiple times as it is an append operation.

| **prop** | value ! |     |     |     |
| -------- | ------- | --- | --- | --- |
| [list]   | 1       | 2   | 3   | 4   |
| [list]   | 5       | 6   | 7   |

Gives

```json
{
  "prop": "value !",
  "list": [1, 2, 3, 4, 5, 6, 7]
}
```

## {Sub-object} mode

Start a _new_ object immediately to the right and read its keys vertically from there. This sub-object ends whenever a cell is not empty below the key or at the end of the worksheet.

| **name**      | John         |             |             |
| ------------- | ------------ | ----------- | ----------- |
| **surname**   | Doe          |
| **{manager}** | **name**     | Dark        |
|               | **surname**  | Vador       |
| **{coach}**   | **name**     | Anakin      |
|               | **surname**  | Skywalker   |
|               | **[powers]** | Telekinesis | Force-Choke |
|               | **{spouse}** | **name**    | Padme       |

```json
{
  "name": "John",
  "surname": "Doe",
  "manager": {
    "name": "Dark",
    "surname": "Vador"
  },
  "coach": {
    "name": "Anakin",
    "surname": "Skywalker",
    "powers": ["Telekinesis", "Force-Choke"],
    "spouse": {
      "name": "Padme"
    }
  }
}
```

## [{Object-Append}]

Start a new object and append it to the property

| **name** |

## Object array

| [[movies]] | name       | director | year | [actors]         | [actors]       |
| ---------- | ---------- | -------- | ---- | ---------------- | -------------- |
|            | Terminator | Cameron  | 1984 | Arnie !          | Linda Hamilton |
|            | Alien      | Scott    | 1999 | Sigourney Weaver |                |
|            | Waterworld | Reynolds | 1995 | Kevin Costner    | Hopper         |

```json
{
  "movies": [
    {
      "name": "Terminator",
      "director": "Cameron",
      "year": 1984,
      "actors": ["Arnie !", "Linda Hamilton"]
    },
    {
      "name": "Alien",
      "director": "Scott",
      "year": 1999,
      "actors": ["Sigourney Weaver"]
    },
    {
      "name": "Waterworld",
      "director": "Reynolds",
      "year": 1995,
      "actors": ["Kevin Costner", "Hopper"]
    }
  ]
}
```
