import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Enums } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

import { queryKeys } from './query-client';

export type ReportReason = Enums<'report_reason'>;
export type ReportTarget = Enums<'report_target'>;

export const REPORT_REASONS: { value: ReportReason; label: string; targets: ReportTarget[] }[] = [
  { value: 'not_vegan', label: 'Not actually vegan', targets: ['restaurant', 'dish'] },
  { value: 'not_vegetarian', label: 'Not actually vegetarian', targets: ['restaurant', 'dish'] },
  { value: 'allergen_info_wrong', label: 'Allergen info is wrong', targets: ['restaurant', 'dish'] },
  { value: 'wrong_hours', label: 'Hours are wrong', targets: ['restaurant'] },
  { value: 'permanently_closed', label: 'Permanently closed', targets: ['restaurant'] },
  { value: 'wrong_location', label: 'Wrong address or location', targets: ['restaurant'] },
  { value: 'duplicate', label: 'Duplicate listing', targets: ['restaurant', 'dish'] },
  { value: 'inappropriate', label: 'Inappropriate or spam', targets: ['review', 'photo', 'dish', 'restaurant'] },
  { value: 'other', label: 'Something else', targets: ['restaurant', 'dish', 'review', 'photo'] },
];

export function reasonsFor(target: ReportTarget) {
  return REPORT_REASONS.filter((r) => r.targets.includes(target));
}

export function useSubmitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      targetType: ReportTarget;
      targetId: string;
      reason: ReportReason;
      details?: string;
    }) => {
      const { error } = await supabase.from('reports').insert({
        user_id: input.userId,
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        details: input.details?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.moderation }),
  });
}
