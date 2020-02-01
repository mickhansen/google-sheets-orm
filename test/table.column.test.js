function makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

describe('table (column)', function () {
  before(function () {
    this.orm = new GoogleSheetsORM(gapi.client);
    this.db = this.orm.db('google-sheets-orm-test-table-column');

    //return this.db.destroy();
  });

  after(function () {
    //return this.db.destroy();
  });

  describe('insert', function () {
    it('supports default values', function () {
      this.timeout(30000);

      const table = this.db.table('insert-defaults', {
        id: {
          primaryKey: true,
          defaultValue: () => Math.random().toString()
        }
      }, {
        mode: GoogleSheetsORM.COLUMN,
        insertOrder: GoogleSheetsORM.PREPEND
      });

      return table.insert({}).then(function (column) {
        expect(column.id).to.be.a('string');
      });
    });

    it.skip('supports appending rows', async function () {
      this.timeout(30000);

      const table = this.db.table('insert-append', {
        id: {
          primaryKey: true,
          defaultValue: () => Math.random().toString()
        },
        dummy: {
          defaultValue: function () {
            return this.id + 'dummy';
          }
        }
      }, {
        mode: GoogleSheetsORM.COLUMN,
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
        ['a', 'b', 'c'],
        ['adummy', 'bdummy', 'cdummy']
      ]);
    });

    it('supports prepending rows', async function () {
      this.timeout(30000);

      const table = this.db.table('insert-prepend', {
        id: {
          primaryKey: true,
          defaultValue: () => Math.random().toString()
        },
        dummy: {
          defaultValue: function () {
            return this.id + 'dummy';
          }
        }
      }, {
        mode: GoogleSheetsORM.COLUMN,
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
        ['c', 'b', 'a'],
        ['cdummy', 'bdummy', 'adummy']
      ]);
    });

    it('throws if pk already exists', async function () {
      this.timeout(30000);

      const table = this.db.table('insert-pk-exists', {
        id: {
          primaryKey: true
        },
        bla: {},
        que: {}
      }, {
        mode: GoogleSheetsORM.COLUMN,
        insertOrder: GoogleSheetsORM.PREPEND
      });

      await table.insert({
        id: 'abc',
        bla: Math.random().toString(),
        que: Math.random().toString()
      });

      const error = await table.insert({
        id: 'abc',
        bla: Math.random().toString(),
        que: Math.random().toString()
      }).catch(error => error);

      expect(error).to.be.an.instanceOf(GoogleSheetsORM.ColumnExistsError);
    });
  });

  describe('findByPk', function () {
    it('retrieves column', async function () {
      const table = this.db.table(makeid(10), {
        date: {
          primaryKey: true
        },
        calories: {
          type: Number
        }
      }, {
        mode: GoogleSheetsORM.COLUMN,
        insertOrder: GoogleSheetsORM.PREPEND
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
    it('retrieves all columns', async function () {
      const table = this.db.table(makeid(10), {
        date: {
          primaryKey: true
        },
        calories: {
          type: Number
        }
      }, {
        mode: GoogleSheetsORM.COLUMN,
        insertOrder: GoogleSheetsORM.PREPEND,
        skipColumns: 1
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
        majorDimension: "ROWS"
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

      await table.insert(values[3]);
      await table.insert(values[2]);
      await table.insert(values[1]);
      await table.insert(values[0]);

      const rows = await table.findAll();
      expect(rows).to.have.length(values.length);

      expect(rows[0]).to.deep.equal(values[0]);
      expect(rows[1]).to.deep.equal(values[1]);
      expect(rows[2]).to.deep.equal(values[2]);
      expect(rows[3]).to.deep.equal(values[3]);
    });
  });

  describe('advanced ddl', function () {
    it('supports nested values', async function () {
      const table = this.db.table('advanced-ddl-nested-values', {
        id: {
          primaryKey: true,
          defaultValue: () => Math.random().toString()
        },
        t1: {
          type: {
            weight: {
              type: Number
            },
            reps: {
              type: Array(Number)
            }
          }
        },
        t2: {
          type: {
            weight: {
              type: Number
            },
            reps: {
              type: Array(Number)
            }
          }
        }
      }, {
        mode: GoogleSheetsORM.COLUMN,
        insertOrder: GoogleSheetsORM.PREPEND
      });

      const column = await table.insert({
        t1: {
          weight: 120,
          reps: [5, 1, 1, 1, 1, 1]
        },
        t2: {
          weight: 60,
          reps: [8, 4, 4, 4, 4]
        }
      });

      console.log(column);

      console.log(await table.findByPk(column.id));
    });
  });
});
