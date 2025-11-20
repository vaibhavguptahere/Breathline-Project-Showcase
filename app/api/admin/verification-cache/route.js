import { authenticateToken } from '@/middleware/auth';
import DoctorVerificationCache from '@/models/DoctorVerificationCache';
import HospitalVerificationCache from '@/models/HospitalVerificationCache';
import User from '@/models/User';
import connectDB from '@/lib/mongodb';

async function checkAdminAccess(auth) {
  if (auth.error) {
    return { error: auth.error, status: auth.status };
  }

  const { user } = auth;
  if (user.role !== 'admin') {
    return { error: 'Access denied', status: 403 };
  }

  await connectDB();
  const adminUser = await User.findById(user._id);
  if (!adminUser) {
    return { error: 'User not found', status: 404 };
  }

  return { success: true };
}

export async function GET(request) {
  try {
    const auth = await authenticateToken(request);
    const adminCheck = await checkAdminAccess(auth);
    if (adminCheck.error) {
      return Response.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status') || 'manual_review';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    await connectDB();

    let verifications = [];

    if (!type || type === 'doctor') {
      const doctor = await DoctorVerificationCache.find({ status })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });
      verifications = [...verifications, ...doctor];
    }

    if (!type || type === 'hospital') {
      const hospital = await HospitalVerificationCache.find({ status })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });
      verifications = [...verifications, ...hospital];
    }

    return Response.json({
      data: verifications,
      count: verifications.length,
    });
  } catch (error) {
    console.error('Get verification cache error:', error);
    return Response.json(
      { error: 'Failed to fetch verifications' },
      { status: 500 }
    );
  }
}
