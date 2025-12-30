type CoachConversationPageProps = {
  params: Promise<{
    conversationId: string;
  }>;
};

// Component rendering coach page chat-box when a contact is selected
const CoachConversationPage = async ({
  params,
}: CoachConversationPageProps) => {
  // Get the conversation id
  const { conversationId } = await params;
  // Get the messages from conversation id
  /* 
    TODO: Retrieve the messages for conversation id from server
  */

  // Handle message submit
  const handleSubmit = () => {};

  return (
    <div
      className="flex flex-col gap-4 w-full h-auto bg-[#c0f7e5] px-3 py-5
        rounded-xl shadow-[inset_0_2px_5px_rgba(0,0,0,0.6)]"
    >
      {/* Messages Display */}
      <div className="w-auto h-fit flex gap-3">
        <div
          className="min-w-[35px] h-10 bg-white rounded-sm border
         border-black"
        >
          <p className="text-center text-[#65CFAD]">PR</p>
        </div>
        <span className="px-1 py-2 bg-white rounded-[9px] grow">
          Hi Ghalia! Just wanted to say how much I'm enjoying our sessions.
          Your feedback's been super helpful! Can we focus more on persuasive
          speaking next time? Any tips?
        </span>
      </div>
      <div className="w-auto h-fit flex gap-3">
        <div
          className="min-w-[35px] h-10 bg-[#1F2E3B] rounded-sm border
         border-black text-center"
        >
          <p className="text-center text-[#65CFAD]">GA</p>
        </div>
        <span className="px-1 py-2 bg-white rounded-[9px] grow">
          Hi Priya! Glad you're finding the sessions helpful! Absolutely, we
          can work on persuasive speaking. Let's start with refining your
          argument structure and then work on delivery techniques. Sound good?
        </span>
      </div>
      <div className="w-auto h-fit flex gap-3">
        <div
          className="min-w-[35px] h-10 bg-white rounded-sm border
         border-black text-center"
        >
          <p className="text-center text-[#65CFAD]">PR</p>
        </div>
        <span className="px-1 py-2 bg-white rounded-[9px] grow">
          Sounds great, Ghalia! Thanks for your support and for helping me
          improve!
        </span>
      </div>
      {/* Send Message Input */}
      <form className="flex justify-between items-center h-15 p-2 mt-auto rounded-[9px] bg-white">
        <input type="file" id="file-input" className="hidden" />
        <label
          htmlFor="file-input"
          className="cursor-pointer flex items-center justify-center px-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="23"
            viewBox="0 0 22 23"
            fill="none"
          >
            <path
              d="M20.4383 10.6622L11.2483 19.8522C10.1225 20.9781 8.59552 21.6106 7.00334 21.6106C5.41115 21.6106 3.88418 20.9781 2.75834 19.8522C1.63249 18.7264 1 17.1994 1 15.6072C1 14.015 1.63249 12.4881 2.75834 11.3622L11.9483 2.17222C12.6989 1.42166 13.7169 1 14.7783 1C15.8398 1 16.8578 1.42166 17.6083 2.17222C18.3589 2.92279 18.7806 3.94077 18.7806 5.00222C18.7806 6.06368 18.3589 7.08166 17.6083 7.83222L8.40834 17.0222C8.03306 17.3975 7.52406 17.6083 6.99334 17.6083C6.46261 17.6083 5.95362 17.3975 5.57834 17.0222C5.20306 16.6469 4.99222 16.138 4.99222 15.6072C4.99222 15.0765 5.20306 14.5675 5.57834 14.1922L14.0683 5.71222"
              stroke="#1F2E3B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </label>
        <input type="text" placeholder="Type a message" className="grow" />
        <button type="submit" className="mr-6 cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M22 2L11 13"
              stroke="#1F2E3B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 2L15 22L11 13L2 9L22 2Z"
              stroke="#1F2E3B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default CoachConversationPage;
