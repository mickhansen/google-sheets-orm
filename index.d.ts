function numberToColumnLetter(number: number): string;
function processResponse(response: any): any;
class ValueSetExistsError extends Error {
    constructor(message?: string | undefined);
}
class RowExistsError extends ValueSetExistsError {
    constructor(message: any);
    name = "RowExistsError";
}
class ColumnExistsError extends ValueSetExistsError {
    constructor(message: any);
    name = "ColumnExistsError";
}
type ROW = "ROW";
type COLUMN = "COLUMN";
type PREPEND = "PREPEND";
type APPEND = "APPEND";
type TableMode = ROW | COLUMN;
type InsertOrder = PREPEND | APPEND;

type CellOptions = {
    id?: string;
    row?: number;
    column?: number;
};
class Cell {
    constructor(sheet: Sheet, value: any, options?: CellOptions);
    value: any;
    id: string;
    update(value: any): this;
}
class ValueSet {
    constructor(table: Table, values: any, options?: {});
    set(values: any): ValueSet;
    defaults(): void;
    validate(): void;
}
class Column extends ValueSet {
    constructor(table: any, values: any, options?: {});
}
class Row extends ValueSet {
    constructor(table: any, values: any, options?: {});
    update(values: any): any;
}
class Sheet {
    constructor(db: DB, name: string, options?: {});
    orm: ORM;
    name: string;
    db: DB;
    _create: any;
    id(): number | null;
    create(): any;
    getRaw(majorDimension?: string): any;
    cell(...args: any[]): Cell;
}
type TableOptions = {
    mode?: TableMode;
    insertOrder?: InsertOrder;
    skipRows?: number;
    skipColumns?: number;
};
type TableField = {
    required?: boolean;
    primaryKey?: boolean;
    header?: string;
    key?: string;
    defaultValue?: string | (() => string);
};
type TableFields = { [s: string]: TableField };
class Table extends Sheet {
    constructor(
        db: DB,
        name: string,
        fields: TableFields,
        options?: TableOptions
    );
    mode: TableMode;
    insertOrder: InsertOrder;
    fields: any;
    pk: any;
    skipRows: number;
    skipColumns: number;
    skip: number;
    ddlSynced: any;
    insert(values: any): any;
    upsert(values: any): any;
    findByPk(search: any): any;
    findAll(): any;
    _prepareValues(values: any): any;
    _prepareColumnValues(values: any, fields: any): any;
    _prepareRowRange(index: any): string;
    _prepareColumnRange(firstRow: any, lastRow: any): string;
}

type RowTableOptions = {
    headerRow?: number;
} & TableOptions;

class RowTable extends Table {
    constructor(
        db: DB,
        name: string,
        fields: TableFields,
        options?: RowTableOptions
    );
    valueSetClass: typeof Row;
    headerRow: number;
    ddl(): any;
    _sheetHeaders: any;
    firstField: any;
    lastField: any;
    columns(): { letter: string; field: TableField }[];
}
class ColumnTable extends Table {
    valueSetClass: typeof Column;
    ddl(): any;
    firstField?: string;
    lastField?: string;
}

declare module "google-sheets-orm" {
    export default ORM;
    class ORM {
        static DISCOVERY_DOCS: string[];
        static SCOPES: string;
        static ROW: string;
        static COLUMN: string;
        static PREPEND: string;
        static APPEND: string;
        constructor(gapiClient: typeof gapi.client);
        client: typeof gapi.client;
        drive: typeof gapi.client.drive;
        sheets: typeof gapi.client.sheets;
        db(name: DBOptions): DB;
        search(query: string): DB[];
    }
    namespace ORM {
        export { RowExistsError };
        export { ColumnExistsError };
        export namespace utils {
            export { numberToColumnLetter };
        }
    }
    type DBOptions = string | { name?: string; id?: string };
    class DB {
        constructor(orm: ORM, value: DBOptions);
        orm: ORM;
        name: string;
        created: Promise<this> | null;
        found: Promise<any> | null;
        id: string;
        sheets: {};
        find(): Promise<any>;
        create(): Promise<DB>;
        destroy(): Promise<void>;
        sheet(name: string /* , options: {} */): Sheet;
        table(
            name: string,
            fields: TableFields,
            options?: RowTableOptions
        ): RowTable;
        table(
            name: string,
            fields: TableFields,
            options?: TableOptions & { mode: COLUMN }
        ): ColumnTable;
    }
}
