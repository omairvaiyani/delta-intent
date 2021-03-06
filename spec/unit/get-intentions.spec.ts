import { expect } from 'chai';
import { profile, purchaseOrder, accidentClaim } from './fixtures';
import { TypeConfigStore } from '../../src/core/type-config-store';
import { safeId } from '../../src/utils/common';
import { getIntentions } from '../../src/core/get-intentions';
import { ModelConfiguration } from '../../src/core/model-configuration';

describe('getIntentions', function() {
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

  const fixtures = [profile, purchaseOrder, accidentClaim];
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
          console.error(`fixture setup failed`, e);
          process.exit(1);
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

            if (message !== null) {
              expect(error.message).to.equal(message);
            }
            if (code !== null) {
              expect(error.code).to.equal(code);
            }
            if (info !== null) {
              expect(error.info).to.deep.equal(info);
            }
            if (invalidFields !== null) {
              expect(error.invalidFields).to.deep.equal(invalidFields);
            }
            if (modelId !== null) {
              expect(error.modelId).to.equal(modelId);
            }
          } else {
            const response = runScenario();

            expect(
              response.error,
              response.error && JSON.stringify(response.error)
            ).to.not.be.ok;

            expect(response.intentIds.sort()).to.deep.equal(
              expectedIntentIds.sort()
            );

            expect(response.sanitisations).to.deep.equal(extra.sanitisations);
          }
        });
      });
    });
  });
});
