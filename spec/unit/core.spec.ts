import { FieldModificationData } from '../../src/interfaces/get-intentions-types';
import { performDiffCheck } from '../../src/utils/diff';
import { ObjectHasher } from '../../src/interfaces/hasher-types';
import { getFieldDeltaData } from '../../src/core/get-intentions';
import { expect } from 'chai';

/**
 * This suite tests a selection of complex internal
 * methods to increase confidence. These test-cases
 * may require a higher-frequency of updates given
 * that they leak implementation details, but overall,
 * the benefits outweight the maintenance overload.
 */
describe('core', function() {
  describe('getFieldDeltaData', function() {
    describe('array delta with object', function() {
      type ObjType = { id: number; label: string };
      const fieldId = 'speedingTickets';
      const executeFieldDataCase = function(
        modifiedValue: any,
        existingValue: any
      ) {
        const existingState = {
          [fieldId]: existingValue
        };
        const modifiedState = {
          [fieldId]: modifiedValue
        };
        const deltaValues = {
          existingValue,
          modifiedValue
        };
        const objectHasher: ObjectHasher<ObjType> = obj => obj.id;
        const diff = performDiffCheck(deltaValues, {
          differOptions: { objectHasher }
        });

        const fieldModificationData: FieldModificationData = {
          fieldId,
          fieldConfig: {
            fieldId
          },
          typeConfig: {
            objectHasher
          },
          isRequired: true,
          isArray: true,
          isImmutable: false,
          isInModifiedState: true,
          rawValues: {
            modified: modifiedValue,
            existing: existingValue
          },
          inputPipeParams: {
            isCreate: false,
            modifiedState,
            existingState,
            modifiedValue,
            existingValue,
            postState: {
              ...modifiedState
            }
          },
          deltaValues: {
            modifiedValue,
            existingValue
          },
          deltaData: {
            fieldId,
            didChange: undefined,
            diff,
            delta: [modifiedValue, existingValue]
          }
        };

        return getFieldDeltaData(fieldModificationData);
      };

      it('can correctly count the number of added items appended into an array', () => {
        const obj1: ObjType = { id: 1, label: 'Foo' };
        const obj2: ObjType = { id: 2, label: 'Bar' };
        const obj3: ObjType = { id: 3, label: 'Baz' };
        const fieldDeltaData = executeFieldDataCase([obj1, obj2, obj3], [obj1]);

        expect(fieldDeltaData.arrayDelta.added).to.have.length(2);
        expect(fieldDeltaData.arrayDelta.removed).to.have.length(0);
        expect(fieldDeltaData.arrayDelta.moved).to.have.length(0);
      });

      it('can correctly count the number of added items shifted into an array', () => {
        const obj1: ObjType = { id: 1, label: 'Foo' };
        const obj2: ObjType = { id: 2, label: 'Bar' };
        const fieldDeltaData = executeFieldDataCase([obj2, obj1], [obj1]);

        expect(fieldDeltaData.arrayDelta.added).to.have.length(1);
        expect(fieldDeltaData.arrayDelta.removed).to.have.length(0);
        expect(fieldDeltaData.arrayDelta.moved).to.have.length(0);
      });

      it('can correctly count the number of added removed from an array', () => {
        const obj1: ObjType = { id: 1, label: 'Foo' };
        const obj2: ObjType = { id: 2, label: 'Bar' };
        const obj3: ObjType = { id: 3, label: 'Baz' };
        const fieldDeltaData = executeFieldDataCase(
          [obj1, obj3],
          [obj1, obj2, obj3]
        );

        expect(fieldDeltaData.arrayDelta.added).to.have.length(0);
        expect(fieldDeltaData.arrayDelta.removed).to.have.length(1);
        expect(fieldDeltaData.arrayDelta.moved).to.have.length(0);
      });

      it('can correctly count the number of added moved within an array', () => {
        const obj1: ObjType = { id: 1, label: 'Foo' };
        const obj2: ObjType = { id: 2, label: 'Bar' };
        const obj3: ObjType = { id: 3, label: 'Baz' };
        const fieldDeltaData = executeFieldDataCase(
          [obj1, obj3, obj2],
          [obj1, obj2, obj3]
        );

        expect(fieldDeltaData.arrayDelta.added).to.have.length(0);
        expect(fieldDeltaData.arrayDelta.removed).to.have.length(0);
        expect(fieldDeltaData.arrayDelta.moved).to.have.length(1);
      });
    });
  });
});
