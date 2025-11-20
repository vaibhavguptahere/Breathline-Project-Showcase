import { authenticateToken } from '@/middleware/auth';
import MedicalRecord from '@/models/MedicalRecord';
import AccessLog from '@/models/AccessLog';
import connectDB from '@/lib/mongodb';
import { uploadFileToCloudinary } from '@/lib/cloudinary';

export async function POST(request, context) {
  try {
    const auth = await authenticateToken(request);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const { user } = auth;
    if (user.role !== 'doctor') {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const { patientId } = await context.params;

    const formData = await request.formData();
    const files = formData.getAll('files');
    const recordId = formData.get('recordId');
    const title = formData.get('title');
    const description = formData.get('description');
    const category = formData.get('category') || 'general';
    const recordDate = formData.get('recordDate');

    if (!files || files.length === 0) {
      return Response.json({ error: 'No files uploaded' }, { status: 400 });
    }

    await connectDB();

    let record;

    if (recordId) {
      record = await MedicalRecord.findById(recordId);
      if (!record) {
        return Response.json({ error: 'Record not found' }, { status: 404 });
      }
    } else {
      if (!title) {
        return Response.json({ error: 'Title is required for new records' }, { status: 400 });
      }
      record = new MedicalRecord({
        patientId,
        title,
        description: description || '',
        category,
        files: [],
        metadata: {
          doctorId: user._id,
          recordDate: recordDate ? new Date(recordDate) : new Date(),
          isEmergencyVisible: false,
        },
      });
    }

    const fileData = [];

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      try {
        const cloudinaryResult = await uploadFileToCloudinary(
          uint8Array,
          file.name,
          `medical-records/${patientId}/doctor-uploads`
        );

        fileData.push({
          filename: cloudinaryResult.publicId,
          originalName: file.name,
          mimetype: file.type,
          size: cloudinaryResult.size,
          cloudinaryUrl: cloudinaryResult.url,
          cloudinaryPublicId: cloudinaryResult.publicId,
          encrypted: true,
          uploadedAt: cloudinaryResult.uploadedAt,
        });
      } catch (uploadError) {
        console.error(`Error uploading ${file.name}:`, uploadError);
        return Response.json(
          { error: `Failed to upload ${file.name}: ${uploadError.message}` },
          { status: 500 }
        );
      }
    }

    record.files.push(...fileData);

    if (!record.metadata.doctorId) {
      record.metadata.doctorId = user._id;
    }

    if (recordDate) {
      record.metadata.recordDate = new Date(recordDate);
    }

    await record.save();

    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const accessLog = new AccessLog({
      patientId,
      accessorId: user._id,
      recordId: record._id,
      accessType: 'upload',
      accessReason: `Doctor uploaded ${fileData.length} file(s) to record: ${record.title}`,
      ipAddress: clientIp,
      userAgent: userAgent,
    });

    await accessLog.save();

    return Response.json({
      message: 'Files uploaded successfully',
      record,
    }, { status: 201 });
  } catch (error) {
    console.error('Doctor upload error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
