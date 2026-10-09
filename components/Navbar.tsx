"use client";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";

export default function Navbar() {
  return (
    <nav className="flex items-center gap-4 border-b p-4">
      <Link href="/" className="font-bold">
        DigOnce
      </Link>
      <Link href="/map">Map</Link>
      <Link href="/search">Search</Link>
      <Link href="/reports">Reports</Link>
      <Link href="/department">Department</Link>
      <Link href="/dashboard">Dashboard</Link>
      
      {/* Replaced old <Link href="/login"> with AuthButton */}
      <AuthButton />
    </nav>
  );
}