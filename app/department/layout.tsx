import DepartmentTabs from "@/components/DepartmentTabs";

export default function DepartmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DepartmentTabs />
      {children}
    </>
  );
}