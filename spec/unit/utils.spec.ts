import { expect } from 'chai';
import {
  performCustomDeltaCheck,
  defaultDeltaCheck
} from '../../src/utils/delta-checkers';
import { ObjectHasher } from '../../src/interfaces/hasher-types';

describe('utils', function() {
  describe('defaultDeltaCheck', function() {
    it('should return undefined on shallow match', () => {
      expect(defaultDeltaCheck({ existingValue: 0, modifiedValue: 0 })).to.be
        .undefined;
      expect(defaultDeltaCheck({ existingValue: false, modifiedValue: false }))
        .to.be.undefined;
      expect(
        defaultDeltaCheck({
          existingValue: undefined,
          modifiedValue: undefined
        })
      ).to.be.undefined;
      expect(defaultDeltaCheck({ existingValue: 'Foo', modifiedValue: 'Foo' }))
        .to.be.undefined;
      expect(
        defaultDeltaCheck({
          existingValue: { id: 1 },
          modifiedValue: { id: 1 }
        })
      ).to.be.undefined;
      const foo = new (class Foo {
        baz: true;
      })();
      expect(
        defaultDeltaCheck({
          existingValue: foo,
          modifiedValue: foo
        })
      ).to.be.undefined;
    });
    it('should return delta on primitives', () => {
      [
        [0, 1],
        [false, true],
        ['Foo', 'Bar'],
        [1, null]
      ].forEach(_test => {
        expect(
          defaultDeltaCheck({
            existingValue: _test[0],
            modifiedValue: _test[1]
          })
        ).to.deep.equal(_test);
      });
    });
    it('should return delta on array', () => {
      [
        [
          [0, 1, 2],
          [0, 1, 2, 3],
          {
            '3': [3],
            _t: 'a'
          }
        ],
        [
          [{ id: 1 }, { id: 2 }],
          [{ id: 1 }],
          {
            _t: 'a',
            _1: [
              {
                id: 2
              },
              0,
              0
            ]
          }
        ]
      ].forEach(_test => {
        expect(
          defaultDeltaCheck({
            existingValue: _test[0],
            modifiedValue: _test[1]
          })
        ).to.deep.equal(_test[2]);
      });
    });

    it('should use object hasher on array if provided', () => {
      let hasherCalled = false;
      const objectHasher: ObjectHasher = object => {
        hasherCalled = true;
        return object.id;
      };

      class Car {
        id: string;

        colour: string;
      }

      const carA = new Car();
      carA.id = '1';
      carA.colour = 'red';

      const carB = new Car();
      carB.id = '2';
      carB.colour = 'green';

      const carAX = new Car();
      carAX.id = '1';
      carAX.colour = 'red';

      const carBX = new Car();
      carBX.id = '2';
      carBX.colour = 'green';

      const delta = defaultDeltaCheck(
        {
          existingValue: [carA, carB],
          modifiedValue: [carAX, carBX]
        },
        { differOptions: { objectHasher } }
      );
      expect(hasherCalled).to.equal(true);
      expect(delta).to.be.undefined;
    });

    it('should use object hasher on object if provided', () => {
      let hasherCalled = false;
      const objectHasher: ObjectHasher = object => {
        hasherCalled = true;
        return object.id;
      };

      class Person {
        id: string;

        name: string;

        title: string;
      }

      const person = new Person();
      person.id = '1';
      person.name = 'Omair Vaiyani';
      person.title = 'Medical Student';

      const personX = new Person();
      personX.id = '1';
      personX.name = 'Omair Vaiyani';
      personX.title = 'Doctor';

      const delta = defaultDeltaCheck(
        {
          existingValue: person,
          modifiedValue: personX
        },
        { differOptions: { objectHasher } }
      );
      expect(hasherCalled).to.equal(true);
      expect(delta).to.deep.equal(undefined);
    });

    it('should not use object hasher on undefined objects', () => {
      let hasherCalled = 0;
      const objectHasher: ObjectHasher = object => {
        hasherCalled++;
        return object.id;
      };

      defaultDeltaCheck(
        {
          existingValue: undefined,
          modifiedValue: {
            id: 1,
            label: 'Foo'
          }
        },
        { differOptions: { objectHasher } }
      );
      expect(hasherCalled).to.equal(1);

      hasherCalled = 0;
      defaultDeltaCheck(
        {
          existingValue: {
            id: 1,
            label: 'Foo'
          },
          modifiedValue: null
        },
        { differOptions: { objectHasher } }
      );
      expect(hasherCalled).to.equal(1);
    });

    it('should not use object hasher on undefined objects in array', () => {
      let hasherCalled = 0;
      const objectHasher: ObjectHasher = object => {
        hasherCalled++;
        return object.id;
      };

      defaultDeltaCheck(
        {
          existingValue: [
            {
              id: 1,
              label: 'Foo'
            },
            undefined
          ],
          modifiedValue: [
            {
              id: 1,
              label: 'Foo'
            },
            {
              id: 2,
              label: 'Foo'
            }
          ]
        },
        { differOptions: { objectHasher } }
      );
      expect(hasherCalled).to.equal(2);
    });
  });
  describe('performCustomDeltaCheck', function() {
    it('throws if the delta gives an unspported falsy value', done => {
      try {
        performCustomDeltaCheck(
          {
            existingValue: '',
            modifiedValue: ''
          },
          () => {
            // intentional mistype
            return false as any;
          }
        );
        fail('should throw');
      } catch (e) {
        done();
      }
    });
    it('should return the exact delta', () => {
      const delta = [0, 1];
      expect(
        performCustomDeltaCheck(
          {
            existingValue: '',
            modifiedValue: ''
          },
          () => delta
        )
      ).to.equal(delta);
    });
  });
});
