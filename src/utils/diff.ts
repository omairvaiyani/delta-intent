import { Config, DiffPatcher } from 'jsondiffpatch';
import { DeltaValues, DifferOptions, Diff } from '../interfaces/delta-types';
import { DeltaChecker } from '../interfaces/match-config-types';
import { ObjectHasher } from '../interfaces/hasher-types';
import { InputValue } from '../interfaces/base-types';

interface DiffPatcherConfig extends Config {}

const getDiffer = (deltaValues: DeltaValues, options: DifferOptions) => {
  const diffOptions: DiffPatcherConfig = {};
  if (options.objectHasher) {
    if (
      !Array.isArray(deltaValues.existingValue) &&
      !Array.isArray(deltaValues.modifiedValue)
    ) {
      // special case, see _executeObjectHasher comments
      return _executeObjectHasher.bind(null, options.objectHasher);
    }

    diffOptions.objectHash = options.objectHasher;
  }
  const defaultDiffPatcher = new DiffPatcher(diffOptions);
  return defaultDiffPatcher.diff.bind(defaultDiffPatcher);
};

/**
 * Normally, object hasher is used by our `diff` library
 * for array values, but if the user decides to use the
 * hasher for non-array objects, we must manually handle
 * them.
 *
 * This method mimics the delta output by getting the
 * hashed values.
 */
const _executeObjectHasher = (
  objectHasher: ObjectHasher,
  existingValue: InputValue,
  modifiedValue: InputValue
): Diff => {
  const existingId = existingValue ? objectHasher(existingValue) : undefined;
  const modifiedId = modifiedValue ? objectHasher(modifiedValue) : undefined;
  return existingId !== modifiedId ? [existingId, modifiedId] : undefined;
};

const performDiffCheck: DeltaChecker = (
  deltaValues: DeltaValues,
  options: { differOptions?: DifferOptions } = {}
) => {
  const delta = getDiffer(deltaValues, options.differOptions || {})(
    deltaValues.existingValue,
    deltaValues.modifiedValue
  );
  return delta;
};

export { performDiffCheck, DifferOptions };
