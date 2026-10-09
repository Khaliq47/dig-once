import DashboardView from "@/components/DashboardView";
import { departmentsDummy, contractorsDummy } from "@/lib/dummy-accountability";

export default function Page() {
  return (
    <DashboardView
      departments={departmentsDummy}
      contractors={contractorsDummy}
      isSample
    />
  );
}