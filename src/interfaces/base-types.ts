import Joi from '@hapi/joi';

const InputValue_S = Joi.any();
const ModelId_S = Joi.alternatives().try(
  Joi.string().min(1),
  Joi.number(),
  Joi.symbol()
);
const IntentId_S = Joi.alternatives().try(
  Joi.string().min(1),
  Joi.number(),
  Joi.symbol()
);
const FieldId_S = Joi.alternatives().try(Joi.string().min(1), Joi.number());
const TypeId_S = Joi.string().min(1);
const ModelState_S = Joi.object().pattern(FieldId_S, InputValue_S);
const DefaultValueType_S = Joi.string().valid(
  'array',
  'boolean',
  'date',
  'number',
  'object',
  'string',
  'symbol'
);

type InputValue = any;
type ModelId = string | number | symbol;
type IntentId = string | number | symbol;
type FieldId = string | number;
type TypeId = string;
type ModelState = Record<FieldId, InputValue>;

enum DefaultValueType {
  Array = 'array',
  Boolean = 'boolean',
  Date = 'date',
  Number = 'number',
  Object = 'object',
  String = 'string',
  Symbol = 'symbol'
}

export {
  ModelId_S,
  IntentId_S,
  FieldId_S,
  TypeId_S,
  InputValue_S,
  ModelState_S,
  DefaultValueType_S
};
export {
  ModelId,
  IntentId,
  FieldId,
  TypeId,
  InputValue,
  ModelState,
  DefaultValueType
};
