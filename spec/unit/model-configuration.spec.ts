import { expect } from 'chai';
import { ModelConfiguration } from '../../src/core/model-configuration';
import { getFieldConfig, getIntentConfig, getTypeConfig } from '../helpers';

describe('ModelConfiguration', function() {
  const getInput = (): ModelConfiguration.ConstructorParams => ({
    modelId: '1',
    fieldConfigList: [getFieldConfig('a'), getFieldConfig('b')],
    intentConfigList: [getIntentConfig()]
  });

  it('throws if input is invalid', () => {
    const inputA = getInput();
    inputA.modelId = null;
    const inputB = getInput();
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
      new ModelConfiguration({
        ...getInput(),
        fieldConfigList: [
          getFieldConfig('a'),
          getFieldConfig('b'),
          getFieldConfig('a')
        ]
      });
      fail('should throw');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });
  it('throws if intentConfigList contains duplicates', () => {
    try {
      new ModelConfiguration({
        ...getInput(),
        intentConfigList: [
          getIntentConfig('x'),
          getIntentConfig('y'),
          getIntentConfig('y')
        ]
      });
      fail('should throw');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });
  it('throws if typeConfigList contains duplicates', () => {
    try {
      new ModelConfiguration({
        ...getInput(),
        typeConfigList: [
          getTypeConfig('A'),
          getTypeConfig('B'),
          getTypeConfig('A')
        ]
      });
      fail('should throw');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });

  it('throws if any intentConfig refers to an unknown field', () => {
    try {
      // @ts-ignore - intential for testing
      new ModelConfiguration({
        ...getInput(),
        typeConfigList: [
          getTypeConfig('A'),
          getTypeConfig('B'),
          getTypeConfig('A')
        ]
      });
      fail('should throw');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });
  it('throws if any fieldConfig refers to an unknown typeId', () => {
    try {
      const input = getInput();
      input.typeConfigList = [getTypeConfig('fooBar')];

      const fieldConfig = getFieldConfig();
      fieldConfig.typeId = 'wubDub';
      input.fieldConfigList = [fieldConfig];
      new ModelConfiguration(input);
      fail('should throw');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });

  it('throws if any intentConfig refers to an unknown fieldId', () => {
    try {
      const input = getInput();
      input.intentConfigList = [getIntentConfig('X', ['fooBar'])];
      input.fieldConfigList = [getFieldConfig('wubDub')];
      new ModelConfiguration(input);
      fail('should throw');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }

    try {
      const input = getInput();
      input.intentConfigList = [getIntentConfig('X', ['foo', ['bar', 'wub']])];
      input.fieldConfigList = [getFieldConfig('foo'), getFieldConfig('bar')];
      new ModelConfiguration(input);
      fail('should throw');
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });

  it('should store all field config items', () => {
    const modelConfiguration = new ModelConfiguration({
      modelId: '1',
      fieldConfigList: [
        getFieldConfig('a'),
        getFieldConfig('b'),
        getFieldConfig('c')
      ],
      intentConfigList: [
        getIntentConfig('x', ['a', 'b']),
        getIntentConfig('y', ['c'])
      ]
    });
    expect(modelConfiguration.fieldConfigList).to.have.length(3);
  });
  it('should store all intent config items', () => {
    const modelConfiguration = new ModelConfiguration({
      modelId: '1',
      fieldConfigList: [
        getFieldConfig('a'),
        getFieldConfig('b'),
        getFieldConfig('c')
      ],
      intentConfigList: [
        getIntentConfig('x', ['a', 'b']),
        getIntentConfig('y', ['c'])
      ]
    });
    expect(modelConfiguration.intentConfigList).to.have.length(2);
  });
});
