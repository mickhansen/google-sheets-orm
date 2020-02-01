export function numberToColumnLetter(number) { // 0 based
  if (number >= 26) {
    return numberToColumnLetter(Math.floor(number / 26)) + numberToColumnLetter(number % 26);
  }
  return String.fromCharCode(65 + number);
}

export function processResponse(response) {
  if (response.data) return response.data;
  if (response.result) return response.result;
  return response;
}

export class ValueSetExistsError extends Error {

}

export class RowExistsError extends ValueSetExistsError {
  constructor(message) {
    super(message);
    this.name = "RowExistsError";
  }
}


export class ColumnExistsError extends ValueSetExistsError {
  constructor(message) {
    super(message);
    this.name = "ColumnExistsError";
  }
}

export const ROW = 'ROW';
export const COLUMN = 'COLUMN';
export const PREPEND = 'PREPEND';
export const APPEND = 'APPEND';
