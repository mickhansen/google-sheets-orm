import Table from './table';
import Column from './column';
import isPlainObject from 'lodash/isPlainObject';
import map from 'lodash/map';
import reduce from 'lodash/reduce';
import set from 'lodash/set';
import get from 'lodash/set';
import { repeat } from 'lodash';

function parseValue(field, value) {
  if (Array.isArray(field.type)) {
    return value.split(',').map(value => field.type[0](value));
  }
  return field.type ? field.type(value) : value;
}

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
              processField(subKey, type[subKey], type, key);
            });

            return;
          }

          if (Array.isArray(type) && isPlainObject(type[0])) {
            fields[key].repeating = true;
            fields[key].typeCount = Object.keys(type[0]).length;

            Object.keys(type[0]).forEach((key, index) => {
              type[0][key].key = key;
              type[0][key].index = index;
            });
          }

          fields[key].row = this.skipRows + rowIndex;
          fields[key].key = prefix ? `${prefix}.${key}` : key;
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

          if (!this.fields[key].last && this.fields[key].repeating) {
            throw new Error('Repeating nested type must be the last field');
          }
        });
      });
    }
    return this.ddlSynced;
  }

  parseResponse(responseValues) {
    let findField = (fields, index, prefix) => {
      return reduce(fields, (memo, field) => {
        if (memo) return memo;
        if (isPlainObject(field.type)) {
          return findField(field.type, index, field.key)
        }
        if (field.row === index || field.index === index) {
          return field;
        }
      }, null);
    }

    return responseValues.map((column) => {
      let repeatingField, repeatingValues;

      const values = column.reduce((memo, value, index) => {
        let field = findField(this.fields, index, null) || repeatingField;
        if (!field && !repeatingField) return memo;

        if (field && field.repeating) repeatingField = field;
        if (field.repeating) {
          let offset = (index - field.row) % field.typeCount;
          let subField = findField(field.type[0], offset);

          if (offset === 0) {
            if (repeatingValues) {
              repeatingValues.push({});
            } else {
              repeatingValues = [{}];
            }
          }
          
          repeatingValues[repeatingValues.length - 1][subField.key] = parseValue(subField, value);
        } else {
          set(memo, field.key, parseValue(field, value));
        }
        return memo;
      }, {});

      if (repeatingField) {
        set(values, repeatingField.key, repeatingValues);
      }

      return new Column(this, values, {});
    });
  }
};
