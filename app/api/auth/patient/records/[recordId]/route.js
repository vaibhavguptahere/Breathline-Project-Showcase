import { authenticateToken } from '@/middleware/auth';
import MedicalRecord from '@/models/MedicalRecord';
import connectDB from '@/lib/mongodb';

export async function GET(request, { params }) {
  try {
    const auth = await authenticateToken(request);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const { user } = auth;
    if (user.role !== 'patient') {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const { recordId } = await params;

    await connectDB();

    const record = await MedicalRecord.findOne({
      _id: recordId,
      patientId: user._id,
    });

    if (!record) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    return Response.json({
      record,
    });
  } catch (error) {
    console.error('Get record error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await authenticateToken(request);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const { user } = auth;
    if (user.role !== 'patient') {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const { recordId } = await params;
    const body = await request.json();

    await connectDB();

    const record = await MedicalRecord.findOneAndUpdate(
      {
        _id: recordId,
        patientId: user._id,
      },
      {
        title: body.title,
        description: body.description,
        category: body.category,
        'metadata.recordDate': body.recordDate ? new Date(body.recordDate) : undefined,
        'metadata.isEmergencyVisible': body.isEmergencyVisible,
      },
      { new: true }
    );

    if (!record) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    return Response.json({
      message: 'Record updated successfully',
      record,
    });
  } catch (error) {
    console.error('Update record error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await authenticateToken(request);
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const { user } = auth;
    if (user.role !== 'patient') {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const { recordId } = await params;

    await connectDB();

    const record = await MedicalRecord.findOneAndDelete({
      _id: recordId,
      patientId: user._id,
    });

    if (!record) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    return Response.json({
      message: 'Record deleted successfully',
    });
  } catch (error) {
    console.error('Delete record error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
