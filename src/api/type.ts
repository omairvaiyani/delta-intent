import { Validator } from '../interfaces/validator-types';
import { Sanitiser } from '../interfaces/sanitiser-types';
import { ObjectHasher } from '../interfaces/hasher-types';
import { TypeConfig } from '../interfaces/custom-types';
import { TypeId } from '../interfaces/base-types';

export class TypeApi {
  private _typeId: TypeId;

  private _validators?: Validator[];

  private _sanitiser?: Sanitiser;

  private _hasher?: ObjectHasher;

  constructor(typeId: TypeId) {
    this._typeId = typeId;
  }

  public get typeId() {
    return this._typeId;
  }

  public validator(validator: Validator): TypeApi {
    if (!this._validators) {
      this._validators = [];
    }
    this._validators.push(validator);
    return this;
  }

  public sanitiser(sanitiser: Sanitiser): TypeApi {
    if (this._sanitiser) {
      throw new Error('You cannot set more than one sanitiser per Type');
    }
    this._sanitiser = sanitiser;
    return this;
  }

  public hasher(hasher: ObjectHasher): TypeApi {
    if (this._hasher) {
      throw new Error('You cannot set more than one hasher per Type');
    }
    this._hasher = hasher;
    return this;
  }

  public toConfig(): TypeConfig {
    const typeConfig: TypeConfig = {
      typeId: this._typeId
    };
    const { _validators, _sanitiser, _hasher } = this;
    if (_validators) {
      typeConfig.validator =
        _validators.length === 1 ? _validators[0] : _validators;
    }
    if (_sanitiser) {
      typeConfig.sanitiser = _sanitiser;
    }
    if (_hasher) {
      typeConfig.objectHasher = _hasher;
    }

    return typeConfig;
  }
}
