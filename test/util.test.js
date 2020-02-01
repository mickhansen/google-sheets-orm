describe('util', function () {
  describe('numberToColumnLetter', function () {
    const check = {
      0: 'A',
      2: 'C',
      18: 'S',
      25: 'Z',
      26: 'BA',
      44: 'BS',
      51: 'BZ',
      52: 'CA',
      77: 'CZ',
      78: 'DA',
      80: 'DC',
      104: 'EA'
    };

    Object.keys(check).forEach(number => {
      it(`${number} = ${check[number]}`, async function () {
        expect(GoogleSheetsORM.utils.numberToColumnLetter(parseInt(number, 10))).to.equal(check[number]);
      });
    });
  });
});
