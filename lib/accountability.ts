export interface AccountabilityRow {
  name: string;
  onTimeRate: number;      // percent, 0 to 100
  avgDelayDays: number;
  repeatDigs: number;
  verifiedReports: number;
}