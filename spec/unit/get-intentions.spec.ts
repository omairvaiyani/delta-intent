import Joi from '@hapi/joi';
import { expect } from 'chai';
import { getFieldConfig, getIntentConfig, getTypeConfig } from '../helpers';
import { profile, purchaseOrder } from './fixtures';
import { TypeConfigStore } from '../../src/core/type-config-store';
import { safeId } from '../../src/utils/common';
import { getIntentions } from '../../src/core/get-intentions';
import { ModelConfiguration } from '../../src/core/model-configuration';
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
            const { modelId, code, message, info, invalidFields } = extra.error;

            const response = runScenario();
            const { error } = response;
            expect(error).to.be.ok;

            if (modelId !== null) {
              expect(error.modelId).to.equal(modelId);
            }
            if (code !== null) {
              expect(error.code).to.equal(code);
            }
            if (message !== null) {
              expect(error.message).to.equal(message);
            }
            if (info !== null) {
              expect(error.info).to.deep.equal(info);
            }
            if (invalidFields !== null) {
              expect(error.invalidFields).to.deep.equal(invalidFields);
            }
          } else {
            const response = runScenario();
            // @ts-ignore - intentional type override
            expect(response.error).to.not.be.ok;

            expect(response.intentIds.sort()).to.deep.equal(
              expectedIntentIds.sort()
            );
          }
        });
      });
    });
  });
});
