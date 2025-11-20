import DoctorVerificationCache from '@/models/DoctorVerificationCache';
import connectDB from '@/lib/mongodb';

const NMC_API_URL = 'https://www.nmc.org.in/MCIRest/open/getList';

async function verifyWithNmcApi(licenseNumber) {
  try {
    const response = await fetch(`${NMC_API_URL}?regnNo=${encodeURIComponent(licenseNumber)}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`NMC API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return null;
    }

    const doctorData = Array.isArray(data) ? data[0] : data;

    return {
      valid: true,
      name: doctorData.name || doctorData.Name || '',
      council: doctorData.council || doctorData.Council || 'NMC',
      qualification: doctorData.qualification || doctorData.Qualification || '',
      registrationStatus: doctorData.status || doctorData.Status || 'Active',
      registrationNumber: doctorData.registrationNumber || doctorData.RegistrationNumber || licenseNumber,
      stateCouncil: doctorData.stateCouncil || doctorData.StateCouncil || '',
      rawData: doctorData,
      source: 'nmc_api',
    };
  } catch (error) {
    console.error('NMC API verification error:', error);
    return null;
  }
}

async function getVerificationFromCache(licenseNumber) {
  try {
    await connectDB();
    const cached = await DoctorVerificationCache.findOne({ licenseNumber });

    if (cached && cached.expiresAt > new Date()) {
      return { cached: true, data: cached };
    }

    return { cached: false };
  } catch (error) {
    console.error('Cache lookup error:', error);
    return { cached: false };
  }
}

async function saveVerificationToCache(licenseNumber, verificationData, source) {
  try {
    await connectDB();

    const existingEntry = await DoctorVerificationCache.findOne({ licenseNumber });

    if (existingEntry) {
      Object.assign(existingEntry, {
        ...verificationData,
        source,
        updatedAt: new Date(),
        status: verificationData.valid ? 'verified' : 'manual_review',
      });
      await existingEntry.save();
      return existingEntry;
    } else {
      const newEntry = new DoctorVerificationCache({
        licenseNumber,
        ...verificationData,
        source,
        status: verificationData.valid ? 'verified' : 'manual_review',
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
    const { licenseNumber } = await request.json();

    if (!licenseNumber || typeof licenseNumber !== 'string' || licenseNumber.trim().length === 0) {
      return Response.json(
        { error: 'Invalid license number', valid: false },
        { status: 400 }
      );
    }

    const normalizedLicense = licenseNumber.trim().toUpperCase();

    const cacheResult = await getVerificationFromCache(normalizedLicense);
    if (cacheResult.cached) {
      const cached = cacheResult.data;
      return Response.json({
        valid: cached.verificationDetails?.valid || false,
        name: cached.verificationDetails?.name || null,
        council: cached.verificationDetails?.council || null,
        qualification: cached.verificationDetails?.qualification || null,
        status: cached.status,
        registrationStatus: cached.verificationDetails?.registrationStatus || null,
        source: cached.source,
        fromCache: true,
        cachedAt: cached.updatedAt,
      });
    }

    let verificationResult = null;

    const nmcResult = await verifyWithNmcApi(normalizedLicense);
    if (nmcResult) {
      verificationResult = nmcResult;
    }

    if (!verificationResult) {
      await connectDB();
      const errorRecord = new DoctorVerificationCache({
        licenseNumber: normalizedLicense,
        status: 'manual_review',
        verificationDetails: {
          valid: false,
          name: null,
          council: null,
          qualification: null,
          registrationStatus: null,
        },
        verificationAttempts: {
          nmcApi: {
            attempted: true,
            success: false,
            error: 'License not found in NMC database',
            timestamp: new Date(),
          },
        },
        rawData: null,
      });
      await errorRecord.save();

      return Response.json({
        valid: false,
        name: null,
        council: null,
        qualification: null,
        status: 'manual_review',
        registrationStatus: null,
        source: null,
        fromCache: false,
        message: 'License number not found. Your registration is pending manual verification.',
      });
    }

    const savedResult = await saveVerificationToCache(normalizedLicense, {
      verificationDetails: {
        valid: verificationResult.valid,
        name: verificationResult.name,
        council: verificationResult.council,
        qualification: verificationResult.qualification,
        registrationStatus: verificationResult.registrationStatus,
        registrationNumber: verificationResult.registrationNumber,
        stateCouncil: verificationResult.stateCouncil,
      },
      rawData: verificationResult.rawData,
    }, verificationResult.source);

    return Response.json({
      valid: savedResult.verificationDetails.valid,
      name: savedResult.verificationDetails.name,
      council: savedResult.verificationDetails.council,
      qualification: savedResult.verificationDetails.qualification,
      status: savedResult.status,
      registrationStatus: savedResult.verificationDetails.registrationStatus,
      source: savedResult.source,
      fromCache: false,
    });
  } catch (error) {
    console.error('Doctor verification error:', error);
    return Response.json(
      { error: 'Verification failed. Please try again later.', valid: false },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseNumber = searchParams.get('licenseNumber');

    if (!licenseNumber) {
      return Response.json(
        { error: 'License number is required' },
        { status: 400 }
      );
    }

    const cacheResult = await getVerificationFromCache(licenseNumber.toUpperCase());
    if (cacheResult.cached) {
      const cached = cacheResult.data;
      return Response.json({
        licenseNumber: cached.licenseNumber,
        status: cached.status,
        verificationDetails: cached.verificationDetails,
        source: cached.source,
        lastVerifiedAt: cached.updatedAt,
      });
    }

    return Response.json(
      { error: 'No verification record found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Get verification error:', error);
    return Response.json(
      { error: 'Failed to retrieve verification' },
      { status: 500 }
    );
  }
}
