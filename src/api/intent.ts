import { IntentId } from '../interfaces/base-types';
import {
  IntentConfig,
  Operation,
  ExternalPolicy,
  InternalPolicy
} from '../interfaces/intent-config-types';
import { MatchConfigItem } from '../interfaces/match-config-types';
import { DefinedMatchApi } from './match';
import { IncompatibleConfigError } from './error';

export class IntentApi {
  private _intentId: IntentId;
  private _operation = Operation.Any;
  private _externalPolicy: ExternalPolicy;
  private _internalPolicy: InternalPolicy;
  private _items: MatchConfigItem[];

  constructor(intentId: IntentId) {
    this._intentId = intentId;
  }

  public get typeId() {
    return this._intentId;
  }

  public create(): IntentApi {
    if (this._operation === Operation.Update) {
      IncompatibleConfigError('create', 'update');
    }
    this._operation = Operation.Create;
    return this;
  }

  public update(): IntentApi {
    if (this._operation === Operation.Create) {
      IncompatibleConfigError('update', 'create');
    }
    this._operation = Operation.Update;
    return this;
  }

  public exclusive(): IntentApi {
    if (this._externalPolicy === ExternalPolicy.Inclusive) {
      IncompatibleConfigError('exclusive', 'inclusive');
    }
    this._externalPolicy = ExternalPolicy.Exclusive;
    return this;
  }

  public inclusive(): IntentApi {
    if (this._externalPolicy === ExternalPolicy.Exclusive) {
      IncompatibleConfigError('inclusive', 'exclusive');
    }
    this._externalPolicy = ExternalPolicy.Exclusive;
    return this;
  }

  public strict(): IntentApi {
    if (this._internalPolicy === InternalPolicy.Relaxed) {
      IncompatibleConfigError('strict', 'relaxed');
    }
    this._internalPolicy = InternalPolicy.Strict;
    return this;
  }

  public relaxed(): IntentApi {
    if (this._internalPolicy === InternalPolicy.Strict) {
      IncompatibleConfigError('relaxed', 'strict');
    }
    this._internalPolicy = InternalPolicy.Relaxed;
    return this;
  }

  public match(items: DefinedMatchApi[]): IntentApi {
    this._items = items.map(item => item.toConfig());
    return this;
  }

  public toConfig(): IntentConfig {
    const intentConfig: IntentConfig = {
      intentId: this._intentId,
      operation: this._operation,
      externalPolicy: this._externalPolicy,
      internalPolicy: this._internalPolicy,
      matchConfig: {
        items: this._items
      }
    };

    return intentConfig;
  }
}
