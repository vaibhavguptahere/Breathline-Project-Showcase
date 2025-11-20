'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HospitalDoctorSelector from '@/components/hospital-doctor-selector';
import {
  Users,
  UserPlus,
  Search,
  Calendar,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  AlertTriangle,
  Building,
  Mail,
  FileText,
  Building2,
  Stethoscope
} from 'lucide-react';
import { toast } from 'sonner';

export default function SharedAccess() {
  const { user } = useAuth();
  const [sharedAccess, setSharedAccess] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareDialogTab, setShareDialogTab] = useState('hospital');
  const [searchTerm, setSearchTerm] = useState('');
  const [sharingAccess, setSharingAccess] = useState(false);
  const [respondingToRequest, setRespondingToRequest] = useState(null);
  const [durationDays, setDurationDays] = useState('30');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedRequestForApprove, setSelectedRequestForApprove] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedAccessDetails, setSelectedAccessDetails] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [sharingFromDropdown, setSharingFromDropdown] = useState(false);

  const [shareForm, setShareForm] = useState({
    doctorEmail: '',
    accessLevel: 'read',
    expiresIn: '30d',
    recordCategories: ['all'],
  });

  useEffect(() => {
    fetchSharedAccess();
    fetchAccessRequests();
    fetchHospitalsForDropdown();
  }, []);

  const fetchHospitalsForDropdown = async () => {
    try {
      setLoadingHospitals(true);
      const response = await fetch('/api/hospitals');
      if (response.ok) {
        const data = await response.json();
        setHospitals(data.hospitals || []);
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      toast.error('Failed to load hospitals');
    } finally {
      setLoadingHospitals(false);
    }
  };

  const fetchDoctorsForHospital = async (hospitalId) => {
    try {
      setLoadingDoctors(true);
      setSelectedDoctor('');
      const response = await fetch(`/api/hospitals/${hospitalId}/doctors`);
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.doctors || []);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors for this hospital');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleHospitalChange = (hospitalId) => {
    setSelectedHospital(hospitalId);
    if (hospitalId) {
      fetchDoctorsForHospital(hospitalId);
    } else {
      setDoctors([]);
    }
  };

  const handleShareFromDropdown = async () => {
    if (!selectedDoctor) {
      toast.error('Please select a doctor');
      return;
    }

    const doctor = doctors.find(d => d._id === selectedDoctor);
    if (!doctor) {
      toast.error('Doctor not found');
      return;
    }

    setSharingFromDropdown(true);
    try {
      const response = await fetch('/api/auth/patient/shared-access', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorId: doctor._id,
          accessLevel: shareForm.accessLevel,
          expiresIn: shareForm.expiresIn,
          recordCategories: shareForm.recordCategories,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Access shared with Dr. ${doctor.firstName} ${doctor.lastName}. ${data.recordsUpdated} records updated.`);
        setShowShareDialog(false);
        setSelectedHospital('');
        setSelectedDoctor('');
        setDoctors([]);
        setShareForm({
          doctorEmail: '',
          accessLevel: 'read',
          expiresIn: '30d',
          recordCategories: ['all'],
        });
        await fetchSharedAccess();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to share access');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSharingFromDropdown(false);
    }
  };

  const fetchSharedAccess = async () => {
    try {
      const response = await fetch('/api/auth/patient/shared-access', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSharedAccess(data.sharedAccess || []);
      } else {
        throw new Error('Failed to fetch shared access');
      }
    } catch (error) {
      console.error('Error fetching shared access:', error);
      toast.error('Failed to load shared access data');
    }
  };

  const fetchAccessRequests = async () => {
    try {
      const response = await fetch('/api/auth/patient/access-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccessRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching access requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareAccess = async (e) => {
    e.preventDefault();
    setSharingAccess(true);

    try {
      const response = await fetch('/api/auth/patient/shared-access', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareForm),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Access shared successfully. ${data.recordsUpdated} records updated.`);
        setShowShareDialog(false);
        setShareForm({
          doctorEmail: '',
          accessLevel: 'read',
          expiresIn: '30d',
          recordCategories: ['all'],
        });
        fetchSharedAccess();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to share access');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSharingAccess(false);
    }
  };

  const handleAccessRequest = async (requestId, action, duration = null) => {
    setRespondingToRequest(requestId);
    try {
      const payload = { action };

      if (action === 'approve' && duration) {
        payload.durationDays = parseInt(duration, 10);
      }

      const response = await fetch(`/api/auth/patient/access-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(`Access request ${action === 'approve' ? 'approved' : 'denied'} successfully`);
        setShowApproveDialog(false);
        setSelectedRequestForApprove(null);
        setDurationDays('30');
        await fetchAccessRequests();
        await fetchSharedAccess();
      } else {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} request`);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRespondingToRequest(null);
    }
  };

  const pendingRequests = accessRequests.filter(req => req.status === 'pending');

  const revokeAccess = async (accessId, doctorName) => {
    if (!confirm(`Are you sure you want to revoke access for ${doctorName}? This will remove their access to all your medical records.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/auth/patient/shared-access/${accessId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Access revoked successfully. ${data.recordsUpdated} records updated.`);
        fetchSharedAccess();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke access');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getAccessLevelColor = (level) => {
    const colors = {
      read: 'bg-blue-100 text-blue-800',
      write: 'bg-green-100 text-green-800',
      full: 'bg-purple-100 text-purple-800',
    };
    return colors[level] || colors.read;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      revoked: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || colors.pending;
  };

  const filteredSharedAccess = sharedAccess.filter(access =>
    access.doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    access.doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    access.doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shared Access</h1>
          <p className="text-muted-foreground">
            Manage doctor access to your medical records
          </p>
        </div>
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Share Access
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Share Medical Records Access</DialogTitle>
              <DialogDescription>
                Choose a method to grant a doctor access to your medical records
              </DialogDescription>
            </DialogHeader>

            <Tabs value={shareDialogTab} onValueChange={setShareDialogTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="hospital" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Hospital</span>
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">Email</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hospital" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hospital">Select Hospital</Label>
                    <Select
                      value={selectedHospital}
                      onValueChange={handleHospitalChange}
                      disabled={loadingHospitals}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingHospitals ? "Loading hospitals..." : "Choose a hospital"} />
                      </SelectTrigger>
                      <SelectContent>
                        {hospitals.map((hospital) => (
                          <SelectItem key={hospital._id} value={hospital._id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <span>{hospital.name}</span>
                              {hospital.address?.city && (
                                <span className="text-xs text-muted-foreground">({hospital.address.city})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedHospital && (
                    <div className="space-y-2">
                      <Label htmlFor="doctor">Select Doctor</Label>
                      <Select
                        value={selectedDoctor}
                        onValueChange={setSelectedDoctor}
                        disabled={loadingDoctors || doctors.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingDoctors ? "Loading doctors..." : (doctors.length === 0 ? "No doctors available" : "Choose a doctor")} />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((doctor) => (
                            <SelectItem key={doctor._id} value={doctor._id}>
                              <div className="flex items-center gap-2">
                                <Stethoscope className="h-4 w-4" />
                                <span>Dr. {doctor.firstName} {doctor.lastName}</span>
                                {doctor.specialization && (
                                  <span className="text-xs text-muted-foreground">({doctor.specialization})</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedDoctor && (
                        <div className="text-xs text-muted-foreground">
                          <div className="mt-2 p-2 bg-muted rounded">
                            {(() => {
                              const doctor = doctors.find(d => d._id === selectedDoctor);
                              return doctor ? (
                                <>
                                  <p><strong>Email:</strong> {doctor.email}</p>
                                  <p><strong>License:</strong> {doctor.licenseNumber || 'N/A'}</p>
                                </>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedDoctor && (
                    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium mb-4">Access Settings</p>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="accessLevel">Access Level</Label>
                            <Select
                              value={shareForm.accessLevel}
                              onValueChange={(value) => setShareForm({ ...shareForm, accessLevel: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="read">Read Only</SelectItem>
                                <SelectItem value="write">Read & Write</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="expiresIn">Access Duration</Label>
                            <Select
                              value={shareForm.expiresIn}
                              onValueChange={(value) => setShareForm({ ...shareForm, expiresIn: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="7d">7 Days</SelectItem>
                                <SelectItem value="30d">30 Days</SelectItem>
                                <SelectItem value="90d">90 Days</SelectItem>
                                <SelectItem value="1y">1 Year</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowShareDialog(false);
                        setSelectedHospital('');
                        setSelectedDoctor('');
                        setDoctors([]);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleShareFromDropdown}
                      disabled={!selectedDoctor || sharingFromDropdown}
                      className="flex-1"
                    >
                      {sharingFromDropdown ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sharing...
                        </>
                      ) : (
                        'Share Access'
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="email">
                <form onSubmit={handleShareAccess} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="doctorEmail">Doctor's Email</Label>
                    <Input
                      id="doctorEmail"
                      type="email"
                      value={shareForm.doctorEmail}
                      onChange={(e) => setShareForm({ ...shareForm, doctorEmail: e.target.value })}
                      placeholder="doctor@hospital.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accessLevel">Access Level</Label>
                    <Select
                      value={shareForm.accessLevel}
                      onValueChange={(value) => setShareForm({ ...shareForm, accessLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">Read Only</SelectItem>
                        <SelectItem value="write">Read & Write</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiresIn">Access Duration</Label>
                    <Select
                      value={shareForm.expiresIn}
                      onValueChange={(value) => setShareForm({ ...shareForm, expiresIn: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">7 Days</SelectItem>
                        <SelectItem value="30d">30 Days</SelectItem>
                        <SelectItem value="90d">90 Days</SelectItem>
                        <SelectItem value="1y">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowShareDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={sharingAccess}>
                      {sharingAccess ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sharing Access...
                        </>
                      ) : (
                        'Share Access'
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Access Requests */}
      {pendingRequests.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Pending Access Requests
              </CardTitle>
              <CardDescription>
                Doctors requesting access to your medical records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{request.doctor.name}</h4>
                        <Badge variant="outline">{request.doctor.specialization}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.doctor.email}</p>
                      <p className="text-sm">{request.reason}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>
                          Requested:{' '}
                          {request?.requestedAt
                            ? new Date(request.requestedAt).toLocaleDateString()
                            : 'N/A'}
                        </span>
                        {request?.accessLevel && (
                          <Badge className={getAccessLevelColor(request.accessLevel)}>
                            {request.accessLevel}
                          </Badge>
                        )}
                      </div>

                    </div>
                    <div className="flex space-x-2">
                      <Dialog open={showApproveDialog && selectedRequestForApprove?.id === request.id} onOpenChange={(open) => {
                        if (!open) {
                          setShowApproveDialog(false);
                          setSelectedRequestForApprove(null);
                          setDurationDays('30');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequestForApprove(request);
                              setShowApproveDialog(true);
                            }}
                            disabled={respondingToRequest === request.id}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Approve Access Request</DialogTitle>
                            <DialogDescription>
                              Grant {request.doctor.name} access to your medical records
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="approve-duration">Access Duration (days)</Label>
                              <Select value={durationDays} onValueChange={setDurationDays}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="7">7 Days</SelectItem>
                                  <SelectItem value="30">30 Days</SelectItem>
                                  <SelectItem value="90">90 Days</SelectItem>
                                  <SelectItem value="365">1 Year</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowApproveDialog(false);
                                  setSelectedRequestForApprove(null);
                                  setDurationDays('30');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => handleAccessRequest(request.id, 'approve', durationDays)}
                                disabled={respondingToRequest === request.id}
                              >
                                {respondingToRequest === request.id && (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Approve Access
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAccessRequest(request.id, 'deny')}
                        disabled={respondingToRequest === request.id}
                      >
                        {respondingToRequest === request.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="mr-1 h-4 w-4" />
                        )}
                        Deny
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search doctors by name, email, or specialization..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Current Shared Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Current Shared Access ({filteredSharedAccess.length})
          </CardTitle>
          <CardDescription>
            Doctors who currently have access to your records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSharedAccess.length > 0 ? (
            <div className="space-y-4">
              {filteredSharedAccess.map((access) => (
                <div key={access.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h4 className="font-semibold">{access.doctor.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {access.doctor.specialization}
                          </Badge>
                          <Badge className={getStatusColor(access.status)}>
                            {access.status}
                          </Badge>
                          <Badge className={getAccessLevelColor(access.accessLevel)}>
                            {access.accessLevel}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{access.doctor.email}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Building className="h-3 w-3" />
                        <span>{access.doctor.hospital}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Granted: {new Date(access.grantedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {access.expiresAt
                            ? `Expires: ${new Date(access.expiresAt).toLocaleDateString()}`
                            : 'No expiration'
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <FileText className="h-3 w-3" />
                        <span>{access.recordCount} records accessible</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Dialog open={showDetailsDialog && selectedAccessDetails?.id === access.id} onOpenChange={(open) => {
                      if (!open) {
                        setShowDetailsDialog(false);
                        setSelectedAccessDetails(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAccessDetails(access);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Doctor Access Details</DialogTitle>
                          <DialogDescription>
                            Complete information about {access.doctor.name}'s access
                          </DialogDescription>
                        </DialogHeader>
                        {selectedAccessDetails && (
                          <div className="space-y-6">
                            {/* Doctor Information */}
                            <div className="space-y-4">
                              <div>
                                <h3 className="text-sm font-semibold text-muted-foreground">Doctor Information</h3>
                                <div className="mt-2 space-y-3">
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium">Name:</span>
                                    <span className="text-sm">{selectedAccessDetails.doctor.name}</span>
                                  </div>
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium">Email:</span>
                                    <span className="text-sm">{selectedAccessDetails.doctor.email}</span>
                                  </div>
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium">Specialization:</span>
                                    <span className="text-sm">{selectedAccessDetails.doctor.specialization}</span>
                                  </div>
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium">Hospital/Clinic:</span>
                                    <span className="text-sm">{selectedAccessDetails.doctor.hospital}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Access Information */}
                            <div className="space-y-4">
                              <div>
                                <h3 className="text-sm font-semibold text-muted-foreground">Access Information</h3>
                                <div className="mt-2 space-y-3">
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium">Access Status:</span>
                                    <Badge className={getStatusColor(selectedAccessDetails.status)}>
                                      {selectedAccessDetails.status}
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium">Access Level:</span>
                                    <Badge className={getAccessLevelColor(selectedAccessDetails.accessLevel)}>
                                      {selectedAccessDetails.accessLevel === 'read' ? 'View Only' : 'View & Edit'}
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium">Records Accessible:</span>
                                    <span className="text-sm">{selectedAccessDetails.recordCount}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Timeline Information */}
                            <div className="space-y-4">
                              <div>
                                <h3 className="text-sm font-semibold text-muted-foreground">Timeline</h3>
                                <div className="mt-2 space-y-3">
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium">Access Granted:</span>
                                    <span className="text-sm">{new Date(selectedAccessDetails.grantedAt).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium">Expires:</span>
                                    <span className="text-sm">
                                      {selectedAccessDetails.expiresAt
                                        ? new Date(selectedAccessDetails.expiresAt).toLocaleDateString()
                                        : 'No expiration'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Record Categories */}
                            <div className="space-y-4">
                              <div>
                                <h3 className="text-sm font-semibold text-muted-foreground">Record Categories</h3>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {selectedAccessDetails.recordCategories && selectedAccessDetails.recordCategories.length > 0 ? (
                                    selectedAccessDetails.recordCategories.map((category, idx) => (
                                      <Badge key={idx} variant="secondary">
                                        {category === 'all' ? 'All Records' : category.replace('-', ' ')}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-sm text-muted-foreground">All record types</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setShowDetailsDialog(false);
                                  setSelectedAccessDetails(null);
                                }}
                              >
                                Close
                              </Button>
                              <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => {
                                  setShowDetailsDialog(false);
                                  revokeAccess(selectedAccessDetails.id, selectedAccessDetails.doctor.name);
                                  setSelectedAccessDetails(null);
                                }}
                              >
                                Revoke Access
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => revokeAccess(access.id, access.doctor.name)}
                    >
                      Revoke Access
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No matching doctors found' : 'No shared access'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : "You haven't shared access with any doctors yet"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowShareDialog(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Share Access
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Security & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Full Control</p>
              <p className="text-xs text-muted-foreground">
                You can revoke access at any time
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Audit Trail</p>
              <p className="text-xs text-muted-foreground">
                All access is logged and monitored
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Time-Limited</p>
              <p className="text-xs text-muted-foreground">
                Access automatically expires based on your settings
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Secure Sharing</p>
              <p className="text-xs text-muted-foreground">
                Only share access with verified healthcare professionals
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
