"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/services/supabase/client";
import { updateStudentInfo } from "../actions";
import { CaretIcon } from "@/app/(protected)/_components/ui/icons";

type StudentData = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  grade: string | null;
  date_of_birth: string | null;
};

type Props = {
  student: StudentData;
  accountEmail: string;
};

/**
 * Client UI for managing a student profile.
 * @param student Initial student profile data.
 * @param accountEmail Read-only login email for the account.
 */
export default function StudentProfilePageClient({
  student,
  accountEmail,
}: Props) {
  return (
    <div className="bg-[#2b4257] min-h-screen flex flex-col">
      <header className="top-0 z-10 bg-[#2b4257] px-8 py-5 flex items-center">
        <a
          href="/home"
          className="inline-flex items-center gap-2 bg-[#1f2e3b] text-white no-underline text-[1rem] font-semibold px-5 py-2.5 rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.25)] hover:bg-[#162230] transition-colors"
        >
          <CaretIcon direction="left" />
          Return to Dashboard
        </a>
      </header>

      <main className="bg-[#1f2e3b] rounded-3xl mx-8 mb-10 flex-1 px-10 py-8 xl:px-16">
        <h1 className="text-white text-center text-2xl font-bold mb-8">
          Manage Profile
        </h1>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-stretch lg:items-start">
          {/* Left panel - avatar, bio, location */}
          <div className="w-full lg:w-64 shrink-0">
            <LeftPanel student={student} />
          </div>

          {/* Right panel - info sections */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            <PersonalSection student={student} accountEmail={accountEmail} />
            <AcademicSection student={student} />
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left Panel - Avatar, Bio, Location
// ---------------------------------------------------------------------------

function LeftPanel({ student }: { student: StudentData }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(student.avatar_url);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [bio, setBio] = useState(student.bio ?? "");
  const [location, setLocation] = useState(student.location ?? "");
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials =
    [student.first_name, student.last_name]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") || "?";

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("File is too large. Please select an image under 2MB.");
      e.target.value = "";
      return;
    }

    const allowedExtensions = ["png", "jpg", "jpeg", "webp", "gif"];
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      setError(`Invalid file extension. Please use: ${allowedExtensions.join(", ")}`);
      e.target.value = "";
      return;
    }

    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setError(null);
    e.target.value = "";
  }

  function handleCancelPreview() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setError(null);
  }

  async function handleConfirmUpload() {
    if (!pendingFile) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();

    if (avatarUrl) {
      const oldPath = avatarUrl
        .split("/storage/v1/object/public/avatars/")[1]
        ?.split("?")[0];
      if (oldPath) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }
    }

    const ext = pendingFile.name.split(".").pop();
    const path = `${student.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, pendingFile, { upsert: true });

    if (uploadError) {
      setError("Avatar upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl;

    const result = await updateStudentInfo(student.id, { avatar_url: publicUrl });
    setUploading(false);

    if (result.success) {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      setAvatarUrl(publicUrl);
      setPendingFile(null);
      setPendingPreview(null);
    } else {
      setError(result.error ?? "Failed to save avatar");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateStudentInfo(student.id, { bio, location });
    setSaving(false);
    if (result.success) {
      setEditing(false);
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  function handleCancel() {
    setBio(student.bio ?? "");
    setLocation(student.location ?? "");
    setError(null);
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => !pendingFile && fileInputRef.current?.click()}
          disabled={uploading}
          className="group relative w-32 h-32 rounded-full overflow-hidden bg-[#2b4257] shadow-[0_4px_4px_rgba(0,0,0,0.25)] shrink-0 cursor-pointer focus:outline-none"
          aria-label="Change profile picture"
        >
          {(pendingPreview ?? avatarUrl) ? (
            <Image
              src={pendingPreview ?? avatarUrl!}
              alt="Profile avatar"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#B1E7D6] text-3xl font-bold">
              {initials}
            </div>
          )}
          {!pendingFile && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-disabled:opacity-100 transition-opacity">
              <span className="text-white text-xs font-medium">
                Change photo
              </span>
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        {pendingFile ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <p className="text-[#B1E7D6] text-xs text-center">
              Use this photo?
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={handleCancelPreview}
                disabled={uploading}
                className="flex-1 text-gray-400 hover:text-white text-sm py-1.5 border border-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploading}
                className="flex-1 bg-[#B1E7D6] text-[#1F2E3B] rounded-lg font-semibold text-sm py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Confirm"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-xs text-center">
            Click photo to change
          </p>
        )}
      </div>

      {/* Bio & Location - read/edit toggle */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-white font-semibold text-sm">About</span>
          {editing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="text-gray-400 hover:text-white text-sm px-3 py-1 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#B1E7D6] text-[#1F2E3B] rounded-lg font-semibold text-sm px-4 py-1 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-[#B1E7D6] hover:text-white text-sm font-medium transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {/* Bio */}
        {editing ? (
          <div>
            <label className="block text-[#B1E7D6] text-xs font-medium mb-1.5 uppercase tracking-wide">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="Tell us a little about yourself…"
              className="w-full bg-[#2b4257] text-white text-sm border border-[#B1E7D6]/40 rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-[#B1E7D6] transition-colors resize-none"
            />
            <p className="text-gray-600 text-xs mt-1 text-right">
              {bio.length}/300
            </p>
          </div>
        ) : (
          bio && <p className="text-white text-sm">{bio}</p>
        )}

        {/* Location */}
        {editing ? (
          <div>
            <label className="block text-[#B1E7D6] text-xs font-medium mb-1.5 uppercase tracking-wide">
              Location
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Province"
              className="w-full bg-[#2b4257] text-white text-sm border border-[#B1E7D6]/40 rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-[#B1E7D6] transition-colors"
            />
          </div>
        ) : (
          location && (
            <div className="flex items-center gap-1.5 text-white text-sm">
              <LocationIcon />
              <span>{location}</span>
            </div>
          )
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 text-red-300 px-3 py-2 rounded-lg text-xs">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Personal Information Section
// ---------------------------------------------------------------------------

function PersonalSection({
  student,
  accountEmail,
}: {
  student: StudentData;
  accountEmail: string;
}) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(student.first_name ?? "");
  const [lastName, setLastName] = useState(student.last_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateStudentInfo(student.id, {
      first_name: firstName,
      last_name: lastName,
    });
    setSaving(false);
    if (result.success) {
      setEditing(false);
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  function handleCancel() {
    setFirstName(student.first_name ?? "");
    setLastName(student.last_name ?? "");
    setError(null);
    setEditing(false);
  }

  return (
    <SectionCard
      title="Personal Information"
      editing={editing}
      saving={saving}
      error={error}
      onEdit={() => setEditing(true)}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name">
            {editing ? (
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
                placeholder="First name"
              />
            ) : (
              <ValueText>{firstName || "—"}</ValueText>
            )}
          </Field>
          <Field label="Last Name">
            {editing ? (
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
                placeholder="Last name"
              />
            ) : (
              <ValueText>{lastName || "—"}</ValueText>
            )}
          </Field>
        </div>
        <Field label="Login Email">
          <ValueText className="text-gray-400">{accountEmail}</ValueText>
          <p className="text-xs text-gray-500 mt-0.5">
            Login email cannot be changed here
          </p>
        </Field>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Academic Info Section
// ---------------------------------------------------------------------------

function AcademicSection({ student }: { student: StudentData }) {
  const [editing, setEditing] = useState(false);
  const [grade, setGrade] = useState(student.grade ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(student.date_of_birth ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateStudentInfo(student.id, {
      grade,
      date_of_birth: dateOfBirth,
    });
    setSaving(false);
    if (result.success) {
      setEditing(false);
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  function handleCancel() {
    setGrade(student.grade ?? "");
    setDateOfBirth(student.date_of_birth ?? "");
    setError(null);
    setEditing(false);
  }

  // Format an ISO date string (YYYY-MM-DD) for display
  function formatDate(iso: string) {
    if (!iso) return "—";
    const [year, month, day] = iso.split("-");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <SectionCard
      title="Academic Info"
      editing={editing}
      saving={saving}
      error={error}
      onEdit={() => setEditing(true)}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Grade">
          {editing ? (
            <input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className={inputClass}
              placeholder="e.g. 3"
            />
          ) : (
            <ValueText>{grade || "—"}</ValueText>
          )}
        </Field>
        <Field label="Date of Birth">
          {editing ? (
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={inputClass}
            />
          ) : (
            <ValueText>{dateOfBirth ? formatDate(dateOfBirth) : "—"}</ValueText>
          )}
        </Field>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

type SectionCardProps = {
  title: string;
  editing: boolean;
  saving: boolean;
  error: string | null;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
};

function SectionCard({
  title,
  editing,
  saving,
  error,
  onEdit,
  onSave,
  onCancel,
  children,
}: SectionCardProps) {
  return (
    <div className="bg-[#2b4257] rounded-2xl p-6 shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-semibold text-base">{title}</h2>
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              disabled={saving}
              className="text-gray-400 hover:text-white text-sm px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="bg-[#B1E7D6] text-[#1F2E3B] rounded-lg font-semibold text-sm px-4 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        ) : (
          <button
            onClick={onEdit}
            className="text-[#B1E7D6] hover:text-white text-sm font-medium transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-500/40 text-red-300 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[#B1E7D6] text-xs font-medium mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function ValueText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-white text-sm font-medium ${className ?? ""}`}>
      {children}
    </p>
  );
}

function LocationIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[#B1E7D6] shrink-0"
    >
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

const inputClass =
  "w-full bg-[#1f2e3b] text-white text-sm border border-[#B1E7D6]/40 rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-[#B1E7D6] transition-colors";
