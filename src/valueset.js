import assign from 'lodash/assign';
import each from 'lodash/each';
import isFunction from 'lodash/isFunction';

export default class ValueSet {
  constructor(table, values, options = {}) {
    assign(this, values || {});

    Object.defineProperty(this, 'table', { value: table, enumerable: false });
    Object.defineProperty(this, 'db', { value: table.db, enumerable: false });
    Object.defineProperty(this, 'orm', { value: table.orm, enumerable: false });
  }

  defaults() {
    each(this.table.fields, (field) => {
      if (field.defaultValue !== undefined && this[field.header || field.key] === undefined) {
        this[field.header || field.key] = isFunction(field.defaultValue) ? field.defaultValue.call(this) : field.defaultValue;
      }
    });
  }

  validate() {
    each(this.table.fields, (field) => {
      if (field.required && !this[field.header || field.key]) throw new Error(`field ${field.header || field.key} is required`);
    });
  }
}
