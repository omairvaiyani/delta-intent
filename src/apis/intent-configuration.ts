import { IntentId } from "../interfaces/base-types";
import { MatchConfig } from "../interfaces/match-config-types";
import { IIntentConfig } from "../interfaces/intent-config-types";

// TODO is this class necessary?

class IntentConfiguration implements IIntentConfig {
  intentId: IntentId;
  isCreate: boolean;
  matchConfig: MatchConfig;

  constructor({
    intentId,
    isCreate,
    matchConfig
  }: IntentConfiguration.ConstructorParams) {
    this.intentId = intentId;
    this.isCreate = typeof isCreate === "boolean" ? isCreate : false;
    this.matchConfig = matchConfig;
  }
}

namespace IntentConfiguration {
  export interface ConstructorParams {
    intentId: IntentId;
    isCreate: boolean;
    matchConfig: MatchConfig;
  }
}

export { IntentConfiguration };
