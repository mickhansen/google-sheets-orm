describe('db', function () {
  it('creates db as a google spreadsheet', function () {
    this.timeout(30000);

    const orm = new GoogleSheetsORM(gapi.client);
    const db = orm.db('google-sheets-orm-test-'+Math.random().toString());

    return db.create().then(function () {
      return db.destroy();
    });
  });

  it('finds existing database', function () {
    this.timeout(30000);

    const orm = new GoogleSheetsORM(gapi.client);
    const name = 'google-sheets-orm-test-'+Math.random().toString();

    const dbA = orm.db(name);
    const dbB = orm.db(name);

    return dbA.create().then(function () {
      return dbB.find().then(function () {
        expect(dbA.id).to.equal(dbB.id);
      });
    }).then(function () {
      return dbB.create().then(function () {
        expect(dbA.id).to.equal(dbB.id);
      });
    });
  });
});
