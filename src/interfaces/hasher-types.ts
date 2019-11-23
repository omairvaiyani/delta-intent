import Joi from '@hapi/joi';

const ObjectHasher_S = Joi.func().arity(1);
type ObjectHasher = (object: any) => any;

export { ObjectHasher_S };
export { ObjectHasher };
