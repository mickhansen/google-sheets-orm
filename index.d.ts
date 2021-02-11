/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable max-classes-per-file */
declare module "google-sheets-orm" {
    import { sheets_v4 } from "googleapis"

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
        found: Promise<this> | null;
        id: string;
        sheets: Record<string, sheets_v4.Schema$AddSheetResponse>;
        find(): Promise<this>;
        create(): Promise<this>;
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

    function numberToColumnLetter(number: number): string;
    // function processResponse<T>(response: { data: T }): T;
    // function processResponse<T>(response: { result: T }): T;
    // function processResponse<T>(response: T): T;
    class ValueSetExistsError extends Error {
        constructor(message?: string | undefined);
    }
    class RowExistsError extends ValueSetExistsError {
        constructor(message?: string);
        name: "RowExistsError";
    }
    class ColumnExistsError extends ValueSetExistsError {
        constructor(message?: string);
        name: "ColumnExistsError";
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
        constructor(sheet: Sheet, value: string, options?: CellOptions);
        value: string;
        id: string;
        update(value: string): this;
    }
    class ValueSet<K> {
        constructor(table: Table, values: Record<K, string>, options?: {});
        set(values: Record<K, string>): this;
        defaults(): void;
        validate(): void;
        [s: string]: any;
    }
    class Column<K> extends ValueSet<K> {
        constructor(
            table: ColumnTable,
            values: Record<K, string>,
            options?: {}
        );
    }
    class Row<K> extends ValueSet<K> {
        constructor(table: RowTable, values: Record<K, string>, options?: {});
        update(values: Record<K, string>): Promise<this>;
    }
    class Sheet {
        constructor(db: DB, name: string, options = {});
        orm: ORM;
        name: string;
        db: DB;
        id(): number | null;
        create(): Promise<sheets_v4.Schema$BatchUpdateSpreadsheetResponse>;
        getRaw(
            majorDimension: TableMode = "ROW"
        ): sheets_v4.Schema$ValueRange["values"];
        cell(value: string, options?: CellOptions): Cell;
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
    type TableFields = Record<string, TableField>;
    type QueryValue<T> = Record<keyof T, string>;
    type QueryResponce<T> = ValueSet<keyof T>;
    class Table<T = TableFields> extends Sheet {
        constructor(db: DB, name: string, fields: T, options?: TableOptions);
        mode: TableMode;
        insertOrder: InsertOrder;
        fields: T;
        pk: string;
        skipRows: number;
        skipColumns: number;
        skip: number;
        ddlSynced: Promise<any> | null;
        insert(values: QueryValue<T>): Promise<QueryResponce<T>>;
        insert(values: QueryValue<T>[]): Promise<QueryResponce<T>[]>;
        upsert(values: QueryValue<T>): Promise<QueryResponce<T>>;
        findByPk(search: string): Promise<ValueSet<keyof T>>;
        findAll(): Promise<QueryResponce<T>[]>;
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
        firstField: string;
        lastField: string;
        columns(): { letter: string; field: TableField }[];
    }
    class ColumnTable extends Table {
        valueSetClass: typeof Column;
        ddl(): any;
        firstField?: string;
        lastField?: string;
    }
    export type {
        Cell,
        CellOptions,
        Column,
        ColumnTable,
        DB,
        DBOptions,
        InsertOrder,
        QueryResponce,
        QueryValue,
        Row,
        RowTable,
        RowTableOptions,
        Sheet,
        Table,
        TableField,
        TableFields,
        TableMode,
        TableOptions,
        ValueSet,
    };
}
