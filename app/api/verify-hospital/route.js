import HospitalVerificationCache from '@/models/HospitalVerificationCache';
import connectDB from '@/lib/mongodb';

const ABDM_API_URL = process.env.ABDM_API_URL || 'https://api.ndhm.gov.in';
const ABDM_API_KEY = process.env.ABDM_API_KEY;

async function verifyWithAbdmApi(hospitalId) {
  if (!ABDM_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${ABDM_API_URL}/health-facility/search?facility-id=${encodeURIComponent(hospitalId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ABDM_API_KEY}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      }
    );

    if (!response.ok) {
      throw new Error(`ABDM API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return null;
    }

    const hospitalData = Array.isArray(data) ? data[0] : data;

    return {
      valid: true,
      name: hospitalData.name || hospitalData.facilityName || '',
      state: hospitalData.state || hospitalData.stateName || '',
      district: hospitalData.district || hospitalData.districtName || '',
      hospitalType: hospitalData.hospitalType || hospitalData.facilityType || 'General',
      beds: hospitalData.beds || 0,
      registrationStatus: hospitalData.registrationStatus || 'Active',
      abdmStatus: 'verified',
      accreditation: hospitalData.accreditations || [],
      abdmFacilityId: hospitalData.facilityId || hospitalId,
      rawData: hospitalData,
      source: 'abdm_api',
    };
  } catch (error) {
    console.error('ABDM API verification error:', error);
    return null;
  }
}

async function getVerificationFromCache(hospitalId) {
  try {
    await connectDB();
    const cached = await HospitalVerificationCache.findOne({ hospitalId });

    if (cached && cached.expiresAt > new Date()) {
      return { cached: true, data: cached };
    }

    return { cached: false };
  } catch (error) {
    console.error('Cache lookup error:', error);
    return { cached: false };
  }
}

async function saveVerificationToCache(hospitalId, verificationData, source) {
  try {
    await connectDB();

    const existingEntry = await HospitalVerificationCache.findOne({ hospitalId });

    if (existingEntry) {
      Object.assign(existingEntry, {
        ...verificationData,
        source,
        updatedAt: new Date(),
        status: verificationData.verificationDetails?.valid ? 'verified' : 'manual_review',
      });
      await existingEntry.save();
      return existingEntry;
    } else {
      const newEntry = new HospitalVerificationCache({
        hospitalId,
        ...verificationData,
        source,
        status: verificationData.verificationDetails?.valid ? 'verified' : 'manual_review',
      });
      await newEntry.save();
      return newEntry;
    }
  } catch (error) {
    console.error('Cache save error:', error);
    throw error;
  }
}

export async function POST(request) {
  try {
    const { hospitalId } = await request.json();

    if (!hospitalId || typeof hospitalId !== 'string' || hospitalId.trim().length === 0) {
      return Response.json(
        { error: 'Invalid hospital ID', valid: false },
        { status: 400 }
      );
    }

    const normalizedId = hospitalId.trim().toUpperCase();

    const cacheResult = await getVerificationFromCache(normalizedId);
    if (cacheResult.cached) {
      const cached = cacheResult.data;
      return Response.json({
        valid: cached.verificationDetails?.valid || false,
        name: cached.verificationDetails?.name || null,
        state: cached.verificationDetails?.state || null,
        district: cached.verificationDetails?.district || null,
        type: cached.verificationDetails?.hospitalType || null,
        status: cached.status,
        beds: cached.verificationDetails?.beds || null,
        abdmStatus: cached.verificationDetails?.abdmStatus || null,
        nabhStatus: cached.verificationDetails?.nabhStatus || null,
        source: cached.source,
        fromCache: true,
        cachedAt: cached.updatedAt,
      });
    }

    let verificationResult = null;

    const abdmResult = await verifyWithAbdmApi(normalizedId);
    if (abdmResult) {
      verificationResult = abdmResult;
    }

    if (!verificationResult) {
      await connectDB();
      const errorRecord = new HospitalVerificationCache({
        hospitalId: normalizedId,
        status: 'manual_review',
        verificationDetails: {
          valid: false,
          name: null,
          state: null,
          district: null,
          hospitalType: null,
          beds: 0,
          registrationStatus: null,
          nabhStatus: null,
          abdmStatus: null,
        },
        verificationAttempts: {
          abdmApi: {
            attempted: true,
            success: false,
            error: 'Hospital not found in ABDM registry',
            timestamp: new Date(),
          },
        },
        rawData: null,
      });
      await errorRecord.save();

      return Response.json({
        valid: false,
        name: null,
        state: null,
        district: null,
        type: null,
        beds: 0,
        status: 'manual_review',
        abdmStatus: null,
        nabhStatus: null,
        source: null,
        fromCache: false,
        message: 'Hospital ID not found. Your hospital registration is pending manual verification.',
      });
    }

    const savedResult = await saveVerificationToCache(normalizedId, {
      verificationDetails: {
        valid: verificationResult.valid,
        name: verificationResult.name,
        state: verificationResult.state,
        district: verificationResult.district,
        hospitalType: verificationResult.hospitalType,
        beds: verificationResult.beds,
        registrationStatus: verificationResult.registrationStatus,
        abdmStatus: verificationResult.abdmStatus,
        nabhStatus: verificationResult.nabhStatus || 'pending',
        accreditation: verificationResult.accreditation,
      },
      alternateIdentifiers: {
        abdmFacilityId: verificationResult.abdmFacilityId,
      },
      rawData: verificationResult.rawData,
    }, verificationResult.source);

    return Response.json({
      valid: savedResult.verificationDetails.valid,
      name: savedResult.verificationDetails.name,
      state: savedResult.verificationDetails.state,
      district: savedResult.verificationDetails.district,
      type: savedResult.verificationDetails.hospitalType,
      beds: savedResult.verificationDetails.beds,
      status: savedResult.status,
      abdmStatus: savedResult.verificationDetails.abdmStatus,
      nabhStatus: savedResult.verificationDetails.nabhStatus,
      source: savedResult.source,
      fromCache: false,
    });
  } catch (error) {
    console.error('Hospital verification error:', error);
    return Response.json(
      { error: 'Verification failed. Please try again later.', valid: false },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get('hospitalId');

    if (!hospitalId) {
      return Response.json(
        { error: 'Hospital ID is required' },
        { status: 400 }
      );
    }

    const cacheResult = await getVerificationFromCache(hospitalId.toUpperCase());
    if (cacheResult.cached) {
      const cached = cacheResult.data;
      return Response.json({
        hospitalId: cached.hospitalId,
        status: cached.status,
        verificationDetails: cached.verificationDetails,
        alternateIdentifiers: cached.alternateIdentifiers,
        source: cached.source,
        lastVerifiedAt: cached.updatedAt,
      });
    }

    return Response.json(
      { error: 'No verification record found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Get hospital verification error:', error);
    return Response.json(
      { error: 'Failed to retrieve verification' },
      { status: 500 }
    );
  }
}
