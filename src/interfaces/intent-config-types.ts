import Joi from '@hapi/joi';
import { IntentId, IntentId_S } from './base-types';
import { MatchConfig, MatchConfig_S } from './match-config-types';

const IIntentConfig_S = Joi.object({
  intentId: IntentId_S.required(),
  isCreate: Joi.boolean().required(),
  matchConfig: MatchConfig_S.required()
});

interface IIntentConfig {
  intentId: IntentId;
  isCreate: boolean;
  matchConfig: MatchConfig;
}

export { IIntentConfig, IIntentConfig_S };
