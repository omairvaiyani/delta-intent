import { InputValue, FieldId } from "./base-types";

interface DeltaValues {
  existingValue?: InputValue;
  modifiedValue: InputValue;
}

type Delta = {} | null;

interface FieldDelta {
  fieldId: FieldId;
  delta: Delta;
}

export { DeltaValues, Delta, FieldDelta };
