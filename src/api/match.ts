import {
  FieldMatch,
  ValueMatchPresence,
  ValueMatch,
  DeltaCheck,
  ManualMatcher,
  MatchConfigItem
} from '../interfaces/match-config-types';
import { FieldId, InputValue } from '../interfaces/base-types';

interface DefinedMatchApi {
  toConfig: () => MatchConfigItem;
}

class MatchApi<T extends InputValue = InputValue> {
  private fieldMatch: FieldMatch;
  private _existingState: ValueMatch;
  private _modifiedState: ValueMatch;
  private _deltaCheck: DeltaCheck;

  constructor(fieldId: FieldId | FieldMatch) {
    this.fieldMatch = fieldId;
  }

  public present(present?: boolean | ValueMatchPresence) {
    const modifiedState = this.setupModifiedStateMatch();
    modifiedState.presence =
      typeof present === 'string'
        ? present
        : present === false
        ? ValueMatchPresence.Forbidden
        : ValueMatchPresence.Required;

    this._existingState = null;
    this._deltaCheck = false;

    return postValueMatchOptions(this);
  }

  public changed() {
    this._deltaCheck = true;

    return postValueMatchOptions(this);
  }

  public is(value: T) {
    const modifiedState = this.setupModifiedStateMatch();
    modifiedState.value = value;

    this._deltaCheck = true;

    return {
      ...postValueMatchOptions(this),

      from: (value: T) => {
        const existingState = this.setupExistingStateMatch();
        existingState.value = value;
        return postValueMatchOptions(this);
      }
    };
  }

  public matcher(valueMatcher: ManualMatcher<T>) {
    const modifiedState = this.setupModifiedStateMatch();
    modifiedState.manual = valueMatcher;

    this._deltaCheck = true;

    return postValueMatchOptions(this);
  }

  public toConfig(): MatchConfigItem {
    const matchConfigItem: MatchConfigItem = {
      fieldMatch: this.fieldMatch,
      deltaMatch: {}
    };
    const { _existingState, _modifiedState, _deltaCheck } = this;
    if (_existingState) {
      matchConfigItem.deltaMatch.existingState = _existingState;
    }
    if (_modifiedState) {
      matchConfigItem.deltaMatch.modifiedState = _modifiedState;
    }
    if (_deltaCheck) {
      matchConfigItem.deltaMatch.deltaCheck = _deltaCheck;
    }
    return matchConfigItem;
  }

  private setupModifiedStateMatch() {
    if (!this._modifiedState) {
      this._modifiedState = {};
    }
    return this._modifiedState;
  }
  private setupExistingStateMatch() {
    if (!this._existingState) {
      this._existingState = {};
    }
    return this._existingState;
  }
}

const postValueMatchOptions = function(matchApi: MatchApi) {
  return {
    toConfig: matchApi.toConfig.bind(matchApi)
  };
};

const Match = {
  AnyField: (fieldIds: FieldId[]) => [fieldIds],
  Presence: ValueMatchPresence
};

export { MatchApi, DefinedMatchApi, Match };
