import { Link } from "react-router";

export function meta() {
  return [
    { title: "Face Recognition" },
    { name: "description", content: "Face registration and verification demo" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Face Recognition</h1>
        <p className="text-gray-500 text-sm">Register and verify faces using your webcam</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm">
        <Link
          to="/face/register"
          className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-center"
        >
          <span className="text-4xl">📸</span>
          <span className="font-semibold text-gray-900">Register Face</span>
          <span className="text-xs text-gray-500">Add a new person with their face</span>
        </Link>

        <Link
          to="/face/verify"
          className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-center"
        >
          <span className="text-4xl">🔍</span>
          <span className="font-semibold text-gray-900">Verify Face</span>
          <span className="text-xs text-gray-500">Check if a face matches a user</span>
        </Link>
      </div>
    </div>
  );
}
