import { readFileSync } from 'fs';
import { join } from 'path';

// runMigrations runs in full on every deploy that adds a column, so it must not rewrite existing rows.
describe('runMigrations', () => {
  const source = readFileSync(join(__dirname, '../lambda.ts'), 'utf8');

  it('does not rewrite wage history roles', () => {
    expect(source).not.toMatch(/UPDATE\s+"employee_rate_history"/);
  });

  it('does not rewrite POS tips on tip entries', () => {
    expect(source).not.toMatch(/UPDATE\s+"tip_entries"/);
  });
});
