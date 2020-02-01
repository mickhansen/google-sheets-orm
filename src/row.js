import assign from 'lodash/assign';
import each from 'lodash/each';
import isFunction from 'lodash/isFunction';

import ValueSet from './valueset';

export default class Row extends ValueSet {
  constructor(table, values, options = {}) {
    super(table, values, options);
    Object.defineProperty(this, 'row', { value: options.row || null, enumerable: false, writable: true });
  }

  update(values) {
    assign(this, values);
    this.validate();

    return this.orm.sheets.spreadsheets.values.update({
      spreadsheetId: this.db.id,
      range: this.table._prepareColumnRange(this.row),
      valueInputOption: 'RAW'
    }, {
      majorDimension: 'COLUMNS',
      values: this.table._prepareColumnValues(this)
    }).then(() => {
      console.log('Row updated');
    });
  }
}
