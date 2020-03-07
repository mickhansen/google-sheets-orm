describe('util', function () {
  describe('numberToColumnLetter', function () {
    const check = {
      0: 'A',
      2: 'C',
      18: 'S',
      25: 'Z',
      26: 'AA',
      44: 'AS',
      51: 'AZ',
      52: 'BA',
      77: 'BZ',
      78: 'CA',
      80: 'CC',
      104: 'DA',
      130: 'EA',
      140: 'EK',
      147: 'ER'
    };

    Object.keys(check).forEach(number => {
      it(`${number} = ${check[number]}`, async function () {
        expect(GoogleSheetsORM.utils.numberToColumnLetter(parseInt(number, 10))).to.equal(check[number]);
      });
    });
  });
});
