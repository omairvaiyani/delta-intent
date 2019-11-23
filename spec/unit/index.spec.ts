import { expect } from 'chai';
import { ModelConfiguration } from '../../src/api/model-configuration';
import { IntentId, FieldId, TypeId } from '../../src/interfaces/base-types';
import { IFieldConfig } from '../../src/interfaces/field-config-types';
import { IIntentConfig } from '../../src/interfaces/intent-config-types';
import { ITypeConfig } from '../../src/interfaces/custom-types';
import { TypeConfigStore } from '../../src/api/type-config-store';

describe('ModelConfiguration', function() {
  const getValidFieldConfig = (fieldId?: FieldId): IFieldConfig => ({
    fieldId: fieldId || 'a'
  });
  const getValidIntentConfig = (
    intentId?: IntentId,
    fieldIds?: FieldId[]
  ): IIntentConfig => ({
    intentId: intentId || '1',
    isCreate: true,
    matchConfig: {
      items: fieldIds
        ? fieldIds.map(fieldId => ({
            fieldMatch: fieldId,
            deltaMatch: { deltaCheck: true }
          }))
        : [{ fieldMatch: 'a', deltaMatch: { deltaCheck: true } }]
    }
  });
  const getValidTypeConfig = (typeId?: TypeId): ITypeConfig => ({
    typeId: typeId || 'CustomA',
    objectHasher: a => a
  });
  const getValidInput = () => ({
    modelId: '1',
    fieldConfigList: [getValidFieldConfig('a'), getValidFieldConfig('b')],
    intentConfigList: [getValidIntentConfig()]
  });

  it('throws if input is invalid', () => {
    const inputA = getValidInput();
    inputA.modelId = null;
    const inputB = getValidInput();
    inputB.modelId = undefined;

    [undefined, null, {}, [], inputA, inputB].forEach(input => {
      try {
        // @ts-ignore - intential for testing
        new ModelConfiguration(input);
        fail('should throw');
      } catch (e) {
        expect(e).to.be.instanceOf(Error);
      }
    });
  });
  it('throws if fieldConfigList contains duplicates', () => {
    try {
      // @ts-ignore - intential for testing
      new ModelConfiguration({
        ...getValidInput(),
        fieldConfigList: [
          getValidFieldConfig('a'),
          getValidFieldConfig('b'),
          getValidFieldConfig('a')
        ]
      });
      fail('should throw');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });
  it('throws if intentConfigList contains duplicates', () => {
    try {
      // @ts-ignore - intential for testing
      new ModelConfiguration({
        ...getValidInput(),
        intentConfigList: [
          getValidIntentConfig('x'),
          getValidIntentConfig('y'),
          getValidIntentConfig('y')
        ]
      });
      fail('should throw');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });
  it('throws if typeConfigList contains duplicates', () => {
    try {
      // @ts-ignore - intential for testing
      new ModelConfiguration({
        ...getValidInput(),
        typeConfigList: [
          getValidTypeConfig('A'),
          getValidTypeConfig('B'),
          getValidTypeConfig('A')
        ]
      });
      fail('should throw');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });

  it('throws if any intentConfig refers to an unknown field');
  it('throws if any fieldConfig refers to an unknown typeId');

  it('should store all field config items', () => {
    const modelConfiguration = new ModelConfiguration({
      modelId: '1',
      fieldConfigList: [
        getValidFieldConfig('a'),
        getValidFieldConfig('b'),
        getValidFieldConfig('c')
      ],
      intentConfigList: [
        getValidIntentConfig('x', ['a', 'b']),
        getValidIntentConfig('y', ['c'])
      ]
    });
    expect(modelConfiguration.fieldConfigList).to.have.length(3);
  });
  it('should store all intent config items', () => {
    const modelConfiguration = new ModelConfiguration({
      modelId: '1',
      fieldConfigList: [
        getValidFieldConfig('a'),
        getValidFieldConfig('b'),
        getValidFieldConfig('c')
      ],
      intentConfigList: [
        getValidIntentConfig('x', ['a', 'b']),
        getValidIntentConfig('y', ['c'])
      ]
    });
    expect(modelConfiguration.intentConfigList).to.have.length(2);
  });
});

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
