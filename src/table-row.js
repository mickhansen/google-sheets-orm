import findKey from 'lodash/findKey';
import keyBy from 'lodash/keyBy';
import map from 'lodash/map';
import mapValues from 'lodash/mapValues';
import assign from 'lodash/assign';
import each from 'lodash/each';
import isFunction from 'lodash/isFunction';
import find from 'lodash/find';
import last from 'lodash/last';

import Table from './table';
import Row from './row';

import {processResponse, numberToColumnLetter, RowExistsError} from './util';

export default class RowTable extends Table {
  constructor(db, name, fields, options = {}) {
    super(db, name, fields, options);

    this.valueSetClass = Row;
    this.headerRow = this.skipRows + (options.headerRow || 1);
  }

  ddl() {
    if (!this.ddlSynced) {
      this.ddlSynced = this.create().then(() => {
        return this.orm.sheets.spreadsheets.values.get({
          spreadsheetId: this.db.id,
          range: `${this.name}!A${this.headerRow}:CZ${this.headerRow}`,
          majorDimension: 'COLUMNS'
        }).then((response) => {
          const existing = (response.result.values || []).map(column => column[0]);
          const missing = Object.keys(this.fields).filter(search => !existing.includes(search));
          const start = numberToColumnLetter(existing.length) + '1';
          const end = numberToColumnLetter(existing.length + missing.length) + '1';

          this._sheetHeaders = existing.concat(missing);

          return this.orm.sheets.spreadsheets.values.update({
            spreadsheetId: this.db.id,
            range: `${this.name}!${start}:${end}`,
            valueInputOption: 'RAW'
          }, {
            values: missing.map(value => [value]),
            majorDimension: "COLUMNS"
          }).then(() => {
            this._sheetHeaders.forEach((key, i) => {
              if (!this.fields[key]) return;
              this.fields[key].column = numberToColumnLetter(i);
              this.fields[key].location = this.fields[key].column + 1;
              this.fields[key].first = i === 0;
              this.fields[key].last = i === (this._sheetHeaders.length - 1);

              if (this.fields[key].first) {
                this.firstField = key;
              }
              if (this.fields[key].last) {
                this.lastField = key;
              }
            });
          });
        });
      });
    }
    return this.ddlSynced;
  }

  columns() {
    return this._sheetHeaders.map((header, index) => {
      return {
        letter: numberToColumnLetter(index),
        field: this.fields[header]
      };
    });
  }
}
