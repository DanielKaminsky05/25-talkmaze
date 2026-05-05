import { createClient } from "@/src/services/supabase/server";
import { redirect } from "next/navigation";
import ProfileCard from "./_components/ProfileCard";
import ManageProfilesButton from "./_components/ManageProfilesButton";
import AddProfileCard from "./_components/AddProfileCard";
import { selectProfile } from "@/src/lib/profiles/actions/selectProfile";
import { getCurrentUser } from "@/src/services/supabase/lib/getCurrentUser";
import { id } from "zod/locales";

// Profile to select as the "active profile"
type Profile = {
  id: string;
  name: string;
  type: "student" | "parent";
  hasPin: boolean;
  avatarUrl: string | null;
  hasSubscription: boolean;
};

/**
 * Fetches all profiles associated with the current user's account.
 * Redirects to login if user is not authenticated.
 * @returns Array of Profile objects for selection
 */
async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  
  if (!user) redirect("/login"); // Redirect to login if not authenticated

  const {data: isNew, error: isNewError} = await supabase.from('account').select('new').eq('id',user.id).single();

  if(!isNew || isNewError){
    redirect("/login")
  }

  console.log("Inside get all profiles trying to see if isNew")
  if(isNew.new == true){
    //redirect to onboarding form
    console.log("redirecting to onboarding because new account")
    redirect('/profiles/onboarding')
  }
  // Fetch parent and student profiles in parallel
  const [{ data: parents }, { data: students }] = await Promise.all([
    supabase
      .from("parents")
      .select("id, first_name, last_name, profile_access_pin, avatar_url")
      .eq("account_id", user.id),
    supabase
      .from("students")
      .select("id, first_name, last_name, avatar_url")
      .eq("account_id", user.id),
  ]);

  // Fetch active subscriptions for all student IDs we found
  const studentIds = students?.map((s) => s.id) || [];
  const { data: activeSubscriptions } = await supabase
    .from("student_subscriptions")
    .select("student_id")
    .in("student_id", studentIds)
    .eq("status", "active");

  const subscribedStudentIds = new Set(
    activeSubscriptions?.map((sub) => sub.student_id) || []
  );

  // Combine and return parent and student profiles
  return [
    ...(parents ?? []).map((p) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.trim(),
      type: "parent" as const,
      hasPin: p.profile_access_pin != null,
      avatarUrl: p.avatar_url ?? null,
      hasSubscription: true, // Parents don't need subscriptions
    })),
    ...(students ?? []).map((s) => ({
      id: s.id,
      name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unnamed",
      type: "student" as const,
      hasPin: false,
      avatarUrl: s.avatar_url ?? null,
      hasSubscription: subscribedStudentIds.has(s.id),
    })),
  ];
}

/**
 * Profile selection top-level page component.
 * Allows the user to select a parent or student profile, displays errors, and
 * provides link to add a new profile
 */
export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {


  const profiles = await getProfiles();
  const { error } = await searchParams;

  const user = await getCurrentUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen w-full bg-[#2b4257] font-[Roboto,sans-serif]">
      <header className="absolute left-[clamp(16px,1.5vw,24px)] top-[clamp(15px,2vw,30px)] flex items-center gap-1">
        <img
          src="/talkmaze-logo.png"
          alt="TalkMaze Logo"
          className="w-[clamp(36px,3.4vw,52px)] h-[clamp(36px,3.4vw,52px)] object-contain"
        />
        <span className="text-[clamp(16px,1.3vw,20px)] font-semibold">
          <span className="text-[#65cfad]">Talk</span>
          <span className="text-white">Maze</span>
        </span>
      </header>

      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-[clamp(18px,1.6vw,24px)] font-bold text-white mb-[clamp(48px,8vw,120px)]">
          Select Your Profile: Parent or Student
        </h1>

        {/* Display error messages here */}
        {error === "wrong_pin" && (
          <p className="text-red-400 text-sm mb-6 font-medium">
            Incorrect PIN. Please try again.
          </p>
        )}
        {error === "not_found" && (
          <p className="text-red-400 text-sm mb-6 font-medium">
            Profile not found. Please try again.
          </p>
        )}

        {/* Profile selection */}
        <div className="flex items-start justify-center gap-[clamp(24px,4vw,60px)] flex-wrap">
          {profiles.map((profile) => {
            const isParentWithoutPin = profile.type === "parent" && !profile.hasPin;

            if (isParentWithoutPin) {
              return (
                <a
                  key={profile.id}
                  href={`/api/profiles/select?profileId=${profile.id}&profileType=parent`}
                  className="no-underline"
                >
                  <ProfileCard
                    id={profile.id}
                    name={profile.name}
                    imageUrl={profile.avatarUrl ?? "/blank_profile.png"}
                    hasPin={false}
                    asLink={true}
                  />
                </a>
              );
            }

            return (
              <form key={profile.id} action={selectProfile}>
                <input type="hidden" name="profileId" value={profile.id} />
                <input type="hidden" name="profileType" value={profile.type} />
                {profile.type === "student" && !profile.hasSubscription && (
                  <input type="hidden" name="destination" value="/payments" />
                )}
                <ProfileCard
                  id={profile.id}
                  name={profile.name}
                  imageUrl={
                    profile.avatarUrl ??
                    (profile.type === "student"
                      ? "/blank_profile.png"
                      : "/blank_profile.png")
                  }
                  hasPin={profile.hasPin}
                />
              </form>
            );
          })}

          <AddProfileCard />
        </div>

        {/* Manage Profiles Button */}
        {/*<ManageProfilesButton />*/}
      </main>
    </div>
  );
}


