import Table from './table';
import Column from './column';
import isPlainObject from 'lodash/isPlainObject';

import {processResponse, numberToColumnLetter} from './util';

export default class ColumnTable extends Table {
  constructor(...args) {
    super(...args);

    this.valueSetClass = Column;
  }

  ddl() {
    if (!this.ddlSynced) {
      this.ddlSynced = this.create().then(() => {
        let rowIndex = 0;

        const processField = (key, field, fields, prefix = '') => {
          const type = fields[key].type;

          if (isPlainObject(type)) {
            Object.keys(type).map((subKey) => {
              processField(subKey, type[subKey], type);
            });

            return;
          }

          fields[key].row = this.skipRows + rowIndex;
          rowIndex++;
        };

        Object.keys(this.fields).map((key, index) => {
          this.fields[key].first = index === 0;
          this.fields[key].last = index === (Object.keys(this.fields).length - 1);

          if (this.fields[key].first) {
            this.firstField = key;
          }
          if (this.fields[key].last) {
            this.lastField = key;
          }

          processField(key, this.fields[key], this.fields);
        });
      });
    }
    return this.ddlSynced;
  }
};
