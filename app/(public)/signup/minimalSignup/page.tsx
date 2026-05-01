"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
export default function MinimalSignup() {
    const [email, setEmail] = useState("");
    const [parentFirstName, setParentFirstName] = useState("");
    const [parentLastName, setParentLastName] = useState("");
    const [studentFirstName, setStudentFirstName] = useState("");
    const [studentLastName, setStudentLastName] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sessionStorage.setItem(
            "signup",
            JSON.stringify({email, password, parentFirstName, parentLastName, studentFirstName, studentLastName})
        )
        router.push(`/payments?studentId=new`)
    };

    const router = useRouter();
    return (
        <div className='flex justify-center items-center min-w-screen min-h-screen'>


            <form
                onSubmit={handleSubmit}
                className="bg-[#b1e7d6] rounded-[20px] p-8 text-[#111827] shadow-[0_10px_25px_rgba(0,0,0,0.2)] max-w-xl mx-auto"
            >
                <h2 className="text-2xl font-bold mb-6 text-[#2b4257]">
                    Create Account
                </h2>

                {/* Parent Info */}
                <h3 className="text-lg font-semibold mb-2">Parent Info</h3>

                <div className="flex gap-3 mb-4">
                    <input
                        type="text"
                        placeholder="First name"
                        value={parentFirstName}
                        onChange={(e) => setParentFirstName(e.target.value)}
                        required
                        className="w-1/2 p-3 rounded-lg border border-gray-300"
                    />
                    <input
                        type="text"
                        placeholder="Last name"
                        value={parentLastName}
                        onChange={(e) => setParentLastName(e.target.value)}
                        required
                        className="w-1/2 p-3 rounded-lg border border-gray-300"
                    />
                  
                </div>
                  <input
                        type = 'password'
                        placeholder="Password"
                        value = {password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-1/2 p-3 rounded-lg border border-gray-300 mb-6"
                    />

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full p-3 rounded-lg border border-gray-300 mb-6"
                />

                {/* Student Info */}
                <h3 className="text-lg font-semibold mb-2">Student Info</h3>

                <div className="flex gap-3 mb-6">
                    <input
                        type="text"
                        placeholder="First name"
                        value={studentFirstName}
                        onChange={(e) => setStudentFirstName(e.target.value)}
                        required
                        className="w-1/2 p-3 rounded-lg border border-gray-300"
                    />
                    <input
                        type="text"
                        placeholder="Last name"
                        value={studentLastName}
                        onChange={(e) => setStudentLastName(e.target.value)}
                        required
                        className="w-1/2 p-3 rounded-lg border border-gray-300"
                    />
                </div>
                <div className="bg-[#b1e7d6] text-[#2b4257] text-sm font-medium px-4 py-3 rounded-lg mt-4 mb-4 shadow-[0_4px_10px_rgba(0,0,0,0.1)] text-center">
                    Note: You can onboard more students later.
                </div>
                <button
                    type="submit"
                    className="w-full bg-[#2b4257] text-white font-bold py-3 rounded-full"
                >
                    Continue to Payment
                </button>
            </form>
        </div>
    );
}