describe('db', function () {
  it('creates db as a google spreadsheet', function () {
    this.timeout(30000);

    const orm = new GoogleSheetsORM(gapi.client);
    const db = orm.db('google-sheets-orm-test-'+Math.random().toString());

    return db.create().then(function () {
      return db.destroy();
    });
  });

  it('finds existing database via name or id', function () {
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
    }).then(() => {
      const dbC = orm.db({
        id: dbA.id
      });

      return dbC.find().then(function () {
        expect(dbC.name).to.equal(dbA.name);
        expect(dbC.id).to.equal(dbA.id);
        expect(dbC.found).to.be.ok;
        expect(dbC.sheets).to.be.ok;
      });
    });
  });
});
