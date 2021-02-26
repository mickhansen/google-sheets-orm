describe('table (document)', function () {
  before(async function () {
    this.orm = new GoogleSheetsORM(gapi.client);
    this.db = this.orm.db('google-sheets-orm-test-table-document');

    await this.db.destroy().catch(function () {

    });
    await this.db.create().catch(function () {

    });
  });

  after(async function () {
    await this.db.destroy().catch(function () {

    });
  });

  describe('insert', function () {
    it('supports appending rows', async function () {
      this.timeout(30000);

      const table = this.db.table('insert-append', {
        date: {
          type: String,
          primaryKey: true,
          required: true
        },
      }, {
        mode: GoogleSheetsORM.DOCUMENT,
        insertOrder: GoogleSheetsORM.APPEND
      });

      const tdee = table.type('tdee', {
        weight: {
          type: Number
        },
        calories: {
          type: Number
        }
      });

      const running = table.type('running', {
        distance: {
          type: Number
        },
        time: {
          type: Number
        }
      });

      const tdeeA = await tdee.insert({
        date: '2020-10-10',
        weight: 120.3,
        calories: 3000
      });
      const tdeeB = await tdee.insert({
        date: '2020-10-11',
        weight: 120.4,
        calories: 3500
      });
      const tdeeC = await running.insert({
        date: '2020-10-10',
        distance: 15.4,
        time: 94 / 60 / 24
      });
      
      const raw = await table.getRaw();
      expect(raw).to.deep.equal([
        ["type", "date", "weight", "calories"],
        ["tdee", "2020-10-10", "120.3", "3000"],
        ["type", "date", "weight", "calories"],
        ["tdee", "2020-10-11", "120.4", "3500"],
        ["type", "date", "distance", "time"],
        ["running", "2020-10-10", "15.4", "0.06527777778"]
      ]);
    });
  });
});