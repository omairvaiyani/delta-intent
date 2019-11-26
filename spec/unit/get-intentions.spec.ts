import Joi from '@hapi/joi';
import { expect } from 'chai';
import { getIntentions } from '../../src/api/get-intentions';
import { ModelConfiguration } from '../../src/api/model-configuration';
import { getFieldConfig, getIntentConfig, getTypeConfig } from '../helpers';
import { profile, purchaseOrder } from './fixtures';
import { TypeConfigStore } from '../../src/api/type-config-store';
import { safeId } from '../../src/utils/common';
import { GetIntentionsResponse_S } from '../../src/interfaces/get-intentions-types';

describe('getIntentions', function() {
  const getMCInput = () => ({
    modelId: 'ModelS',
    typeConfigList: [getTypeConfig('TypeA')],
    fieldConfigList: [
      {
        ...getFieldConfig('fieldA'),
        typeId: 'TypeA'
      },
      getFieldConfig('fieldB')
    ],
    intentConfigList: [getIntentConfig('IntentX', ['fieldA', 'fieldB'])]
  });
  const getModelConfiguration = () => new ModelConfiguration(getMCInput());

  const getValidInput = () => ({
    existingState: {
      name: 'Dave Downer',
      position: 'VP of QA'
    },
    modifiedState: {
      name: 'Dave Downer',
      position: 'Janitor'
    }
  });
  it('should throw if given a non ModelConfiguration instance', () => {
    try {
      getIntentions({} as ModelConfiguration, getValidInput());
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });
  it('should throw without a valid input', () => {
    try {
      getIntentions({} as ModelConfiguration, getValidInput());
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
    }
  });
  it('should return a valid structured response', () => {
    const response = getIntentions(getModelConfiguration(), getValidInput());
    const { error } = Joi.validate(response, GetIntentionsResponse_S);
    expect(error).to.not.be.ok;
  });

  const fixtures = [profile, purchaseOrder];
  fixtures.forEach(fixture => {
    let typeConfigStore: TypeConfigStore;
    let modelConfiguration: ModelConfiguration;

    describe(`Fixture ${safeId(
      fixture.modelConfiguration.modelId
    )}`, function() {
      beforeAll(function() {
        try {
          if (fixture.typeConfigList) {
            typeConfigStore = new TypeConfigStore({
              typeConfigList: fixture.typeConfigList
            });
          }

          modelConfiguration = new ModelConfiguration({
            ...fixture.modelConfiguration,
            typeConfigStore
          });
        } catch (e) {
          console.error(e);
          throw new Error(`Fixture setup failed`);
        }
      });

      fixture.scenarios.forEach((scenario, index) => {
        const [expectedIntentIds, input, extra = {}] = scenario;
        it(`Scenario ${index}${
          extra.description ? ` ${extra.description}` : ''
        }`, () => {
          const runScenario = () =>
            getIntentions(modelConfiguration, input, {
              verbose: false
            });
          if (extra.error) {
            const { code, message, info } = extra.error;

            try {
              runScenario();
              fail(`expected to throw with code: ${code}`);
            } catch (e) {
              if (code !== null) {
                expect(e.code).to.equal(code);
              }
              if (message !== null) {
                expect(e.message).to.equal(message);
              }
              if (info) {
                expect(e.info).to.deep.equal(info);
              }
            }
          } else {
            expect(runScenario().intentIds.sort()).to.deep.equal(
              expectedIntentIds.sort()
            );
          }
        });
      });
    });
  });
});
