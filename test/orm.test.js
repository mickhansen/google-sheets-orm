describe('orm', function () {
  describe('search', function () {
    it('queries for databases/files that contain the name', async function () {
      const orm = new GoogleSheetsORM(gapi.client);
      const prefix = `google-sheets-orm-search-test`;

      const dbs = await Promise.all([
        orm.db(prefix+'-'+Math.random().toString()).create(),
        orm.db(prefix+'-'+Math.random().toString()).create(),
        orm.db(prefix+'-'+Math.random().toString()).create(),
        orm.db(Math.random().toString()).create()
      ]);

      try {
        const results = await orm.search(prefix);
        expect(results.length).to.equal(3);
      } finally {
        await Promise.all(dbs.map(db => db.destroy()));
      }
    });
  });
});
