import findKey from 'lodash/findKey';

import {processResponse} from './util';
import Sheet from './sheet';
import Document from './document';

export default class DocumentTable extends Sheet {
  constructor(db, name, fields, options = {}) {
    super(db, name, options);

    this.fields = fields;
    this.valueSetClass = Document;
  }

  ddl() {
    if (!this.ddlSynced) {
      this.ddlSynced = this.create().then(() => {
        
      });
    }
    return this.ddlSynced;
  }

  type(name, fields) {
    return new DocumentTableType(this, name, Object.assign({}, this.fields || {}, fields));
  }
};

class DocumentTableType {
  constructor(table, name, fields) {
    this.table = table;
    this.db = table.db;
    this.orm = table.orm;
    this.name = name;
    this.fields = fields;

    this.pk = findKey(fields, (field) => field.primaryKey === true);
    if (!this.pk) throw new Error('Table must have primaryKey defined');
  }

  insert(values) {
    if (Array.isArray(values)) {
      // TODO: Optimize
      return Promise.all(values.map(item => this.insert(item)));
    }

    const valueSet = new Document(this, values);
    valueSet.defaults();
    valueSet.validate();

    console.log(valueSet);
    return this.table.ddl().then(() => {
      return this.orm.sheets.spreadsheets.values.append({
        spreadsheetId: this.db.id,
        range: `${this.table.name}!A1:A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS'
      }, {
        majorDimension: 'ROWS',
        values: [
          ['type'].concat(Object.keys(this.fields)),
          [this.name].concat(Object.keys(this.fields).map(field => valueSet[field]))
        ]
      }).then(processResponse).then(response => {
        console.log(response);
        /*if (this.mode === ROW) {
          valueSet.row = parseInt(response.updates.updatedRange.match(/(\d+)$/)[1], 10);
        }
        if (this.mode === COLUMN) {
          valueSet.column = response.updates.updatedRange.match(/(\w+)\d+$/)[1];
        }*/
      });
    });
  }
}