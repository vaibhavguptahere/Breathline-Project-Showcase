import { authenticateToken } from '@/middleware/auth';
import DoctorVerificationCache from '@/models/DoctorVerificationCache';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
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

  return { success: true, userId: user._id };
}

export async function PATCH(request) {
  try {
    const auth = await authenticateToken(request);
    const adminCheck = await checkAdminAccess(auth);
    if (adminCheck.error) {
      return Response.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id, action, notes } = await request.json();

    if (!id || !['approve', 'reject'].includes(action)) {
      return Response.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !notes) {
      return Response.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const verification = await DoctorVerificationCache.findById(id);
    if (!verification) {
      return Response.json(
        { error: 'Verification not found' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      verification.status = 'verified';
      verification.adminReviewedAt = new Date();
      verification.adminReviewedBy = adminCheck.userId;
      if (notes) {
        verification.adminNotes = notes;
      }
    } else {
      verification.status = 'unverified';
      verification.adminReviewedAt = new Date();
      verification.adminReviewedBy = adminCheck.userId;
      verification.adminNotes = notes;
    }

    await verification.save();

    await AuditLog.create({
      action: action === 'approve' ? 'DOCTOR_LICENSE_VERIFIED' : 'DOCTOR_LICENSE_REJECTED',
      actorId: adminCheck.userId,
      actorRole: 'admin',
      targetType: 'doctor_verification',
      targetId: id,
      description: `Admin ${action}ed doctor license: ${verification.licenseNumber}`,
      details: {
        licenseNumber: verification.licenseNumber,
        action,
        notes,
      },
      severity: 'high',
    });

    return Response.json({
      message: `Verification ${action}ed successfully`,
      verification,
    });
  } catch (error) {
    console.error('Doctor verification action error:', error);
    return Response.json(
      { error: 'Failed to process verification' },
      { status: 500 }
    );
  }
}
