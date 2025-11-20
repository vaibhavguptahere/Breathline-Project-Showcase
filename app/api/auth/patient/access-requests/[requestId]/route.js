import { NextResponse } from "next/server";
import { authenticateToken } from "@/middleware/auth";
import AccessRequest from "@/models/AccessRequest";
import MedicalRecord from "@/models/MedicalRecord";
import connectDB from "@/lib/mongodb";

export async function PATCH(request, { params }) {
  try {
    await connectDB();

    // Authenticate user
    const auth = await authenticateToken(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { user } = auth;

    if (user.role !== "patient") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // ⭐ FIXED — Correct params destructuring
    const { requestId } = params;

    // ⭐ FIXED — Correct body parsing
    const body = await request.json();
    const { action, responseMessage, durationDays } = body;

    if (!["approve", "deny"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Fetch the access request
    const accessRequest = await AccessRequest.findById(requestId).populate(
      "doctorId",
      "profile.firstName profile.lastName profile.specialization email"
    );

    if (!accessRequest) {
      return NextResponse.json(
        { error: "Access request not found" },
        { status: 404 }
      );
    }

    // Ensure patient owns this request
    if (accessRequest.patientId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update status
    const status = action === "approve" ? "approved" : "denied";
    accessRequest.status = status;
    accessRequest.responseMessage = responseMessage || "";
    accessRequest.respondedAt = new Date();

    // If approved, grant access
    if (action === "approve") {
      const days = durationDays || 30;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      accessRequest.expiresAt = expiresAt;

      const recordCategories = accessRequest.recordCategories.includes("all")
        ? [
            "general",
            "lab-results",
            "prescription",
            "imaging",
            "emergency",
            "consultation",
          ]
        : accessRequest.recordCategories;

      await MedicalRecord.updateMany(
        {
          patientId: user._id,
          category: { $in: recordCategories },
        },
        {
          $push: {
            accessPermissions: {
              doctorId: accessRequest.doctorId._id,
              granted: true,
              grantedAt: new Date(),
              expiresAt,
              accessLevel: accessRequest.accessLevel,
            },
          },
        }
      );
    }

    await accessRequest.save();

    return NextResponse.json({
      message:
        status === "approved"
          ? "Access request approved successfully"
          : "Access request denied successfully",
      request: accessRequest,
    });
  } catch (error) {
    console.error("Update access request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
