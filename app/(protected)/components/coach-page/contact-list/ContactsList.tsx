export type Contact = {
  id: string;
  name: string;
};

export type ContactsListProps = {
  contacts?: Contact[];
  filter?: string;
  onContactClick?: (contactId: string) => void;
};

export default function ContactsList({
  contacts = [],
  filter = "",
  onContactClick,
}: ContactsListProps) {

  const filterString = filter.trim().toLowerCase();
  const visible = filterString
    ? contacts.filter((c) =>
        c.name.toLowerCase().includes(filterString)
      )
    : contacts;

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((c) => (
        <div
          key={c.id}
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent input from losing focus
            onContactClick?.(c.id);
          }}
          className="flex items-center w-full h-13 px-3 py-1.5 
            rounded-lg bg-white cursor-pointer"
        >
          <div className="bg-[#1F2E3B] h-full w-9 rounded-md flex justify-center items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M21.3243 20.0625C19.7755 17.385 17.293 15.5569 14.4168 14.8978C15.7835 14.3379 16.9134 13.3207 17.6134 12.0201C18.3135 10.7195 18.5402 9.21625 18.2548 7.76708C17.9694 6.3179 17.1897 5.01278 16.0489 4.07468C14.9081 3.13658 13.4769 2.62372 11.9999 2.62372C10.5229 2.62372 9.09173 3.13658 7.9509 4.07468C6.81007 5.01278 6.03037 6.3179 5.74501 7.76708C5.45966 9.21625 5.68636 10.7195 6.38637 12.0201C7.08639 13.3207 8.21629 14.3379 9.58303 14.8978C6.71053 15.5541 4.22428 17.385 2.67553 20.0625C2.6307 20.1482 2.62071 20.2479 2.64766 20.3408C2.67461 20.4337 2.73641 20.5126 2.82015 20.561C2.90388 20.6094 3.00309 20.6236 3.09703 20.6006C3.19097 20.5775 3.27239 20.5191 3.32428 20.4375C5.15616 17.2678 8.40178 15.375 11.9999 15.375C15.598 15.375 18.8437 17.2678 20.6755 20.4375C20.7084 20.4945 20.7557 20.5418 20.8126 20.5747C20.8696 20.6076 20.9341 20.6249 20.9999 20.625C21.0658 20.6252 21.1306 20.6077 21.1874 20.5744C21.2734 20.5246 21.3361 20.4427 21.3617 20.3468C21.3874 20.2508 21.3739 20.1486 21.3243 20.0625ZM6.37491 9C6.37491 7.88748 6.70481 6.79995 7.32289 5.87492C7.94097 4.94989 8.81948 4.22892 9.84731 3.80318C10.8751 3.37744 12.0061 3.26604 13.0973 3.48308C14.1884 3.70013 15.1907 4.23586 15.9774 5.02253C16.7641 5.8092 17.2998 6.81148 17.5168 7.90262C17.7339 8.99376 17.6225 10.1248 17.1967 11.1526C16.771 12.1804 16.05 13.0589 15.125 13.677C14.2 14.2951 13.1124 14.625 11.9999 14.625C10.5086 14.6233 9.07887 14.0301 8.02435 12.9756C6.96983 11.921 6.37664 10.4913 6.37491 9Z"
                fill="#B1E7D6"
              />
            </svg>
          </div>
          <p className="ml-3 text-[#1f2e3b]">{c.name}</p>
          <div
            className="w-6 h-6 rounded-full border-2 border-[#1F2E3B]
           text-[#1F2E3B] text-center ml-auto"
          >
            1
          </div>
        </div>
      ))}
    </div>
  );
}
