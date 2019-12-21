import Joi from '@hapi/joi';
import { InputValue } from './base-types';

const ObjectHasher_S = Joi.func().arity(1);

type ObjectHasher<T extends InputValue = InputValue> = (object: T) => any;

export { ObjectHasher_S };
export { ObjectHasher };
