"use client";
import React from "react";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { handleStudentCreation, updateStudentAvatar, setActiveProfile } from "./actions";
import { OnboardingTimeZone, TIME_ZONES } from "./types";
import { createClient } from "@/src/services/supabase/client";
import { useRef, useEffect } from "react";
import { getStudentOnboardingProgress, handleUpdateStudent} from "./actions";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const onBoardSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  grade: z.number().min(1, "Please select a grade"),
  timeZone: z.string().min(1, "Time zone is required"),
  notes: z.string().optional(),
  availability: z.record(
    z.string(),
    z.array(
      z.object({
        start: z.string().min(1, "Start time required"),
        end: z.string().min(1, "End time required"),
      }).refine((data) => {
        if (!data.start || !data.end) return true;
        return data.end > data.start;
      }, {
        message: "End time must be after start time",
        path: ["end"],
      }),
    ),
  ).refine((val) => {
    const entries = Object.entries(val);
    if (entries.length === 0) return false;
    // Check if every enabled day has at least one valid slot
    return entries.every(([_, slots]) => slots.some(slot => slot.start && slot.end));
  }, {
    message: "Please ensure all selected days have valid time slots",
  }),
});


export default function Onboarding() {
  const router = useRouter();

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [grade, setGrade] = useState<number>(1);
  const [timeZone, setTimeZone] = useState<OnboardingTimeZone>("America/Toronto");
  const [notes, setNotes] = useState<string>("");
  const [pageNum, setPage] = useState<number>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isFirst, setIsFirst] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  //before anything need to check if student was the first one created from initial onboarding

  useEffect(() => {
    async function getOnboardingProgress() {
      console.log("Getting onboarding progress")
      const response = await getStudentOnboardingProgress();


      if (response != null) {
        console.log("response is not null")
        setFirstName(response.first_name)
        setLastName(response.last_name);
        setIsFirst(true);
      }
    }

    getOnboardingProgress();
  }, [])
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Please select an image under 2MB.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        alert("Invalid file type. Please select an image.");
        return;
      }

      const allowedExtensions = ["png", "jpg", "jpeg", "webp", "gif"];
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      if (!fileExt || !allowedExtensions.includes(fileExt)) {
        alert(`Invalid file extension. Please use: ${allowedExtensions.join(", ")}`);
        return;
      }

      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };
  type Slot = { start: string; end: string };
  const [weeklyAvailability, setWeeklyAvailability] = useState<
    Record<string, Slot[]>
  >({});
  const toggleDay = (day: string) => {
    setWeeklyAvailability((prev) => {
      const copy = { ...prev };
      if (copy[day]) {
        delete copy[day];
      } else {
        copy[day] = [{ start: "", end: "" }];
      }
      return copy;
    });
  };

  const isDayEnabled = (day: string) => {
    return !!weeklyAvailability[day];
  };

  const getSlots = (day: string) => {
    return weeklyAvailability[day] || [];
  };

  const addSlot = (day: string) => {
    setWeeklyAvailability((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: "", end: "" }],
    }));
  };

  const updateSlot = (
    day: string,
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    setWeeklyAvailability((prev) => {
      const updated = [...prev[day]];
      updated[index][field] = value;
      return { ...prev, [day]: updated };
    });
  };

  const removeSlot = (day: string, index: number) => {
    setWeeklyAvailability((prev) => {
      const slots = prev[day];
      if (!slots) return prev;

      const updated = slots.filter((_, i) => i !== index);

      const newState = { ...prev };

      if (updated.length === 0) {
        delete newState[day];
      } else {
        newState[day] = updated;
      }

      return newState;
    });
  };

  const validateStep1 = () => {
    const result = onBoardSchema.pick({
      firstName: true,
      lastName: true,
      grade: true,
      timeZone: true,
    }).safeParse({
      firstName,
      lastName,
      grade,
      timeZone,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        newErrors[issue.path.join(".")] = issue.message;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const validateStep2 = () => {
    const result = onBoardSchema.pick({
      availability: true,
    }).safeParse({
      availability: weeklyAvailability,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        newErrors[issue.path.join(".")] = issue.message;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  return (
    <div
      className={`${inter.className} min-h-screen bg-[#2B4257] flex items-center justify-center p-4`}
    >
      <div className="flex w-full max-w-[1229px] shadow-[0px_4px_20px_rgba(0,0,0,0.1)] min-h-[661px]">
        <div
          className="w-full lg:w-[1229px] bg-white flex flex-col items-center justify-center py-12 px-8 relative z-10"
          style={{ borderRadius: "12px" }}
        >
          <div className="w-full max-w-[400px] flex flex-col gap-[18px]">
            <div className="flex flex-col items-center mb-4">
              <Image
                src="/talkmaze_logo.svg"
                alt="TalkMaze Logo"
                width={150}
                height={120}
                className="h-[120px] w-auto object-contain"
                priority
              />
            </div>
            {
              isFirst && (
                <div className="mt-6 text-center">
                  <h1 className="text-2xl md:text-3xl font-bold text-[#2b4257]">
                    Finish setting up {firstName} {lastName}'s account!
                  </h1>


                  <div className="mt-3 w-16 h-1 bg-[#65CFAD] mx-auto rounded-full" />
                </div>
              )
            }
            {pageNum == 1 && (
              <form
                className="flex flex-col gap-[14px]"
              >
                <div>
                  <p className="text-[#A8A8A8]">Please enter your full name.</p>
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="relative h-[58px]">
                      <input
                        type="text"
                        placeholder="First Name"
                        value={firstName}
                        className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] ${errors.firstName ? "border-red-500" : "border-[#1F2E3B]/20"}`}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          if (errors.firstName) setErrors(prev => {
                            const newErrs = { ...prev };
                            delete newErrs.firstName;
                            return newErrs;
                          });
                        }}
                      />
                    </div>
                    {errors.firstName && <p className="text-red-500 text-xs ml-1 mt-0.5">{errors.firstName}</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="relative h-[58px]">
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] ${errors.lastName ? "border-red-500" : "border-[#1F2E3B]/20"}`}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (errors.lastName) setErrors(prev => {
                          const newErrs = { ...prev };
                          delete newErrs.lastName;
                          return newErrs;
                        });
                      }}
                    />
                  </div>
                  {errors.lastName && <p className="text-red-500 text-xs ml-1 mt-0.5">{errors.lastName}</p>}
                </div>





                <div className="mt-3">
                  <p className="text-[#A8A8A8]">Please select your grade.</p>
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="relative h-[58px]">
                      <select
                        value={grade ?? ""}
                        onChange={(e) => {
                          setGrade(Number(e.target.value));
                          if (errors.grade) setErrors(prev => {
                            const newErrs = { ...prev };
                            delete newErrs.grade;
                            return newErrs;
                          });
                        }}
                        className={`w-full h-full px-5 text-[20px] border-[0.7px] bg-white appearance-none cursor-pointer ${errors.grade ? "border-red-500" : "border-[#1F2E3B]/20"} text-[#1F2E3B]`
                        }
                      >
                        <option value="" disabled hidden>
                          Grade
                        </option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (g) => (
                            <option key={g} value={g}>
                              Grade {g}
                            </option>
                          ),
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                        <svg
                          className="w-5 h-5 text-[#1F2E3B]/60"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                    {errors.grade && <p className="text-red-500 text-xs ml-1 mt-0.5">{errors.grade}</p>}
                  </div>
                </div>



                <div className="mt-3">
                  <p className="text-[#A8A8A8]">
                    Please select your time zone.
                  </p>
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="relative h-[58px]">
                      <select
                        value={timeZone}
                        onChange={(e) => {
                          setTimeZone(e.target.value as OnboardingTimeZone);
                          if (errors.timeZone) setErrors(prev => {
                            const newErrs = { ...prev };
                            delete newErrs.timeZone;
                            return newErrs;
                          });
                        }}
                        className={`w-full h-full px-5 text-[20px] text-[#1F2E3B] border-[0.7px] bg-white appearance-none cursor-pointer ${errors.timeZone ? "border-red-500" : "border-[#1F2E3B]/20"}`}
                      >
                        {TIME_ZONES.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                        <svg
                          className="w-5 h-5 text-[#1F2E3B]/60"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                    {errors.timeZone && <p className="text-red-500 text-xs ml-1 mt-0.5">{errors.timeZone}</p>}
                  </div>
                </div>


                <div className="mt-3">
                  <p className="text-[#A8A8A8]">Any additional notes?</p>
                  <div className="flex flex-col gap-1">
                    <div className="relative h-[150px] w-[400px]">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes..."
                        className="w-full h-full px-5 py-4 text-[20px] text-[#1F2E3B] placeholder-[#1F2E3B]/60 border-[0.7px] resize-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 mx-auto h-[38px] mt-2 bg-[#B1E7D6] rounded-[12px] text-[20px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity disabled:opacity-50"
                  onClick={(e) => {
                    e.preventDefault();
                    if (validateStep1()) setPage(2);
                  }}
                >
                  Next
                </button>

                <div className="text-center mt-2">
                  <p className="text-[#1F2E3B]">
                    <Link href="/profiles" className="font-bold hover:underline">
                      exit
                    </Link>
                  </p>
                </div>
              </form>
            )}
            {pageNum == 2 && (
              <form
                className="flex flex-col gap-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (validateStep2()) setPage(3);
                }}
              >
                <p className="text-[#A8A8A8]">Set your weekly availability.</p>
                {errors.availability && <p className="text-red-500 text-sm font-medium -mt-4">{errors.availability}</p>}

                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <div key={day} className="border p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-[#1F2E3B]">
                        {day}
                      </span>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDayEnabled(day)}
                          onChange={() => toggleDay(day)}
                          className="sr-only peer"
                        />

                        <div
                          className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#B1E7D6] transition-colors duration-200"
                        ></div>

                        <div
                          className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-5"
                        ></div>
                      </label>
                    </div>

                    {isDayEnabled(day) && (
                      <div className="flex flex-col gap-2">
                        {getSlots(day).map((slot, idx) => (
                          <div key={idx} className="flex flex-col gap-1">
                            <div className="flex gap-2 items-center">
                              <input
                                type="time"
                                value={slot.start}
                                onChange={(e) =>
                                  updateSlot(day, idx, "start", e.target.value)
                                }
                                className="border px-2 py-1"
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={slot.end}
                                onChange={(e) =>
                                  updateSlot(day, idx, "end", e.target.value)
                                }
                                className="border px-2 py-1"
                              />

                              <button
                                type="button"
                                onClick={() => removeSlot(day, idx)}
                                className="text-red-500"
                              >
                                ✕
                              </button>
                            </div>
                            {errors[`availability.${day}.${idx}.end`] && (
                              <p className="text-red-500 text-xs ml-1">{errors[`availability.${day}.${idx}.end`]}</p>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addSlot(day)}
                          className="text-sm text-green-600 mt-1"
                        >
                          + Add time
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex flex-col gap-3 mt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-1/2 mx-auto h-[38px] bg-[#B1E7D6] rounded-[12px] text-[20px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Next
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    className="text-[#1F2E3B] hover:underline text-sm font-medium text-center"
                  >
                    Back to student info
                  </button>
                </div>

                <div className="text-center mt-2">
                  <p className="text-[#1F2E3B]">
                    <Link href="/profiles" className="font-bold hover:underline">
                      exit
                    </Link>
                  </p>
                </div>
              </form>
            )}
            {pageNum == 3 && (
              <form
                className="flex flex-col gap-6"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (isSubmitting) return;
                  setIsSubmitting(true);
                    try {
                      const res = await handleStudentCreation(
                        firstName,
                        lastName,
                        grade,
                        notes,
                        timeZone,
                        weeklyAvailability,
                        isFirst
                      );

                      if (res.success) {
                        if (avatarFile && res.student_id) {
                          try {
                            const supabase = createClient();
                            const fileExt = avatarFile.name.split(".").pop();
                            const filePath = `students/${res.student_id}/avatar-${Date.now()}.${fileExt}`;

                            const { error: uploadError } = await supabase.storage
                              .from("avatars")
                              .upload(filePath, avatarFile);

                            if (!uploadError) {
                              const { data: { publicUrl } } = supabase.storage
                                .from("avatars")
                                .getPublicUrl(filePath);

                              await updateStudentAvatar(res.student_id, publicUrl);
                            } else {
                              console.error("Avatar upload failed:", uploadError);
                              alert("Profile created, but avatar upload failed. You can update it later in settings.");
                            }
                          } catch (err) {
                            console.error("Storage error:", err);
                          }
                        }

                        // Set active profile to the new student
                        await setActiveProfile(res.student_id, "student");

                        router.push("/payments");
                      } else {
                        alert(res.error || "Failed to create student profile");
                        setIsSubmitting(false);
                      }
                    } catch (err) {
                      console.error(err);
                      alert("An unexpected error occurred");
                      setIsSubmitting(false);
                    
                  }
                }}
              >
                <div className="flex flex-col items-center gap-4">
                  <h2 className="text-xl font-bold text-[#1F2E3B] text-center">Profile Picture</h2>
                  <p className="text-[#A8A8A8] text-center">
                    Upload an image of your child to personalize their profile.
                  </p>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-40 h-40 rounded-full bg-[#F3F4F6] border-4 border-dashed border-[#B1E7D6] flex items-center justify-center cursor-pointer overflow-hidden relative group transition-all hover:border-solid hover:shadow-md"
                  >
                    {avatarPreview ? (
                      <Image src={avatarPreview} alt="Avatar preview" fill className="object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm text-gray-500 font-medium">Click to upload</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-bold">Change Image</span>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="bg-[#B1E7D6]/20 border border-[#B1E7D6] rounded-lg px-4 py-2 mt-2">
                    <p className="text-[#1F2E3B] text-sm font-medium text-center">
                      This step is optional. You can always add a photo later!
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-[48px] bg-[#B1E7D6] rounded-[12px] text-[20px] font-semibold text-[#1F2E3B] hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-[#1F2E3B]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating profile...
                      </>
                    ) : (
                      "Complete Onboarding"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage(2)}
                    className="text-[#1F2E3B] hover:underline text-sm font-medium text-center"
                  >
                    Back to availability
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-[#1F2E3B]">
                    <Link href="/profiles" className="font-bold hover:underline">
                      exit
                    </Link>
                  </p>
                </div>
              </form>
            )}</div>
        </div>
      </div>
    </div>
  );
}
