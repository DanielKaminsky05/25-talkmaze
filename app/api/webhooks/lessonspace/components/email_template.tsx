import dayjs from "dayjs";

interface EmailTemplateProps {
  firstName: string;
  lastName: string;
  summary: string;
  date: Date; // lesson date or summary generated date
}

export function EmailTemplate({
  firstName,
  lastName,
  summary,
  date,
}: EmailTemplateProps) {
  const formattedDate = dayjs(date).format("MMMM D, YYYY [at] h:mm A");

  return (
    <div style={{ fontFamily: "Arial, sans-serif", lineHeight: "1.6", color: "#333" }}>
      {/* Header */}
      <h1 style={{ color: "#111" }}>
        Lesson Summary
      </h1>

      {/* Greeting */}
      <p>
        Hi {firstName},
      </p>

      <p>
        Great job completing your lesson! 🎉 Here’s a summary of your session:
      </p>

      {/* Date */}
      <p style={{ fontSize: "14px", color: "#666" }}>
        <strong>Date:</strong> {formattedDate}
      </p>

      {/* Summary Box */}
      <div
        style={{
          marginTop: "20px",
          padding: "16px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
          whiteSpace: "pre-line",
        }}
      >
        {summary}
      </div>

      {/* Footer */}
      <p style={{ marginTop: "24px" }}>
        Keep up the great work!
      </p>

      <p style={{ fontSize: "12px", color: "#999" }}>
        This summary was automatically generated after your lesson.
      </p>
    </div>
  );
}