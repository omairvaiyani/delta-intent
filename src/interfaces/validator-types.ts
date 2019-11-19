import Joi from "@hapi/joi";
import { InputValue } from "./base-types";

type Validator = <T extends InputValue>(params: {
  value: T;
}) => boolean | Joi.AnySchema;

export { Validator };
