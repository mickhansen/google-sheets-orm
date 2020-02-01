function makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

describe('table (row)', function () {
  before(function () {
    this.orm = new GoogleSheetsORM(gapi.client);
    this.db = this.orm.db('google-sheets-orm-test-table-row');

    return this.db.destroy();
  });

  after(function () {
    return this.db.destroy();
  });

  it('creates table as a sheet inside a google spreadsheet', function () {
    this.timeout(30000);

    const table = this.db.table(makeid(10), {
      id: {
        primaryKey: true,
        defaultValue: () => Math.random().toString()
      }
    }, {
      mode: GoogleSheetsORM.ROW
    });

    return table.ddl();
  });

  describe('insert', function () {
    it('supports default values', function () {
      this.timeout(30000);

      const table = this.db.table(makeid(10), {
        id: {
          primaryKey: true,
          defaultValue: () => Math.random().toString()
        }
      }, {
        mode: GoogleSheetsORM.ROW
      });

      return table.insert({}).then(function (row) {
        expect(row.id).to.be.a('string');
      });
    });

    it('supports appending rows', async function () {
      this.timeout(30000);

      const table = this.db.table('insert-append', {
        id: {
          primaryKey: true,
          defaultValue: () => Math.random().toString()
        }
      }, {
        mode: GoogleSheetsORM.ROW,
        insertOrder: GoogleSheetsORM.APPEND
      });

      await table.insert({
        id: 'a'
      });
      await table.insert({
        id: 'b'
      });
      await table.insert({
        id: 'c'
      });

      expect(await table.getRaw()).to.deep.equal([
        ['id'],
        ['a'],
        ['b'],
        ['c']
      ]);
    });

    it('supports prepending rows', async function () {
      this.timeout(30000);

      const table = this.db.table('insert-prepend', {
        id: {
          primaryKey: true,
          defaultValue: () => Math.random().toString()
        }
      }, {
        mode: GoogleSheetsORM.ROW,
        insertOrder: GoogleSheetsORM.PREPEND
      });

      await table.insert({
        id: 'a'
      });
      await table.insert({
        id: 'b'
      });
      await table.insert({
        id: 'c'
      });

      expect(await table.getRaw()).to.deep.equal([
        ['id'],
        ['c'],
        ['b'],
        ['a']
      ]);
    });

    it('throws if pk already exists', async function () {
      this.timeout(30000);

      const table = this.db.table(makeid(10), {
        id: {
          primaryKey: true
        },
        bla: {},
        que: {}
      }, {
        mode: GoogleSheetsORM.ROW
      });

      await table.insert({
        id: 'abc'
      });

      const error = await table.insert({
        id: 'abc'
      }).catch(error => error);

      expect(error).to.be.an.instanceOf(GoogleSheetsORM.RowExistsError);
    });

    it('throws if required field is missing', async function () {
      const table = this.db.table(makeid(10), {
        id: {
          primaryKey: true,
          defaultValue: () => Math.random().toString()
        },
        bla: {
          required: true
        }
      }, {
        mode: GoogleSheetsORM.ROW
      });

      expect(() => table.insert({
        id: 'abc'
      })).to.throw('field bla is required');
    });
  });

  describe('upsert', function () {
    it('creates row or finds/updated it', async function () {
      this.timeout(30000);

      const id = Math.random().toString();
      const table = this.db.table('upsert', {
        id: {
          primaryKey: true
        },
        value: {
          type: Number,
          required: true
        }
      }, {
        mode: GoogleSheetsORM.ROW
      });

      const a = await table.upsert({
        id,
        value: 1
      });
      expect(a.value).to.equal(1);
      expect(await table.getRaw()).to.deep.equal([
        ['id', 'value'],
        [id, '1']
      ]);

      const b = await table.upsert({
        id,
        value: 2
      });
      expect(b.value).to.equal(2);
      expect(await table.getRaw()).to.deep.equal([
        ['id', 'value'],
        [id, '2']
      ]);
    });
  });

  describe('findByPk', function () {
    it('retrieves row', async function () {
      const table = this.db.table(makeid(10), {
        date: {
          primaryKey: true
        },
        calories: {
          type: Number
        }
      }, {
        mode: GoogleSheetsORM.ROW
      });

      const values = {
        date: moment().format('YYYY-MM-DD'),
        calories: 3012
      };

      await table.ddl();

      await table.insert({
        date: moment().subtract(1, 'day').format('YYYY-MM-DD'),
        calories: Math.ceil(Math.random() * 8000)
      });
      await table.insert(values);

      expect(await table.findByPk(moment().add(1, 'day').format('YYYY-MM-DD'))).to.equal(null);
      const found = await table.findByPk(values.date);
      expect(found.calories).to.equal(values.calories);
    });
  });

  describe('findAll', function () {
    it('retrieves all rows', async function () {
      const table = this.db.table(makeid(10), {
        date: {
          primaryKey: true
        },
        calories: {
          type: Number
        }
      }, {
        mode: GoogleSheetsORM.ROW
      });

      await table.create();

      await this.db.orm.sheets.spreadsheets.values.update({
        spreadsheetId: this.db.id,
        range: `${table.name}!A1:A1`,
        valueInputOption: 'RAW'
      }, {
        values: [
          ['pk']
        ],
        majorDimension: "COLUMNS"
      });


      const values = [
        {
          date: moment().subtract(3, 'day').format('YYYY-MM-DD'),
          calories: Math.ceil(Math.random() * 8000)
        },
        {
          date: moment().subtract(2, 'day').format('YYYY-MM-DD'),
          calories: Math.ceil(Math.random() * 8000)
        },
        {
          date: moment().subtract(1, 'day').format('YYYY-MM-DD'),
          calories: Math.ceil(Math.random() * 8000)
        },
        {
          date: moment().format('YYYY-MM-DD'),
          calories: Math.ceil(Math.random() * 8000)
        }
      ];

      await table.insert(values[0]);
      await table.insert(values[1]);
      await table.insert(values[2]);
      await table.insert(values[3]);

      const rows = await table.findAll();
      expect(rows).to.have.length(values.length);

      expect(rows[0]).to.deep.equal(values[0]);
      expect(rows[1]).to.deep.equal(values[1]);
      expect(rows[2]).to.deep.equal(values[2]);
      expect(rows[3]).to.deep.equal(values[3]);
    });
  });
});
