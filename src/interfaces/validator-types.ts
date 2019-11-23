import Joi from '@hapi/joi';

const Validator_S = Joi.func().arity(1);
type Validator = (params: { value: any }) => boolean;

export { Validator_S };
export { Validator };
