import { localizeRecordText } from '../lib/demoLocalization';
import {
  localizeHealthScoreLabel,
  localizeHealthScoreReason,
} from '../lib/healthScore';

describe('localized demo health content', () => {
  test('translates standard demo records into Japanese', () => {
    expect(localizeRecordText('Karma aşı tekrarı', 'ja')).toBe(
      '混合ワクチン追加接種',
    );
    expect(localizeRecordText('Aşı', 'ja')).toBe('ワクチン');
    expect(localizeRecordText('Aylık doz tamamlandı.', 'ja')).toBe(
      '月次投与完了。',
    );
  });

  test('keeps user-entered health text unchanged', () => {
    expect(localizeRecordText('Custom veterinary note', 'de')).toBe(
      'Custom veterinary note',
    );
  });

  test('localizes health score labels and generated reasons', () => {
    expect(localizeHealthScoreLabel('Excellent', 'ja')).toBe('とても良好');
    expect(localizeHealthScoreReason('2 overdue vaccines', 'de')).toBe(
      '2 überfällige Impfungen',
    );
    expect(localizeHealthScoreReason('1 vaccine due soon', 'es')).toBe(
      '1 vacuna próxima',
    );
    expect(
      localizeHealthScoreReason('No recent wellness check recorded', 'ja'),
    ).toBe('最近の定期健診記録がありません');
  });
});
