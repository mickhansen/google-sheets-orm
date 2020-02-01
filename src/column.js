import assign from 'lodash/assign';
import each from 'lodash/each';
import isFunction from 'lodash/isFunction';

import ValueSet from './valueset';

export default class Column extends ValueSet {
  constructor(table, values, options = {}) {
    super(table, values, options);
    Object.defineProperty(this, 'column', { value: options.column || null, enumerable: false, writable: true });
  }

  validate() {

  }
}
