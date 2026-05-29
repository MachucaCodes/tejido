import Image from "next/image";
import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { createAdmin } from "@/lib/supabase/admin";
import { createClient as createServer } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // A phone-keyed (non-anonymous) account is the durable identity. Guests are
  // anonymous sessions that can sign in via the AccountMenu to recover their
  // conversation on a new device/browser.
  const isAuthed = Boolean(user) && !user!.is_anonymous;

  let fullName: string | null = null;
  if (user) {
    const admin = createAdmin();
    const { data: row } = await admin
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    fullName = row?.full_name?.trim() || null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-[oklch(96.5%_0.022_82/0.82)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3.5">
          <Link href="/" aria-label="Go to home page" className="flex items-center">
            <Image
              src="/esm-logo.png"
              alt="La Ecovilla"
              width={323}
              height={119}
              className="h-6 w-auto opacity-90 sm:h-7"
              priority
            />
          </Link>
          <span className="h-5 w-px translate-y-[2px] bg-border sm:translate-y-[3px]" aria-hidden />
          <span
            className="translate-y-[4px] font-display text-[1.1rem] italic leading-none text-foreground sm:translate-y-[5px] sm:text-[1.2rem]"
            style={{ fontVariationSettings: '"opsz" 14, "SOFT" 80, "WONK" 1' }}
          >
            tejido
          </span>
        </div>
        <AccountMenu fullName={fullName} isAuthed={isAuthed} />
      </div>
    </header>
  );
}
