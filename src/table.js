import find from 'lodash/find';
import findKey from 'lodash/findKey';
import mapValues from 'lodash/mapValues';
import last from 'lodash/last';
import isPlainObject from 'lodash/isPlainObject';

import {processResponse, numberToColumnLetter, RowExistsError, ColumnExistsError, ROW, COLUMN, APPEND, PREPEND} from './util';

export default class Table {
  constructor(db, name, fields, options = {}) {
    if (!db || !name || !fields) throw new Error('new Table(db, name, fields) is required');

    this.orm = db.orm;
    this.mode = options.mode || ROW;
    this.insertOrder = options.insertOrder || APPEND;

    if (this.mode === COLUMN && this.insertOrder === APPEND) throw new Error('APPEND is not supported for mode COLUMN currently');

    this.name = name;
    this.db = db;
    this.fields = mapValues(fields, (field, key) => ({
      ...field,
      header: field.header || key,
      key: field.header || key
    }));
    this.pk = findKey(fields, (field) => field.primaryKey === true);
    this.fields[this.pk].required = true;
    this.skipRows = options.skipRows || 0;
    this.skipColumns = options.skipColumns || 0;
    this.skip = options.mode === COLUMN ? this.skipColumns : this.skipRows;

    if (!this.pk) throw new Error('Table must have primaryKey defined');

    this.ddlSynced = null;
    this._create = null;
  }

  id() {
    return this.db.sheets[this.name] ? this.db.sheets[this.name].properties.sheetId : null;
  }

