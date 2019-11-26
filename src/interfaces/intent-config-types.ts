import Joi from '@hapi/joi';
import { IntentId, IntentId_S } from './base-types';
import { MatchConfig, MatchConfig_S } from './match-config-types';

const IntentConfig_S = Joi.object({
  intentId: IntentId_S.required(),
  isCreate: Joi.boolean().required(),
  matchConfig: MatchConfig_S.required()
});

interface IntentConfig {
  intentId: IntentId;
  isCreate: boolean;
  matchConfig: MatchConfig;
}

export { IntentConfig, IntentConfig_S };
