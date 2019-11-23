import Joi from '@hapi/joi';

const throwIfInvalidShape = (value: any, schema: Joi.AnySchema) => {
  const { error } = Joi.validate(value, schema);
  if (error) {
    throw new Error(error.message);
  }
};

const throwIfDuplicates = (array: any[], uniqueField: string) => {
  const uniques = new Set(array.map(item => item[uniqueField]));
  if (uniques.size < array.length) {
    throw new Error(
      `Duplicates found in array, field ${uniqueField} must be unique`
    );
  }
};

export { throwIfInvalidShape, throwIfDuplicates };
