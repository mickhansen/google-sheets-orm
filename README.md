# GoogleSheetsORM

## Row mode

- Works like a regular RDBMS
- Supports existing spreadsheets
- Uses first row headers as column keys

## Column mode

- Does not support existing spreadsheets (unless they conform to the exact format)
- Supports nested types
- Supports one set of repeating fields (must be last field defined)