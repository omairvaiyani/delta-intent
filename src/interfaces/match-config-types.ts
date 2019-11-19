import { FieldId, InputValue } from "./base-types";
import { Validator } from "./validator-types";
import { DeltaValues } from "./delta-types";

type FieldMatch = FieldId | FieldId[];
type DeltaChecker = (values: DeltaValues) => boolean;

interface ValueMatch {
  forbidden?: boolean;
  any?: boolean;
  value?: InputValue;
  manual?: Validator;
}

interface DeltaMatch {
  existingState?: ValueMatch;
  modifiedState?: ValueMatch;
  delta?: boolean | DeltaChecker;
}

interface MatchConfigItem {
  fieldMatch: FieldMatch;
  deltaMatch: DeltaMatch;
  reference?: string;
}

interface MatchConfig {
  items: MatchConfigItem[];
}

export { FieldMatch, ValueMatch, DeltaMatch, MatchConfig, MatchConfigItem };
