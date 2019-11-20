import { DeltaValues } from "../interfaces/delta-types";
import { DeltaChecker } from "../interfaces/match-config-types";
import { DefaultValueType } from "../interfaces/base-types";
import { performDiffCheck } from "./diff";

const getDeltaChecker = (type: DefaultValueType): DeltaChecker => {
  return {
    [DefaultValueType.Array]: (values: DeltaValues) => {
      const { existingValue, modifiedValue } = values;
      return existingValue !== modifiedValue;
    },
    [DefaultValueType.Object]: (values: DeltaValues) => {
      const { existingValue, modifiedValue } = values;
      return existingValue !== modifiedValue;
    },
    [DefaultValueType.Boolean]: simpleDeltaCheck,
    [DefaultValueType.Number]: simpleDeltaCheck,
    [DefaultValueType.String]: simpleDeltaCheck,
    [DefaultValueType.Symbol]: simpleDeltaCheck
  }[type];
};

const simpleDeltaCheck = (values: DeltaValues) => {
  if (values.existingValue !== values.modifiedValue) {
    return performDiffCheck(values);
  } else {
    return null;
  }
};

export { getDeltaChecker };
