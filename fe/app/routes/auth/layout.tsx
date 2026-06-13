import { Outlet } from "react-router";

export default function AuthLayout() {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-red-100">
            <div className="w-full rounded-lg bg-white p-8 shadow-md md:w-1/3">
                <p className="text-lg font-bold text-gray-800">Auth</p>
                <Outlet />
            </div>
        </div>
    );
}
