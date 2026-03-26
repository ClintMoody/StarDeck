import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAllSettings } from "@/lib/queries";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { GeneralSettings } from "@/components/settings/general-settings";
import { DataSettings } from "@/components/settings/data-settings";
import "@/lib/db/migrate";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const settings = getAllSettings();

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          &larr; Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      <div className="space-y-12">
        <GeneralSettings initialSettings={settings} />
        <hr className="border-gray-800" />
        <NotificationSettings initialSettings={settings} />
        <hr className="border-gray-800" />
        <DataSettings />
      </div>
    </div>
  );
}
