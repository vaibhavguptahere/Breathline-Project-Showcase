'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminVerificationReview() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVerifications();
  }, [typeFilter]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);

      let doctorCache = [];
      let hospitalCache = [];

      try {
        const doctorRes = await fetch('/api/admin/verification-cache?type=doctor&status=manual_review', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        if (doctorRes.ok) {
          const data = await doctorRes.json();
          doctorCache = data.data || [];
        }
      } catch (error) {
        console.error('Error fetching doctor verifications:', error);
      }

      try {
        const hospitalRes = await fetch('/api/admin/verification-cache?type=hospital&status=manual_review', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        if (hospitalRes.ok) {
          const data = await hospitalRes.json();
          hospitalCache = data.data || [];
        }
      } catch (error) {
        console.error('Error fetching hospital verifications:', error);
      }

      const combined = [
        ...doctorCache.map(v => ({ ...v, verificationType: 'doctor' })),
        ...hospitalCache.map(v => ({ ...v, verificationType: 'hospital' })),
      ];

      setVerifications(combined);
    } catch (error) {
      toast.error('Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;

    setSubmitting(true);
    try {
      const endpoint = selectedVerification.verificationType === 'doctor'
        ? '/api/admin/verify-doctor-cache'
        : '/api/admin/verify-hospital-cache';

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedVerification._id,
          action: 'approve',
          notes: actionNotes,
        }),
      });

      if (!response.ok) throw new Error('Failed to approve');

      toast.success('Verification approved');
      setActionDialog(null);
      setActionNotes('');
      setSelectedVerification(null);
      await fetchVerifications();
    } catch (error) {
      toast.error(error.message || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification || !actionNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = selectedVerification.verificationType === 'doctor'
        ? '/api/admin/verify-doctor-cache'
        : '/api/admin/verify-hospital-cache';

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedVerification._id,
          action: 'reject',
          notes: actionNotes,
        }),
      });

      if (!response.ok) throw new Error('Failed to reject');

      toast.success('Verification rejected');
      setActionDialog(null);
      setActionNotes('');
      setSelectedVerification(null);
      await fetchVerifications();
    } catch (error) {
      toast.error(error.message || 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVerifications = verifications.filter(v => {
    const matchesType = typeFilter === 'all' || v.verificationType === typeFilter;
    const matchesSearch = searchTerm === '' || 
      (v.licenseNumber && v.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.hospitalId && v.hospitalId.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>License & Hospital Verifications</CardTitle>
        <CardDescription>
          Review and approve doctor licenses and hospital registrations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search by license number or hospital ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="doctor">Doctor Licenses</SelectItem>
              <SelectItem value="hospital">Hospital Registrations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Verifications List */}
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading verifications...</p>
          </div>
        ) : filteredVerifications.length > 0 ? (
          <div className="space-y-3">
            {filteredVerifications.map(verification => (
              <Card key={verification._id} className="border">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      {verification.verificationType === 'doctor' ? (
                        <div>
                          <p className="font-medium">License: {verification.licenseNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Type: Doctor Registration
                          </p>
                          {verification.verificationDetails?.name && (
                            <p className="text-sm text-muted-foreground">
                              Name: {verification.verificationDetails.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Submitted: {new Date(verification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">Hospital ID: {verification.hospitalId}</p>
                          <p className="text-sm text-muted-foreground">
                            Type: Hospital Registration
                          </p>
                          {verification.verificationDetails?.name && (
                            <p className="text-sm text-muted-foreground">
                              Name: {verification.verificationDetails.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Submitted: {new Date(verification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedVerification(verification);
                          setActionDialog('approve');
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedVerification(verification);
                          setActionDialog('reject');
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <p className="font-medium">All verifications reviewed!</p>
            <p className="text-sm text-muted-foreground">No pending verifications</p>
          </div>
        )}

        {/* Action Dialog */}
        {selectedVerification && actionDialog && (
          <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {actionDialog === 'approve' ? 'Approve Verification' : 'Reject Verification'}
                </DialogTitle>
                <DialogDescription>
                  {selectedVerification.verificationType === 'doctor'
                    ? `License: ${selectedVerification.licenseNumber}`
                    : `Hospital: ${selectedVerification.hospitalId}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedVerification.verificationDetails && (
                  <div className="bg-muted p-3 rounded-lg space-y-1">
                    <p className="text-sm font-medium">Details</p>
                    {selectedVerification.verificationDetails.name && (
                      <p className="text-xs text-muted-foreground">
                        Name: {selectedVerification.verificationDetails.name}
                      </p>
                    )}
                    {selectedVerification.verificationType === 'doctor' && (
                      <>
                        {selectedVerification.verificationDetails.qualification && (
                          <p className="text-xs text-muted-foreground">
                            Qualification: {selectedVerification.verificationDetails.qualification}
                          </p>
                        )}
                        {selectedVerification.verificationDetails.council && (
                          <p className="text-xs text-muted-foreground">
                            Council: {selectedVerification.verificationDetails.council}
                          </p>
                        )}
                      </>
                    )}
                    {selectedVerification.verificationType === 'hospital' && (
                      <>
                        {selectedVerification.verificationDetails.state && (
                          <p className="text-xs text-muted-foreground">
                            State: {selectedVerification.verificationDetails.state}
                          </p>
                        )}
                        {selectedVerification.verificationDetails.district && (
                          <p className="text-xs text-muted-foreground">
                            District: {selectedVerification.verificationDetails.district}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">
                    {actionDialog === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder={actionDialog === 'approve'
                      ? 'Add any notes about the approval...'
                      : 'Explain why you\'re rejecting this verification...'}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="min-h-24"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActionDialog(null);
                      setActionNotes('');
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  {actionDialog === 'approve' ? (
                    <Button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Approve
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={submitting || !actionNotes.trim()}
                    >
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
