export interface AccountabilityRow {
  name: string;
  onTimeRate: number;      // percent, 0 to 100
  avgDelayDays: number;
  repeatDigs: number;
  verifiedReports: number;
}

// SAMPLE DATA: replace with the SQL views once the database is seeded
export const departmentsDummy: AccountabilityRow[] = [
  { name: "Water Board", onTimeRate: 62, avgDelayDays: 18, repeatDigs: 9, verifiedReports: 41 },
  { name: "Roads (PWD)", onTimeRate: 78, avgDelayDays: 9, repeatDigs: 4, verifiedReports: 22 },
  { name: "Electricity Board", onTimeRate: 55, avgDelayDays: 24, repeatDigs: 11, verifiedReports: 37 },
  { name: "Drainage Board", onTimeRate: 70, avgDelayDays: 13, repeatDigs: 6, verifiedReports: 29 },
  { name: "Telecom", onTimeRate: 48, avgDelayDays: 27, repeatDigs: 8, verifiedReports: 15 },
];

export const contractorsDummy: AccountabilityRow[] = [
  { name: "Sri Murugan Constructions", onTimeRate: 81, avgDelayDays: 6, repeatDigs: 2, verifiedReports: 12 },
  { name: "Chennai Infra Works", onTimeRate: 59, avgDelayDays: 21, repeatDigs: 7, verifiedReports: 33 },
  { name: "Metro Pipelines Ltd", onTimeRate: 66, avgDelayDays: 15, repeatDigs: 5, verifiedReports: 25 },
  { name: "Kanchi Roadways", onTimeRate: 74, avgDelayDays: 10, repeatDigs: 3, verifiedReports: 18 },
  { name: "Bharat Cables & Co", onTimeRate: 45, avgDelayDays: 29, repeatDigs: 9, verifiedReports: 21 },
];