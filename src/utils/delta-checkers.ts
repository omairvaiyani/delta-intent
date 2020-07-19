import { performDiffCheck, DifferOptions } from './diff';
import { DeltaValues, Diff } from '../interfaces/delta-types';
import { DeltaChecker } from '../interfaces/match-config-types';
/**
 * Wraps the custom `deltaChecker` and validates
 * the output to ensure safe response. We allow
 * any truthy response, as they're handled by
 * the user of the library, whilst falsy values
 * are restricted to `undefined` to simplify our
 * filtering system
 */
const performCustomDeltaCheck = (
  deltaValues: DeltaValues,
  deltaChecker: DeltaChecker
): Diff => {
  const delta: Diff = deltaChecker(deltaValues);
  if ([null, false, 0, NaN].includes(delta as any)) {
    throw new Error(
      `Your custom delta checker returned an unsupported falsy value: ${delta}. Return undefined for an unchanged delta.`
    );
  }
  return delta;
};

const defaultDeltaCheck: DeltaChecker = (
  deltaValues: DeltaValues,
  options: { differOptions?: DifferOptions } = {}
) => {
  if (deltaValues.existingValue !== deltaValues.modifiedValue) {
    return performDiffCheck(deltaValues, {
      differOptions: options.differOptions
    });
  } 
    return undefined;
  
};

export { defaultDeltaCheck, performCustomDeltaCheck };
