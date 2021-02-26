import {numberToColumnLetter} from './util';

export default class Cell {
  constructor(sheet, value, options = {}) {
    Object.defineProperty(this, 'sheet', { value: sheet, enumerable: false });
    Object.defineProperty(this, 'db', { value: sheet.db, enumerable: false });
    Object.defineProperty(this, 'orm', { value: sheet.orm, enumerable: false });


    this.value = value;
    if (options.id) this.id = options.id;
    if (options.row && options.column) this.id = numberToColumnLetter(options.column) + (options.row + 1);
    if (!this.id) throw new Error('Cell id must be supplied');

    Object.defineProperty(this, 'reference', { value: `${this.sheet.name}!${this.id}`, enumerable: false });
  }

  update(value) {
    this.value = value;

    return this.sheet.create().then(() => {
      return this.orm.sheets.spreadsheets.values.update({
        spreadsheetId: this.db.id,
        range: this.reference,
        valueInputOption: 'RAW'
      }, {
        majorDimension: 'ROWS',
        values: [[this.value]]
      }).then(() => {
        console.log('Cell updated');

        return this;
      });
    });
  }
}
