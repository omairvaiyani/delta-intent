import {
  FieldMatch,
  ValueMatchPresence,
  ValueMatch,
  DeltaCheck,
  DeltaChecker,
  ManualMatcher,
  MatchConfigItem
} from '../interfaces/match-config-types';
import { FieldId } from '../interfaces/base-types';
import { IncompatibleConfigError } from './error';

interface DefinedMatchApi {
  toConfig: () => MatchConfigItem;
}

class MatchApi {
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

  public is(valueMatcher: any | ManualMatcher) {
    const modifiedState = this.setupModifiedStateMatch();
    if (typeof valueMatcher === 'function') {
      modifiedState.manual = valueMatcher;
    } else {
      modifiedState.value = valueMatcher;
    }

    this._deltaCheck = true;

    return {
      ...postValueMatchOptions(this),

      from: (valueMatcher: any | ManualMatcher) => {
        const existingState = this.setupExistingStateMatch();
        if (typeof valueMatcher === 'function') {
          existingState.manual = valueMatcher;
        } else {
          existingState.value = valueMatcher;
        }
        return postValueMatchOptions(this);
      }
    };
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

export { MatchApi, DefinedMatchApi };
