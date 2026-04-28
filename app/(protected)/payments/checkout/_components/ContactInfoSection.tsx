const inputClass =
  "w-full h-[45px] px-4 rounded-[5px] border-[0.5px] border-black text-base box-border bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#2b4257]";

export function ContactInfoSection({
  phone,
  setPhone,
  email,
  setEmail,
  firstName,
  setFirstName,
  lastName,
  setLastName,
}: {
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
}) {
  return (
    <>
      <h3 className="text-2xl font-bold text-black mt-0 mb-[15px]">
        Contact Information
      </h3>

      <div className="flex gap-[15px] mb-[10px]">
        <div className="relative w-[40%]">
          <select className={`${inputClass} w-full appearance-none pr-10`}>
            <option>1+ United States</option>
            <option>1+ Canada</option>
          </select>
          <svg
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <input
          type="tel"
          placeholder="Phone Number *"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="mb-[10px]">
        <input
          type="email"
          placeholder="Email Address *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          required
        />
      </div>

      <div className="flex gap-[15px] mb-[10px]">
        <input
          type="text"
          placeholder="First Name *"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={inputClass}
          required
        />
        <input
          type="text"
          placeholder="Last Name *"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className={inputClass}
          required
        />
      </div>
    </>
  );
}
