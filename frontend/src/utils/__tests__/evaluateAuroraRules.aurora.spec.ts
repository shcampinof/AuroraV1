import { describe, expect, it } from 'vitest';
import { evaluateAuroraRules } from '../evaluateAuroraRules';
import { mandatoryByBlock } from '../../config/formRules.aurora';

describe('AURORA - Progresion Bloque 3', () => {
  it('habilita Bloque 4 cuando Bloque 3 esta completo', () => {
    const answers: Record<string, unknown> = {};

    (mandatoryByBlock.bloque3 || []).forEach((field) => {
      if (!field.optional) {
        answers[field.key] = 'ok';
      }
    });

    const result = evaluateAuroraRules({ answers });

    expect(result.locked).toBe(false);
    expect(result.visibleBlocks).toContain('bloque4');
  });

  it('no habilita Bloque 4 cuando Bloque 3 esta incompleto', () => {
    const answers: Record<string, unknown> = {};
    const mandatoryFields = (mandatoryByBlock.bloque3 || []).filter((field) => !field.optional);

    mandatoryFields.forEach((field) => {
      answers[field.key] = 'ok';
    });

    const firstRequired = mandatoryFields[0];
    if (firstRequired) {
      answers[firstRequired.key] = '';
    }

    const result = evaluateAuroraRules({ answers });

    expect(result.visibleBlocks).toContain('bloque3');
    expect(result.visibleBlocks).not.toContain('bloque4');
  });

  it('habilita Bloque 4 cuando Bloque 3 se llena con IDs estables', () => {
    const answers: Record<string, unknown> = {};
    const mandatoryFields = (mandatoryByBlock.bloque3 || []).filter((field) => !field.optional);

    mandatoryFields.forEach((field) => {
      if (field.id) answers[field.id] = 'ok';
    });

    const result = evaluateAuroraRules({ answers });

    expect(result.locked).toBe(false);
    expect(result.visibleBlocks).toContain('bloque4');
  });
});
