import { TypeConfig } from '../../../src/interfaces/custom-types';
import { ModelConfiguration } from '../../../src/api/model-configuration';
import { GetIntentionsInput } from '../../../dist/src/api/get-intentions';
import { IntentId } from '../../../src/interfaces/base-types';
import { IDeltaError } from '../../../src/interfaces/error-types';

interface TestFixture {
  typeConfigList?: TypeConfig[];
  modelConfiguration: ModelConfiguration.ConstructorParams;
  scenarios: FixtureScenario[];
}

type BaseTestFixtureScenario = [IntentId[], GetIntentionsInput];
type ExtendedTestFixtureScenario = [
  IntentId[],
  GetIntentionsInput,
  { description?: string; error?: IDeltaError }
];
type FixtureScenario = BaseTestFixtureScenario | ExtendedTestFixtureScenario;

export { TestFixture };
