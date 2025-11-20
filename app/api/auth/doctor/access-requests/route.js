import { authenticateToken } from '@/middleware/auth';
import AccessRequest from '@/models/AccessRequest';
import connectDB from '@/lib/mongodb';

export async function GET(request) {
  try {
    const auth = await authenticateToken(request);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const { user } = auth;
    if (user.role !== 'doctor') {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    const accessRequests = await AccessRequest.find({ doctorId: user._id })
      .populate('patientId', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 });

    const formatted = accessRequests.map((r) => ({
      id: r._id.toString(),
      patientName: `${r.patientId.profile.firstName} ${r.patientId.profile.lastName}`,
      patientEmail: r.patientId.email,
      reason: r.reason,
      accessLevel: r.accessLevel,
      recordCategories: r.recordCategories,
      urgency: r.urgency,
      status: r.status,
      requestedAt: r.createdAt,
    }));

    return Response.json({ requests: formatted });
  } catch (error) {
    console.error('Get access requests error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
