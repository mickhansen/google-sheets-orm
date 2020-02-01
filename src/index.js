import findKey from 'lodash/findKey';
import keyBy from 'lodash/keyBy';
import map from 'lodash/map';
import mapValues from 'lodash/mapValues';
import assign from 'lodash/assign';
import each from 'lodash/each';
import isFunction from 'lodash/isFunction';
import find from 'lodash/find';
import last from 'lodash/last';
import noop from 'lodash/noop';

import {processResponse, RowExistsError, ColumnExistsError, ROW, COLUMN, PREPEND, APPEND, numberToColumnLetter} from './util';

import Row from './row';
import Column from './column';

import RowTable from './table-row';
import ColumnTable from './table-column';

class ORM {
  static DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4", "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
  static SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly";
  static ROW = ROW;
  static COLUMN = COLUMN;
  static PREPEND = PREPEND;
  static APPEND = APPEND;

  constructor(gapiClient) {
    this.client = gapiClient
    this.drive = this.client.drive;
    this.sheets = this.client.sheets;
  }

  db(name) {
    return new DB(this, name);
  }
}

class DB {
  constructor(orm, name) {
    this.orm = orm;
    this.name = name;
    this.created = null;
    this.found = null;
    this.id = null;
    this.sheets = {};
  }

  find() {
    if (!this.found) {
      this.found = this.orm.drive.files.list({
        q: `name = '${this.name}' and trashed = false`,
        'pageSize': 1,
        'fields': "files(id)"
      }).then(processResponse).then((response) => {
         const file = response.files[0];

         if (file) {
           this.id = file.id;
           return this.orm.sheets.spreadsheets.get({
             spreadsheetId: file.id
           }).then(processResponse).then(response => {
             console.log(`Database found: ${this.id}`);
             this.sheets = keyBy(response.sheets, 'properties.title');
             return response;
           });
         }

         return null;
       });
    }
    return this.found;
  }

  create() {
    if (!this.created) {
      this.created = this.find().then(response => {
        if (response) return response;
        return this.orm.sheets.spreadsheets.create({
          properties: {
            title: this.name
          },
        }).then((response) => {
          this.id = response.result.spreadsheetId;
          console.log(`Database created: ${this.id}`);
          return response.result;
        });
      }).then(({sheets}) => {
        this.sheets = keyBy(sheets, 'properties.title');
      });
    }
    return this.created;
  }

  destroy() {
    return this.find().then((response) => {
      if (!response) return;
      return this.orm.drive.files.delete({
        fileId: this.id
      }).then(noop, function (result) {
        result = processResponse(result);

        if (result.error) {
          if (result.error.code === 404) return null;
          throw result.error;
        }
        throw result;
      });
    }).then(() => {
      this.found = null;
      this.created = null;
    });
  }

  table(name, fields, options = {}) {
    options.mode = options.mode || ORM.ROW;
    options.insertOrder = options.insertOrder || ORM.APPEND;
    if (![ROW, COLUMN].includes(options.mode)) throw new Error('Table mode must be one of [GoogleSheetsORM.ROW, GoogleSheetsORM.COLUMN]');
    if (![PREPEND, APPEND].includes(options.insertOrder)) throw new Error('Table insert order must be one of [GoogleSheetsORM.PREPEND, GoogleSheetsORM.APPEND]');

    if (options.mode === ROW) return new RowTable(this, name, fields, options);
    if (options.mode === COLUMN) return new ColumnTable(this, name, fields, options);
  }
}

ORM.RowExistsError = RowExistsError;
ORM.ColumnExistsError = ColumnExistsError;
ORM.utils = {
  numberToColumnLetter
};
export default ORM;
