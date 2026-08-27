import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  PhoneCall,
  AlertTriangle,
  Plus,
  Trash2,
  MapPin,
  Send,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { useToast } from '../../context/ToastContext';
import { EmergencyContact, ReportCategory } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Select';
import { EmptyState, ErrorState, LoadingSpinner } from '../../components/ui/EmptyState';

export const SafetyHubPage: React.FC = () => {
  const { success, error, warning } = useToast();
  const queryClient = useQueryClient();

  // Modals state
  const [isSosConfirmOpen, setIsSosConfirmOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Add Contact Form state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('Parent');
  const [contactIsPrimary, setContactIsPrimary] = useState(false);

  // File Report Form state
  const [reportCategory, setReportCategory] = useState<ReportCategory>('harassment');
  const [reportedUserId, setReportedUserId] = useState('');
  const [reportTripId, setReportTripId] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  // 1. Fetch Emergency Contacts
  const { data: contacts, isLoading: contactsLoading, refetch: refetchContacts } = useQuery({
    queryKey: ['emergency-contacts'],
    queryFn: async () => {
      const res = await apiClient.get('/safety/emergency-contacts');
      return res.data.data as EmergencyContact[];
    },
  });

  // 2. Add Contact Mutation
  const addContactMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/safety/emergency-contacts', {
        name: contactName.trim(),
        phone: contactPhone.trim(),
        relationship: contactRelation.trim(),
        isPrimary: contactIsPrimary,
      });
    },
    onSuccess: () => {
      success('Contact Added', 'Emergency contact has been registered.');
      setIsAddContactOpen(false);
      setContactName('');
      setContactPhone('');
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Failed to add contact', err.message);
    },
  });

  // 3. Delete Contact Mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await apiClient.delete(`/safety/emergency-contacts/${contactId}`);
    },
    onSuccess: () => {
      success('Contact Removed', 'Emergency contact deleted.');
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Failed to delete contact', err.message);
    },
  });

  // 4. File Safety Report Mutation
  const fileReportMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/safety/reports', {
        category: reportCategory,
        reportedUserId: reportedUserId.trim() || undefined,
        tripId: reportTripId.trim() || undefined,
        reason: reportReason.trim(),
        evidenceUrls: evidenceUrl.trim() ? [evidenceUrl.trim()] : undefined,
      });
    },
    onSuccess: () => {
      success('Report Filed', 'Your incident report has been securely submitted to campus safety moderators.');
      setIsReportOpen(false);
      setReportReason('');
      setReportedUserId('');
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('Report Submission Failed', err.message);
    },
  });

  // 5. Trigger Emergency SOS Mutation
  const triggerSosMutation = useMutation({
    mutationFn: async (coords?: [number, number]) => {
      const res = await apiClient.post('/safety/sos', {
        location: coords ? { type: 'Point', coordinates: coords } : undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      success(
        '🚨 SOS Alert Active',
        'Moderators alerted and emergency SMS dispatched to your registered contacts!'
      );
      setIsSosConfirmOpen(false);
    },
    onError: (err: unknown) => {
      if (err instanceof Error) error('SOS Dispatch Failed', err.message);
    },
  });

  const handleTriggerSos = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          triggerSosMutation.mutate([pos.coords.longitude, pos.coords.latitude]);
        },
        () => {
          warning('Location Unavailable', 'Triggering SOS without exact GPS coordinates.');
          triggerSosMutation.mutate();
        },
        { timeout: 5000 }
      );
    } else {
      triggerSosMutation.mutate();
    }
  };

  const contactList = contacts || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
          <ShieldAlert className="w-6 h-6 text-rose-500" /> Campus Safety & SOS Center
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Instant emergency alerts, registered emergency contacts, and incident moderation reporting.
        </p>
      </div>

      {/* Emergency SOS Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950/60 border border-rose-500/40 p-6 sm:p-8 shadow-glow-sos">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="danger" size="sm">
              Instant Safety Protocol
            </Badge>
            <h2 className="text-xl sm:text-2xl font-black text-white">Need Urgent Assistance?</h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Pressing the Emergency SOS button immediately broadcasts a high-priority incident to campus moderators and
              sends your GPS location coordinates to your registered emergency contacts.
            </p>
          </div>

          <Button
            variant="sos"
            size="lg"
            leftIcon={<ShieldAlert className="w-6 h-6 animate-bounce" />}
            onClick={() => setIsSosConfirmOpen(true)}
            className="w-full md:w-auto text-base px-8 py-4 shadow-2xl"
          >
            TRIGGER SOS ALERT
          </Button>
        </div>
      </div>

      {/* Grid: Emergency Contacts & Incident Reporting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Emergency Contacts Card */}
        <Card className="glass-card flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-indigo-400" /> Emergency Contacts
                </CardTitle>
                <CardDescription>Up to 5 trusted guardians or roommates</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsAddContactOpen(true)}
                disabled={contactList.length >= 5}
              >
                Add
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {contactsLoading && <LoadingSpinner text="Loading contacts..." />}

              {!contactsLoading && contactList.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No emergency contacts registered yet. Please add at least one primary contact.
                </p>
              )}

              {contactList.map((contact) => (
                <div
                  key={contact.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{contact.name}</span>
                      {contact.isPrimary && (
                        <Badge variant="brand" size="sm">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {contact.phone} • {contact.relationship}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => deleteContactMutation.mutate(contact.id)}
                    className="p-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </div>
        </Card>

        {/* Incident Reporting Card */}
        <Card className="glass-card flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Incident & Conduct Reporting
              </CardTitle>
              <CardDescription>Confidential reporting for harassment, fraud, or unsafe behavior</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                RouteMate maintains a zero-tolerance policy against misconduct. Reports are reviewed by moderators within 24
                hours with potential disciplinary user suspension.
              </p>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-xs text-slate-400">
                <span className="font-semibold text-slate-200 block">Reportable Categories:</span>
                <span>Harassment • Payment Extortion • Dangerous Driving • No-Show • Fake Accounts</span>
              </div>
            </CardContent>
          </div>

          <div className="p-6 pt-0">
            <Button
              variant="outline"
              className="w-full border-amber-500/40 text-amber-300 hover:bg-amber-950/40"
              onClick={() => setIsReportOpen(true)}
            >
              File a Confidential Report
            </Button>
          </div>
        </Card>
      </div>

      {/* SOS Confirmation Modal */}
      <Modal
        isOpen={isSosConfirmOpen}
        onClose={() => setIsSosConfirmOpen(false)}
        title="Confirm Emergency SOS Trigger"
        description="Are you in immediate danger or requiring emergency campus response?"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsSosConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="sos"
              onClick={handleTriggerSos}
              isLoading={triggerSosMutation.isPending}
            >
              YES, DISPATCH SOS ALERT
            </Button>
          </div>
        }
      >
        <p className="text-xs text-rose-300 p-3 rounded-xl bg-rose-950/60 border border-rose-800 leading-relaxed">
          Triggering this alert sends an emergency notification with your current GPS coordinates to campus safety
          officials and dispatches SMS alerts to your registered primary contacts.
        </p>
      </Modal>

      {/* Add Contact Modal */}
      <Modal
        isOpen={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
        title="Add Emergency Contact"
        description="This person will be alerted via SMS if you trigger an SOS."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsAddContactOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => addContactMutation.mutate()}
              isLoading={addContactMutation.isPending}
              disabled={!contactName.trim() || !contactPhone.trim()}
            >
              Save Contact
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Contact Full Name"
            placeholder="E.g. Rajesh Sharma"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
          />

          <Input
            label="Phone Number (10 digits)"
            placeholder="9876543210"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            required
          />

          <Select
            label="Relationship"
            value={contactRelation}
            onChange={(e) => setContactRelation(e.target.value)}
            options={[
              { value: 'Parent', label: 'Parent / Guardian' },
              { value: 'Sibling', label: 'Sibling' },
              { value: 'Roommate', label: 'Roommate / Friend' },
              { value: 'Relative', label: 'Other Relative' },
            ]}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is-primary-checkbox"
              checked={contactIsPrimary}
              onChange={(e) => setContactIsPrimary(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
            <label htmlFor="is-primary-checkbox" className="text-xs text-slate-300 cursor-pointer">
              Set as primary contact (first recipient for emergency SMS)
            </label>
          </div>
        </div>
      </Modal>

      {/* File Report Modal */}
      <Modal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title="File an Incident Report"
        description="All reports are investigated confidentially by campus moderation."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsReportOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => fileReportMutation.mutate()}
              isLoading={fileReportMutation.isPending}
              disabled={!reportReason.trim()}
            >
              Submit Report
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <Select
            label="Violation Category"
            value={reportCategory}
            onChange={(e) => setReportCategory(e.target.value as ReportCategory)}
            options={[
              { value: 'harassment', label: 'Harassment or Verbal Abuse' },
              { value: 'fraud', label: 'Financial Fraud / Fare Extortion' },
              { value: 'unsafe_driving', label: 'Unsafe Driving / Reckless Behavior' },
              { value: 'no_show', label: 'No-Show / Route Abandonment' },
              { value: 'inappropriate_content', label: 'Inappropriate Profile / Chat Content' },
              { value: 'other', label: 'Other Policy Violation' },
            ]}
          />

          <Input
            label="Reported User ID (Optional)"
            placeholder="Paste student ID if known"
            value={reportedUserId}
            onChange={(e) => setReportedUserId(e.target.value)}
          />

          <Input
            label="Associated Trip ID (Optional)"
            placeholder="Trip ID where incident occurred"
            value={reportTripId}
            onChange={(e) => setReportTripId(e.target.value)}
          />

          <Textarea
            label="Detailed Reason & Incident Summary"
            placeholder="Describe what occurred, time of event, and any relevant context..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={4}
            required
          />

          <Input
            label="Evidence URL (Screenshot / Photo link)"
            placeholder="https://..."
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
