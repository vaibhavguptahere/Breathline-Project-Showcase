import { authenticateToken } from '@/middleware/auth';
import DoctorVerification from '@/models/DoctorVerification';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
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

    let verification = await DoctorVerification.findOne({ doctorId: user._id });

    if (!verification) {
      verification = await DoctorVerification.create({
        doctorId: user._id,
        status: 'not_submitted',
        documents: [],
      });
    }

    return Response.json({
      status: verification.status,
      documents: verification.documents.map(doc => ({
        type: doc.type,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileUrl: doc.fileUrl,
        uploadedAt: doc.uploadedAt,
      })),
      rejectionReason: verification.rejectionReason || null,
      verificationNotes: verification.verificationNotes || null,
      suspensionReason: verification.suspensionReason || null,
      submittedAt: verification.submissionHistory?.[verification.submissionHistory.length - 1]?.submittedAt || null,
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await authenticateToken(request);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const { user } = auth;
    if (user.role !== 'doctor') {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const formData = await request.formData();
    const documents = formData.getAll('documents');
    const documentTypes = formData.getAll('documentTypes');

    if (!documents || documents.length === 0) {
      return Response.json({ error: 'No files uploaded' }, { status: 400 });
    }

    if (documents.length !== documentTypes.length) {
      return Response.json({ error: 'Mismatched documents and types' }, { status: 400 });
    }

    const validDocTypes = ['MRN', 'GOVERNMENT_ID', 'HOSPITAL_ID', 'MEDICAL_CERTIFICATE'];
    for (const docType of documentTypes) {
      if (!validDocTypes.includes(docType)) {
        return Response.json({ error: `Invalid document type: ${docType}` }, { status: 400 });
      }
    }

    await connectDB();

    let verification = await DoctorVerification.findOne({ doctorId: user._id });

    if (!verification) {
      verification = await DoctorVerification.create({
        doctorId: user._id,
        status: 'not_submitted',
        documents: [],
      });
    }

    if (['verified', 'suspended'].includes(verification.status)) {
      return Response.json(
        { error: 'Cannot modify verified or suspended verification' },
        { status: 403 }
      );
    }

    const newDocuments = [];
    for (let i = 0; i < documents.length; i++) {
      const file = documents[i];
      const docType = documentTypes[i];

      if (file.size > 10 * 1024 * 1024) {
        return Response.json(
          { error: `File ${file.name} exceeds 10MB limit` },
          { status: 400 }
        );
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        return Response.json(
          { error: `File ${file.name} has unsupported format. Use JPG, PNG, or PDF.` },
          { status: 400 }
        );
      }

      const fileUrl = `/api/files/view/${Date.now()}_${file.name}`;

      const docData = {
        type: docType,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: fileUrl,
        uploadedAt: new Date(),
      };

      newDocuments.push(docData);
    }

    verification.documents = verification.documents.filter(
      doc => !documentTypes.includes(doc.type)
    );

    verification.documents.push(...newDocuments);

    const previousStatus = verification.status;
    if (previousStatus === 'not_submitted' || previousStatus === 'need_resubmission') {
      verification.status = 'submitted';
    } else if (previousStatus === 'rejected') {
      verification.status = 'submitted';
    }

    if (!verification.submissionHistory) {
      verification.submissionHistory = [];
    }

    verification.submissionHistory.push({
      submittedAt: new Date(),
      documents: [...verification.documents],
      status: verification.status,
    });

    await verification.save();

    await User.findByIdAndUpdate(user._id, {
      'profile.verificationStatus': verification.status,
    });

    await AuditLog.create({
      action: 'DOCTOR_VERIFICATION_SUBMITTED',
      actorId: user._id,
      actorRole: 'doctor',
      targetType: 'verification',
      targetId: verification._id,
      description: `Doctor submitted verification documents`,
      details: {
        documentCount: newDocuments.length,
        documentTypes: documentTypes,
        previousStatus: previousStatus,
        newStatus: verification.status,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      userAgent: request.headers.get('user-agent'),
      severity: 'medium',
    });

    return Response.json({
      message: 'Documents uploaded successfully',
      status: verification.status,
      documents: verification.documents.map(doc => ({
        type: doc.type,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileUrl: doc.fileUrl,
        uploadedAt: doc.uploadedAt,
      })),
    });
  } catch (error) {
    console.error('Doctor verification upload error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
