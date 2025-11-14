"use client"
import Link from "next/link";
type Props = {
  id: number,
  name: string,
  state: boolean,
  link: string,
  onSelect?: () => void,
}

export default function SideBarBox({ id, name, state, link, onSelect }: Props) {
  const backgroundColor = state ? "bg-[#B1E7D6]" : "bg-[#1F2E3B]";
  const textColor = state ? "text-[#1F2E3B]" : "text-[#B1E7D6]";

  return (
    <Link href={link}>
      <div
        className={`flex justify-center items-center w-[204px] h-[78px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] ${backgroundColor} rounded-2xl`}
        onClick={onSelect}
      >
        <p className={`${textColor} text-center`}>{name}</p>
      </div>
    </Link>
  );
}
