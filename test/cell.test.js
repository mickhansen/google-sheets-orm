describe('cell', function () {
  before(function () {
    this.orm = new GoogleSheetsORM(gapi.client);
    this.db = this.orm.db('google-sheets-orm-test-cell');

    return this.db.destroy();
  });

  after(function () {
    return this.db.destroy();
  });

  describe('update', function () {
    it('updates an individual cell', async function () {
      const sheet = this.db.sheet('cell-update');
      const value = Math.random().toString();

      let cell = sheet.cell(null, {
        id: 'B2'
      });

      await cell.update(value);

      let raw = await sheet.getRaw();
      expect(raw[1][1]).to.equal(value);

      cell = sheet.cell(null, {
        column: 2,
        row: 2
      });

      await cell.update(value);

      raw = await sheet.getRaw();
      expect(raw).to.deep.equal([
        [],
        ['', value],
        ['', '', value]
      ]);
    });
  });
});
