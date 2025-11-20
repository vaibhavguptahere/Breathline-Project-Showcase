import { authenticateToken } from '@/middleware/auth';
import MedicalRecord from '@/models/MedicalRecord';
import connectDB from '@/lib/mongodb';
import { uploadFileToCloudinary } from '@/lib/cloudinary';

export async function POST(request) {
  try {
    const auth = await authenticateToken(request);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const { user } = auth;
    if (user.role !== 'patient') {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files');
    const title = formData.get('title');
    const description = formData.get('description');
    const category = formData.get('category');
    const recordDate = formData.get('recordDate');
    const isEmergencyVisible = formData.get('isEmergencyVisible') === 'true';

    if (!files || files.length === 0) {
      return Response.json({ error: 'No files uploaded' }, { status: 400 });
    }

    await connectDB();

    const fileData = [];

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      try {
        const cloudinaryResult = await uploadFileToCloudinary(
          uint8Array,
          file.name,
          `medical-records/${user._id}`
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

    const record = new MedicalRecord({
      patientId: user._id,
      title: title || 'Uploaded Document',
      description: description || '',
      category: category || 'general',
      files: fileData,
      metadata: {
        recordDate: recordDate ? new Date(recordDate) : new Date(),
        isEmergencyVisible,
      },
    });

    await record.save();

    return Response.json({
      message: 'Files uploaded successfully',
      record,
    }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
