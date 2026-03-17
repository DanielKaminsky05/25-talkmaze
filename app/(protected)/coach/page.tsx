import MyStudents from "./components/MyStudents";

export default function CoachPage() {
  return (
    <div className="h-full w-full bg-white rounded-2xl p-8 shadow-sm">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 border-b pb-4">
        Coach Dashboard
      </h1>
      
      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          <MyStudents />
        </div>
        
        {/* Right Column (Placeholder for future widgets like Schedule/Resources) */}
        <div className="space-y-8">
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm p-6 flex flex-col items-center justify-center text-center h-48 border-dashed border-2">
            <h3 className="text-sm font-medium text-gray-900">Upcoming Schedule</h3>
            <p className="mt-1 text-sm text-gray-500">Integration coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
