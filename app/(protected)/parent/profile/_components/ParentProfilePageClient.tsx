"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/services/supabase/client";
import { updateParentInfo, updateParentPin } from "../actions";

type ParentData = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  billing_email: string | null;
  profile_access_pin: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
};

type Props = {
  parent: ParentData;
  accountEmail: string;
};

/**
 * Client UI for managing a parent profile.
 * @param parent Initial parent profile data.
 * @param accountEmail Read-only login email for the account.
 */
export default function ParentProfilePageClient({
  parent,
  accountEmail,
}: Props) {
  return (
    <div className="bg-[#2b4257] min-h-screen flex flex-col">
      <header className="top-0 z-10 bg-[#2b4257] px-8 py-5 flex items-center">
        <a
          href="/parent"
          className="inline-flex items-center gap-2 bg-[#1f2e3b] text-white no-underline text-[1rem] font-semibold px-5 py-2.5 rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.25)] hover:bg-[#162230] transition-colors"
        >
          <CaretRight />
          Return to Dashboard
        </a>
      </header>

      <main className="bg-[#1f2e3b] rounded-3xl mx-8 mb-10 flex-1 px-10 py-8 xl:px-16">
        <h1 className="text-white  text-center text-2xl font-bold mb-8">
          Manage Profile
        </h1>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-stretch lg:items-start">
          {/* Left panel - avatar, bio, location */}
          <div className="w-full lg:w-64 shrink-0">
            <LeftPanel parent={parent} />
          </div>

          {/* Right panel - info sections */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            <PersonalSection parent={parent} />
            <ContactSection
              parentId={parent.id}
              accountEmail={accountEmail}
              initialPhone={parent.phone_number}
              initialBillingEmail={parent.billing_email}
            />
            <SecuritySection
              parentId={parent.id}
              hasPin={!!parent.profile_access_pin}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left Panel - Avatar, Bio, Location
// ---------------------------------------------------------------------------

/**
 * Handles avatar preview/upload flow and editable about fields.
 */
function LeftPanel({ parent }: { parent: ParentData }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Persisted avatar URL currently shown for this profile
  const [avatarUrl, setAvatarUrl] = useState(parent.avatar_url);
  // File selected by the user, waiting for explicit confirmation
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // Local object URL used to preview the selected file before upload
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [bio, setBio] = useState(parent.bio ?? "");
  const [location, setLocation] = useState(parent.location ?? "");
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User's first/lastname initials to display if no custom profile pic
  const initials =
    [parent.first_name, parent.last_name]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") || "?";

  // Stage the selected image locally so users can confirm before uploading.
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
    // Reset input so selecting the same file again still fires onChange
    e.target.value = "";
  }

  // Reset staged avatar selection without persisting changes.
  function handleCancelPreview() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setError(null);
  }

  // Upload the staged avatar and persist the resulting public URL.
  async function handleConfirmUpload() {
    if (!pendingFile) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();

    // Delete the old avatar file if one exists, to avoid orphaned files
    // when the extension changes (e.g. switching from .jpg to .png)
    if (avatarUrl) {
      const oldPath = avatarUrl
        .split("/storage/v1/object/public/avatars/")[1]
        ?.split("?")[0]; // strip cache-buster query param
      if (oldPath) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }
    }

    const ext = pendingFile.name.split(".").pop();
    const path = `${parent.id}/avatar-${Date.now()}.${ext}`;

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

    const result = await updateParentInfo(parent.id, { avatar_url: publicUrl });
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

  // Save bio/location updates in a single parent profile update.
  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateParentInfo(parent.id, { bio, location });
    setSaving(false);
    if (result.success) {
      setEditing(false);
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  // Discard unsaved about-section edits and restore original values.
  function handleCancel() {
    setBio(parent.bio ?? "");
    setLocation(parent.location ?? "");
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
          {/* Show preview if pending, otherwise current avatar */}
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
          {/* Hover overlay - only when not in pending confirmation */}
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

        {/* Pending confirmation UI */}
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
        {/* Header row with Edit/Save/Cancel */}
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

        {/* Error */}
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

/**
 * Editable first/last name card for parent profile identity fields.
 */
function PersonalSection({ parent }: { parent: ParentData }) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(parent.first_name ?? "");
  const [lastName, setLastName] = useState(parent.last_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist first and last name changes.
  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateParentInfo(parent.id, {
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

  // Revert unsaved personal info changes.
  function handleCancel() {
    setFirstName(parent.first_name ?? "");
    setLastName(parent.last_name ?? "");
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
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Contact & Billing Section
// ---------------------------------------------------------------------------

type ContactSectionProps = {
  parentId: string;
  accountEmail: string;
  initialPhone: string | null;
  initialBillingEmail: string | null;
};

function ContactSection({
  parentId,
  accountEmail,
  initialPhone,
  initialBillingEmail,
}: ContactSectionProps) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [billingEmail, setBillingEmail] = useState(initialBillingEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist contact and billing fields.
  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateParentInfo(parentId, {
      phone_number: phone,
      billing_email: billingEmail,
    });
    setSaving(false);
    if (result.success) {
      setEditing(false);
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  // Revert unsaved contact and billing edits.
  function handleCancel() {
    setPhone(initialPhone ?? "");
    setBillingEmail(initialBillingEmail ?? "");
    setError(null);
    setEditing(false);
  }

  return (
    <SectionCard
      title="Contact & Billing"
      editing={editing}
      saving={saving}
      error={error}
      onEdit={() => setEditing(true)}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <div className="grid grid-cols-1 gap-4">
        <Field label="Login Email">
          <ValueText className="text-gray-400">{accountEmail}</ValueText>
          <p className="text-xs text-gray-500 mt-0.5">
            Login email cannot be changed here
          </p>
        </Field>
        <Field label="Phone Number">
          {editing ? (
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="+1 (555) 000-0000"
              type="tel"
            />
          ) : (
            <ValueText>{phone || "—"}</ValueText>
          )}
        </Field>
        <Field label="Billing Email">
          {editing ? (
            <input
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              className={inputClass}
              placeholder="billing@example.com"
              type="email"
            />
          ) : (
            <ValueText>{billingEmail || "—"}</ValueText>
          )}
        </Field>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Security Section (PIN)
// ---------------------------------------------------------------------------
function SecuritySection({
  parentId,
  hasPin,
}: {
  parentId: string;
  hasPin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinRemoved, setPinRemoved] = useState(false);

  const pinIsSet = hasPin && !pinRemoved;

  // Validate and persist PIN changes; empty PIN removes existing protection.
  async function handleSave() {
    if (newPin && newPin !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateParentPin(parentId, newPin);
    setSaving(false);
    if (result.success) {
      if (!newPin) setPinRemoved(true);
      setNewPin("");
      setConfirmPin("");
      setEditing(false);
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  // Clear pending PIN edits and close edit mode.
  function handleCancel() {
    setNewPin("");
    setConfirmPin("");
    setError(null);
    setEditing(false);
  }

  return (
    <SectionCard
      title="Security"
      editing={editing}
      saving={saving}
      error={error}
      onEdit={() => setEditing(true)}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <Field label="Profile Access PIN">
        {editing ? (
          <div className="flex flex-col gap-3">
            <input
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className={inputClass}
              placeholder="New PIN (leave blank to remove)"
              type="password"
              maxLength={6}
            />
            {newPin && (
              <input
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className={inputClass}
                placeholder="Confirm PIN"
                type="password"
                maxLength={6}
              />
            )}
            <p className="text-xs text-gray-500">
              The PIN protects this parent profile during profile selection.
              Leave blank to remove.
            </p>
          </div>
        ) : (
          <div>
            <ValueText>{pinIsSet ? "••••" : "Not set"}</ValueText>
            {!pinIsSet && (
              <p className="text-xs text-gray-500 mt-0.5">
                Add a PIN to protect this profile
              </p>
            )}
          </div>
        )}
      </Field>
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

/**
 * Standard labeled field wrapper used across card sections.
 */
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

/**
 * Shared value text style for non-editing field content.
 */
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

/**
 * UI SVG sub-component - Caret pointing right (used in the back button)
 */
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

function CaretRight() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="26"
      viewBox="0 0 40 46"
      fill="none"
    >
      <path
        d="M13.4503 24.0408L27.3828 39.3071C27.6152 39.5619 27.9241 39.7041 28.2453 39.7041C28.5664 39.7041 28.8753 39.5619 29.1078 39.3071L29.1228 39.2898C29.2358 39.1663 29.3259 39.0176 29.3874 38.8527C29.449 38.6879 29.4807 38.5104 29.4807 38.331C29.4807 38.1516 29.449 37.9741 29.3874 37.8093C29.3259 37.6445 29.2358 37.4958 29.1228 37.3722L16.0028 22.9972L29.1228 8.62795C29.2358 8.50441 29.3259 8.35569 29.3874 8.19086C29.449 8.02603 29.4807 7.84852 29.4807 7.66914C29.4807 7.48976 29.449 7.31226 29.3874 7.14742C29.3259 6.98259 29.2358 6.83388 29.1228 6.71033L29.1078 6.69308C28.8753 6.43822 28.5664 6.29605 28.2453 6.29605C27.9241 6.29605 27.6152 6.43822 27.3828 6.69308L13.4503 21.9593C13.3277 22.0936 13.2302 22.2551 13.1635 22.434C13.0969 22.6129 13.0625 22.8055 13.0625 23.0001C13.0625 23.1947 13.0969 23.3873 13.1635 23.5662C13.2302 23.7451 13.3277 23.9066 13.4503 24.0408Z"
        fill="#65CFAD"
      />
    </svg>
  );
}

const inputClass =
  "w-full bg-[#1f2e3b] text-white text-sm border border-[#B1E7D6]/40 rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-[#B1E7D6] transition-colors";
