import { IntentId } from "./base-types";
import { MatchConfig } from "./match-config-types";

interface IIntentConfig {
  intentId: IntentId;
  isCreate: boolean;
  matchConfig: MatchConfig;
}

export { IIntentConfig };
