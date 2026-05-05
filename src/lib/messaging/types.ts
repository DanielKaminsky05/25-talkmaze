export type Contact = {
  id: string;
  name: string;
  email: string;
};

export type Message = {
  id: string;
  text: string;
  created_at: string;
  sender_id: string;
  sender: {
    name: string;
    avatar_url: string | null;
  };
};
