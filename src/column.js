import { times } from 'lodash';
import {PREPEND} from './util';
import ValueSet from './valueset';

export default class Column extends ValueSet {
  constructor(table, values, options = {}) {
    super(table, values, options);
    Object.defineProperty(this, 'column', { value: options.column || null, enumerable: false, writable: true });
  }

  update(values) {
    this.set(values);
    this.validate();

    /*
     * Can't rely on this.column in a prepend scenario
    */

    return Promise.resolve().then(() => {
      if (this.table.insertOrder === PREPEND) {
        return this.table.getRaw().then(raw => {
          return [raw[0].indexOf(this[this.table.pk]), raw.length];
        });
      }
      return [this.column, null];
    }).then(result => {
      const [column, maxLength] = result;
      if (column === -1) throw new Error('Unable to determine column position');
      // Make sure we potentially override any leftover repeating values
      const values = this.table._prepareValues(this).map(item => {
        return item.concat(times(maxLength).map(() => ""));
      });

      return this.orm.sheets.spreadsheets.values.update({
        spreadsheetId: this.db.id,
        range: this.table._prepareRowRange(column),
        valueInputOption: 'RAW'
      }, {
        majorDimension: 'COLUMNS',
        values
      }).then(() => {
        console.log('Column updated');

        return this;
      });
    });
  }
}
