import keyBy from 'lodash/keyBy';
import noop from 'lodash/noop';

import {processResponse, RowExistsError, ColumnExistsError, ROW, COLUMN, DOCUMENT, PREPEND, APPEND, numberToColumnLetter} from './util';

import Sheet from './sheet';
import RowTable from './table-row';
import ColumnTable from './table-column';
import DocumentTable from './table-document';

class ORM {
  static DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4", "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
  static SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly";
  static ROW = ROW;
  static COLUMN = COLUMN;
  static DOCUMENT = DOCUMENT;
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

  search(query) {
    return this.drive.files.list({
      q: `'me' in owners and mimeType='application/vnd.google-apps.spreadsheet' and name contains '${query}' and trashed = false`,
      'fields': "files(id,name)"
    }).then(processResponse).then((response) => {
      return response.files.map(file => {
        const db = this.db(file);

        return db;
      });
    });
  }
}

class DB {
  constructor(orm, value) {
    let name, id;
    if (typeof value === 'string') {
      name = value;
    } else {
      name = value.name;
      id = value.id;
    }

    this.orm = orm;
    this.name = name || null;
    this.created = null;
    this.found = null;
    this.id = id || null;
    this.sheets = {};
  }

  find() {
    if (!this.found) {
      this.found = Promise.resolve().then(() => {
        if (this.id) return;
        return this.orm.drive.files.list({
          q: `mimeType='application/vnd.google-apps.spreadsheet' and name = '${this.name}' and trashed = false`,
          'pageSize': 1,
          'fields': "files(id)"
        }).then(processResponse).then((response) => {
           const file = response.files[0];
           if (file) this.id = file.id;
        });
      }).then(() => {
        if (!this.id) return null;
        console.log(this.id);
        return this.orm.sheets.spreadsheets.get({
          spreadsheetId: this.id
        }).then(processResponse).then(response => {
          this.name = response.properties.title;
          this.sheets = keyBy(response.sheets, 'properties.title');
          return this;
        });
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
        return this;
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

  sheet(name, options) {
    return new Sheet(this, name, options);
  }

  table(name, fields, options = {}) {
    options.mode = options.mode || ORM.ROW;
    options.insertOrder = options.insertOrder || ORM.APPEND;
    if (![ROW, COLUMN, DOCUMENT].includes(options.mode)) throw new Error('Table mode must be one of [GoogleSheetsORM.ROW, GoogleSheetsORM.COLUMN, GoogleSheetsORM.DOCUMENT]');
    if (![PREPEND, APPEND].includes(options.insertOrder)) throw new Error('Table insert order must be one of [GoogleSheetsORM.PREPEND, GoogleSheetsORM.APPEND]');

    if (options.mode === ROW) return new RowTable(this, name, fields, options);
    if (options.mode === COLUMN) return new ColumnTable(this, name, fields, options);
    if (options.mode === DOCUMENT) return new DocumentTable(this, name, fields, options);
  }
}

ORM.RowExistsError = RowExistsError;
ORM.ColumnExistsError = ColumnExistsError;
ORM.utils = {
  numberToColumnLetter
};
export default ORM;
