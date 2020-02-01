describe('db', function () {
  it('creates db as a google spreadsheet', function () {
    this.timeout(30000);

    const orm = new GoogleSheetsORM(gapi.client);
    const db = orm.db('google-sheets-orm-test-'+Math.random().toString());

    return db.create().then(function () {
      return db.destroy();
    });
  });
});
