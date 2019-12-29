import Joi from '@hapi/joi';
import { IntentId, IntentId_S } from './base-types';
import { MatchConfig, MatchConfig_S } from './match-config-types';
import { enumValues } from '../utils/common';

enum Operation {
  Any = 'any',
  Create = 'create',
  Update = 'update'
}

enum ExternalPolicy {
  Exclusive = 'exclusive',
  Inclusive = 'inclusive'
}

enum InternalPolicy {
  Relaxed = 'relaxed',
  Strict = 'strict'
}

const IntentConfig_S = Joi.object({
  intentId: IntentId_S.required(),
  matchConfig: MatchConfig_S.required(),
  operation: Joi.string()
    .valid(enumValues(Operation))
    .default(Operation.Any)
    .optional(),
  externalPolicy: Joi.string()
    .valid(enumValues(ExternalPolicy))
    .default(ExternalPolicy.Inclusive)
    .optional(),
  internalPolicy: Joi.string()
    .valid(enumValues(InternalPolicy))
    .default(InternalPolicy.Relaxed)
    .optional()
});

interface IntentConfig {
  intentId: IntentId;
  matchConfig: MatchConfig;
  operation?: Operation;
  externalPolicy?: ExternalPolicy;
  internalPolicy?: InternalPolicy;
}

export { IntentConfig, Operation, ExternalPolicy, InternalPolicy };
export { IntentConfig_S };
