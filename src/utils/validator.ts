import Joi from '@hapi/joi';
import { IDeltaError } from '../interfaces/error-types';
import { ErrorCode } from '../core/errors';

class DeltaIntentError extends Error implements IDeltaError {
  public code: string;
  public info?: any;
  public modelId?: string;

  constructor(code: string, message: string, info?: any) {
    super(message);

    this.code = code;
    this.info = info;
  }
}

const throwIfInvalidShape = (value: any, schema: Joi.AnySchema) => {
  const { error } = Joi.validate(value, schema);
  if (error) {
    throw new DeltaIntentError(ErrorCode.InvalidConfiguration, error.message, {
      value,
      expected: schema.describe()
    });
  }
};

const throwIfDuplicates = (array: any[], uniqueField: string) => {
  const uniques = new Set(array.map(item => item[uniqueField]));
  if (uniques.size < array.length) {
    throw new DeltaIntentError(
      ErrorCode.InvalidConfiguration,
      `Duplicates found in array, field ${uniqueField} must be unique`,
      {
        fields: array
      }
    );
  }
};

export { DeltaIntentError, throwIfInvalidShape, throwIfDuplicates };
