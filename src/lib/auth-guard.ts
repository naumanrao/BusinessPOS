import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
    const session = await auth();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized. Please log in." },
            { status: 401 }
        );
    }

    if (session.user.role !== "ADMIN") {
        return NextResponse.json(
            { error: "Forbidden. Viewer accounts cannot make changes." },
            { status: 403 }
        );
    }

    return null; // ✅ ADMIN — allow through
}