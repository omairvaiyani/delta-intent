import { diff } from "jsondiffpatch";
import { DeltaValues } from "../interfaces/delta-types";

const performDiffCheck = (deltaValues: DeltaValues) => {
  return diff(deltaValues.existingValue, deltaValues.modifiedValue);
};

export { performDiffCheck };
