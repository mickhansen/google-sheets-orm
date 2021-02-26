import ValueSet from './valueset';
import Cell from './cell';

export default class Document extends ValueSet {
  constructor(type, values, options = {}) {
    super(type.table, values, options);
    this.type = type.name; 
  }

  validate() {
    
  }
}

export class DocumentValue {

}