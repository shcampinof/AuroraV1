import { describe, expect, it } from 'vitest';
import { evaluateAuroraRules } from './evaluateAuroraRules';
import { mandatoryByBlock } from '../config/formRules.aurora';

describe('evaluateAuroraRules - regresion Bloque 3 -> Bloque 4', () => {
  it('muestra Bloque 4 cuando Bloque 3 esta completo aunque existan variantes de codificacion', () => {
    const answers: Record<string, unknown> = {};

    (mandatoryByBlock.bloque3 || [])
      .filter((field) => !field.optional)
      .forEach((field) => {
        answers[field.key] = 'ok';
      });

    const result = evaluateAuroraRules({ answers });

    expect(result.visibleBlocks).toContain('bloque3');
    expect(result.visibleBlocks).toContain('bloque4');
  });
});