  create() {
    if (!this._create) {
      this._create = this.db.create().then(() => {
        if (!this.db.sheets[this.name]) {
          return this.orm.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.db.id
          }, {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: this.name
                  }
                }
              }
            ]
          }).then(processResponse).then(response => {
            this.db.sheets[this.name] = response.replies[0].addSheet;
          });
        } else {
          return Promise.resolve();
        }
      });
    }
    return this._create;
  }

  getRaw(majorDimension = 'ROWS') {
    return this.orm.sheets.spreadsheets.values.get({
      spreadsheetId: this.db.id,
      range: `${this.name}!A:XXX`
    }, {
      majorDimension
    }).then(processResponse).then(response => {
      return response.values;
    });
  }

  insert(values) {
    if (Array.isArray(values)) {
      // TODO: Optimize
      return Promise.all(values.map(item => this.insert(item)));
    }

    const valueSet = new this.valueSetClass(this, values);
    valueSet.defaults();
    valueSet.validate();

    return this.ddl().then(() => {
      return this.findByPk(valueSet[this.pk]).then(existingValueSet => {
        if (existingValueSet) throw new (this.mode === ROW ? RowExistsError : ColumnExistsError)(`${this.mode} with primary key ${valueSet[this.pk]} already exists`);

        return Promise.resolve().then(() => {
          if (this.insertOrder === PREPEND) {
            return this.orm.sheets.spreadsheets.batchUpdate({
              spreadsheetId: this.db.id,
              resource: {
                requests: [
                  {
                    insertDimension: {
                      range: {
                        sheetId: this.id(),
                        dimension: this.mode === ROW ? 'ROWS' : 'COLUMNS',
                        startIndex: this.skip + (this.mode === ROW ? 1 : 0),
                        endIndex: this.skip + (this.mode === ROW ? 2 : 1)
                      },
                      inheritFromBefore: false
                    }
                  }
                ]
              }
            }).then(() => {
              return this.orm.sheets.spreadsheets.values.update({
                spreadsheetId: this.db.id,
                range: this.mode === ROW ? this._prepareColumnRange(2) : this._prepareRowRange(0),
                valueInputOption: 'RAW'
              }, {
                majorDimension: this.mode === ROW ? 'COLUMNS' : 'COLUMNS',
                values: this._prepareValues(valueSet)
              }).then(processResponse).then((response) => {
                if (this.mode === ROW) {
                  valueSet.row = parseInt(response.updatedRange.match(/(\d+)$/)[1], 10);
                }
                if (this.mode === COLUMN) {
                  valueSet.column = response.updatedRange.match(/(\w+)\d+$/)[1];
                }
              });
            });
          } else {
            return this.orm.sheets.spreadsheets.values.append({
              spreadsheetId: this.db.id,
              range: this.mode === ROW ? this._prepareColumnRange(2) : this._prepareRowRange(0),
              valueInputOption: 'RAW',
              insertDataOption: 'INSERT_ROWS'
            }, {
              majorDimension: this.mode === ROW ? 'COLUMNS' : 'ROWS',
              values: this._prepareValues(valueSet)
            }).then(processResponse).then(response => {
              if (this.mode === ROW) {
                valueSet.row = parseInt(response.updates.updatedRange.match(/(\d+)$/)[1], 10);
              }
              if (this.mode === COLUMN) {
                valueSet.column = response.updates.updatedRange.match(/(\w+)\d+$/)[1];
              }
            });
          }
        });
      }).then(() => {
        return valueSet;
      });
    });
  }

  upsert(values) {
    const pk = values[this.pk];
    if (!pk) throw new Error('upsert: pk must be in values');

    return this.findByPk(pk).then((valueSet) => {
      if (valueSet) return valueSet.update(values);
      return this.insert(values);
    });
  }

  findByPk(search) {
    return this.findAll().then((valueSets) => {
      if (!valueSets.length) return null;
      return valueSets.find(valueSet => valueSet[this.pk] === search) || null;
    });
  }

  findAll() {
    return this.ddl().then(() => {
      return this.orm.sheets.spreadsheets.values.get({
        spreadsheetId: this.db.id,
        range: this.name
      }, {
        majorDimension: this.mode === ROW ? 'ROWS' : 'COLUMNS',
      }).then(processResponse).then(response => {
        if (!response.values) return [];
        const skip = this.skip + (this.mode === ROW ? 1 : 0);
        const responseValues = response.values.slice(skip, response.values.length);
        if(!responseValues.length) return [];

        if (this.mode === ROW) {
          return responseValues.map((row, index) => {
            const values = row.reduce((memo, value, index) => {
              const column = numberToColumnLetter(index);
              const field = find(this.fields, search => search.column === column);
              if (!field) return memo;

              memo[field.header] = value === null ? null : field.type ? field.type(value) : value;
              return memo;
            }, {});

            return new this.valueSetClass(this, values, {
              row: skip + index + 1
            });
          });
        }
        if (this.mode === COLUMN) {
          return responseValues.map((column) => {
            const values = column.reduce((memo, value, index) => {
              const field = find(this.fields, search => search.row === index);
              if (!field) return memo;
              memo[field.key] = field.type ? field.type(value) : value;
              return memo;
            }, {});
            return new this.valueSetClass(this, values, {});
          });
        }
      });
    });
  }

  _prepareValues(values) {
    if (this.mode === ROW) {
      return this.columns().map(column => {
        return [column.field ? values[column.field.header] : undefined];
      });
    }
    if (this.mode === COLUMN) {
      return [this._prepareColumnValues(values, this.fields)];
    }
  }

  _prepareColumnValues(values, fields) {
    return Object.keys(fields).reduce((memo, key) => {
      if (isPlainObject(fields[key].type)) return memo.concat(this._prepareColumnValues(values[key], fields[key].type));
      if (Array.isArray(fields[key].type)) return memo.concat([values[key].join(',')]);
      return memo.concat([values[key]]);
    }, []);
  }

  _prepareRowRange(index) {
    const letter = numberToColumnLetter(this.skipColumns + index);
    return `${this.name}!${letter}${this.skipRows + 1}:${letter}1000`;
  }

  _prepareColumnRange(firstRow, lastRow) {
    const columns = this.columns();
    lastRow = lastRow || firstRow;

    return `${this.name}!${columns[0].letter}${firstRow}:${last(columns).letter}${lastRow}`;
  }
}
