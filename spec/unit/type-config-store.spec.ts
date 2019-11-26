import { expect } from 'chai';
import { TypeConfigStore } from '../../src/api/type-config-store';

describe('TypeConfigStore', function() {
  it('throws if input typeConfigList is invalid', () => {
    [
      { typeConfigList: null },
      { typeConfigList: {} },
      { typeConfigList: [{ typeId: 'correct' }, { typeId: '' }] }
    ].forEach(input => {
      try {
        // @ts-ignore - intential for testing
        new TypeConfigStore(input);
        fail('should throw');
      } catch (e) {
        expect(e).to.be.instanceOf(Error);
      }
    });
  });
  it('throws if input typeConfigList contains duplicates', () => {
    try {
      new TypeConfigStore({
        typeConfigList: [
          {
            typeId: '1'
          },
          {
            typeId: '2'
          },
          {
            typeId: '2'
          }
        ]
      });
      fail('should throw');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });
  it('should store all typeConfigs', () => {
    const store = new TypeConfigStore({
      typeConfigList: [
        {
          typeId: '1'
        },
        {
          typeId: '2',
          deltaChecker: deltaValues => undefined
        },
        {
          typeId: '3'
        }
      ]
    });
    expect(store.typeConfigList).to.have.length(3);
  });
  describe('getTypeConfig', function() {
    const store = new TypeConfigStore({
      typeConfigList: [
        {
          typeId: '1'
        },
        {
          typeId: '2'
        },
        {
          typeId: '3'
        }
      ]
    });

    it('should throw if typeId is invalid', () => {
      [undefined, null, {}, []].forEach(typeId => {
        try {
          // @ts-ignore - intentional for test
          store.getTypeConfig(typeId);
          fail('should throw');
        } catch (e) {
          expect(e).to.be.instanceOf(Error);
        }
      });
    });
    it('should return the correct typeConfig', () => {
      const store = new TypeConfigStore({
        typeConfigList: [
          {
            typeId: '1'
          },
          {
            typeId: '2'
          },
          {
            typeId: '3'
          }
        ]
      });
      expect(store.getTypeConfig('2')).to.have.property('typeId', '2');
    });
  });
});
