import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

// Bespoke checkout style: black hairline border + 5px radius, deliberately
// distinct from the standard Input primitive (kept raw per component-architecture
// §3 "genuine one-off"). The country-code select reuses these tokens via the
// SelectTrigger override below.
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
        <Select defaultValue="us">
          <SelectTrigger className="w-[40%] h-[45px] rounded-[5px] border-[0.5px] border-black text-black focus:border-black focus:ring-2 focus:ring-[#2b4257]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="us">1+ United States</SelectItem>
            <SelectItem value="ca">1+ Canada</SelectItem>
          </SelectContent>
        </Select>
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
