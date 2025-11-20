'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [verifyingDoctor, setVerifyingDoctor] = useState(false);
  const [verifyingHospital, setVerifyingHospital] = useState(false);
  const [role, setRole] = useState('patient');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    licenseNumber: '',
    specialization: '',
    hospital: '',
    badgeNumber: '',
    department: '',
  });
  const [verificationStatus, setVerificationStatus] = useState({
    doctorVerified: null,
    doctorVerificationData: null,
    hospitalVerified: null,
    hospitalVerificationData: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const verifyDoctorLicense = async () => {
    if (!formData.licenseNumber.trim()) {
      toast.error('Please enter a license number');
      return;
    }

    setVerifyingDoctor(true);
    try {
      const response = await fetch('/api/verify-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseNumber: formData.licenseNumber }),
      });

      const data = await response.json();

      if (data.valid) {
        setVerificationStatus(prev => ({
          ...prev,
          doctorVerified: true,
          doctorVerificationData: data,
        }));
        toast.success(`Doctor verified: ${data.name}`);
      } else {
        setVerificationStatus(prev => ({
          ...prev,
          doctorVerified: false,
          doctorVerificationData: data,
        }));
        toast.warning(data.message || 'License number could not be verified. Manual review pending.');
      }
    } catch (error) {
      toast.error('Verification failed. Please try again.');
      setVerificationStatus(prev => ({
        ...prev,
        doctorVerified: false,
      }));
    } finally {
      setVerifyingDoctor(false);
    }
  };

  const verifyHospital = async () => {
    if (!formData.hospital.trim()) {
      toast.error('Please enter a hospital ID');
      return;
    }

    setVerifyingHospital(true);
    try {
      const response = await fetch('/api/verify-hospital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId: formData.hospital }),
      });

      const data = await response.json();

      if (data.valid) {
        setVerificationStatus(prev => ({
          ...prev,
          hospitalVerified: true,
          hospitalVerificationData: data,
        }));
        toast.success(`Hospital verified: ${data.name}`);
      } else {
        setVerificationStatus(prev => ({
          ...prev,
          hospitalVerified: false,
          hospitalVerificationData: data,
        }));
        toast.warning(data.message || 'Hospital ID could not be verified. Manual review pending.');
      }
    } catch (error) {
      toast.error('Verification failed. Please try again.');
      setVerificationStatus(prev => ({
        ...prev,
        hospitalVerified: false,
      }));
    } finally {
      setVerifyingHospital(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const submitData = {
        email: formData.email,
        password: formData.password,
        role,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      };

      if (role === 'doctor') {
        submitData.licenseNumber = formData.licenseNumber;
        submitData.specialization = formData.specialization;
        submitData.hospital = formData.hospital;
      } else if (role === 'emergency') {
        submitData.badgeNumber = formData.badgeNumber;
        submitData.department = formData.department;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Registration failed');
        return;
      }

      // Store token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast.success('Registration successful!');

      // Redirect based on role
      if (role === 'patient') {
        router.push('/dashboard/patient');
      } else if (role === 'doctor') {
        router.push('/dashboard/doctor');
      } else if (role === 'emergency') {
        router.push('/dashboard/emergency');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Register</CardTitle>
        <CardDescription>
          Create a new account to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Account Type</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="emergency">Emergency Responder</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          {role === 'doctor' && (
            <>
              {/* License Verification */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="licenseNumber">License Number (NMC)</Label>
                  {verificationStatus.doctorVerified !== null && (
                    <Badge variant={verificationStatus.doctorVerified ? 'default' : 'secondary'}>
                      {verificationStatus.doctorVerified ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {verificationStatus.doctorVerified ? 'Verified' : 'Pending Review'}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="licenseNumber"
                    name="licenseNumber"
                    placeholder="e.g., 12345678"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    required
                    disabled={isLoading || verifyingDoctor}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={verifyDoctorLicense}
                    disabled={verifyingDoctor || !formData.licenseNumber || isLoading}
                    className="whitespace-nowrap"
                  >
                    {verifyingDoctor ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
                {verificationStatus.doctorVerificationData && (
                  <Alert className={verificationStatus.doctorVerified ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'}>
                    <AlertDescription className={verificationStatus.doctorVerified ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}>
                      {verificationStatus.doctorVerified ? (
                        <>
                          ✓ License verified: {verificationStatus.doctorVerificationData.name}
                          {verificationStatus.doctorVerificationData.qualification && ` - ${verificationStatus.doctorVerificationData.qualification}`}
                        </>
                      ) : (
                        'License number not found in database. Will be manually reviewed.'
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  name="specialization"
                  placeholder="e.g., Cardiology"
                  value={formData.specialization}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Hospital Verification */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hospital">Hospital ID (ABDM)</Label>
                  {verificationStatus.hospitalVerified !== null && (
                    <Badge variant={verificationStatus.hospitalVerified ? 'default' : 'secondary'}>
                      {verificationStatus.hospitalVerified ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {verificationStatus.hospitalVerified ? 'Verified' : 'Pending Review'}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="hospital"
                    name="hospital"
                    placeholder="Hospital ID or name"
                    value={formData.hospital}
                    onChange={handleChange}
                    required
                    disabled={isLoading || verifyingHospital}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={verifyHospital}
                    disabled={verifyingHospital || !formData.hospital || isLoading}
                    className="whitespace-nowrap"
                  >
                    {verifyingHospital ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
                {verificationStatus.hospitalVerificationData && (
                  <Alert className={verificationStatus.hospitalVerified ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'}>
                    <AlertDescription className={verificationStatus.hospitalVerified ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}>
                      {verificationStatus.hospitalVerified ? (
                        <>
                          ✓ Hospital verified: {verificationStatus.hospitalVerificationData.name}
                          {verificationStatus.hospitalVerificationData.state && ` - ${verificationStatus.hospitalVerificationData.state}`}
                        </>
                      ) : (
                        'Hospital ID not found in database. Will be manually reviewed.'
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}

          {role === 'emergency' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="badgeNumber">Badge Number</Label>
                <Input
                  id="badgeNumber"
                  name="badgeNumber"
                  placeholder="Badge number"
                  value={formData.badgeNumber}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  placeholder="Department name"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}