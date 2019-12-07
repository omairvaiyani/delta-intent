import { TypeConfig } from '../../../src/interfaces/custom-types';
import { ModelConfiguration } from '../../../src/api/model-configuration';
import { IntentId } from '../../../src/interfaces/base-types';
import {
  GetIntentionsInput,
  GetIntentionsError
} from '../../../src/interfaces/get-intentions-types';

interface TestFixture {
  typeConfigList?: TypeConfig[];
  modelConfiguration: ModelConfiguration.ConstructorParams;
  scenarios: FixtureScenario[];
}

type BaseTestFixtureScenario = [IntentId[], GetIntentionsInput];
type ExtendedTestFixtureScenario = [
  IntentId[],
  GetIntentionsInput,
  { description?: string; error?: GetIntentionsError }
];
type FixtureScenario = BaseTestFixtureScenario | ExtendedTestFixtureScenario;

export { TestFixture };
