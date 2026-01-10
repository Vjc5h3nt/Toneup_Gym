import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Lead, LeadFollowUp } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Phone,
  Mail,
  Calendar,
  Target,
  Clock,
  User,
  Save,
  History,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react';

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const statusFlow: Record<string, string[]> = {
  new: ['contacted'],
  contacted: ['converted', 'lost'],
  converted: [],
  lost: [],
};

const statusColors: Record<string, string> = {
  new: 'bg-info text-info-foreground',
  contacted: 'bg-warning text-warning-foreground',
  converted: 'bg-green-500 text-white',
  lost: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  converted: 'Converted ✓',
  lost: 'Lost',
};

const sources = [
  { value: 'website', label: 'Website' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'qr', label: 'QR Code' },
  { value: 'referral', label: 'Referral' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'other', label: 'Other' },
];

const interests = [
  { value: 'normal', label: 'Regular Gym' },
  { value: 'personal_training', label: 'Personal Training' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'crossfit', label: 'CrossFit' },
  { value: 'other', label: 'Other' },
];

export default function LeadDetailDialog({
  lead,
  open,
  onOpenChange,
  onUpdate,
}: LeadDetailDialogProps) {
  const [followUps, setFollowUps] = useState<LeadFollowUp[]>([]);
  const [newNote, setNewNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');
  
  // Lead edit state
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadFormData, setLeadFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'walk_in' as string,
    interest: 'normal' as string,
    fitness_goal: '',
    preferred_call_time: '',
  });
  const fetchFollowUps = async (leadId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('lead_follow_ups')
      .select('*, staff:staff(name)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFollowUps(data as LeadFollowUp[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (open && lead) {
      fetchFollowUps(lead.id);
      setFollowUpDate(lead.next_follow_up || '');
      // Initialize lead form data
      setLeadFormData({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        source: lead.source || 'walk_in',
        interest: lead.interest || 'normal',
        fitness_goal: lead.fitness_goal || '',
        preferred_call_time: lead.preferred_call_time || '',
      });
      setIsEditingLead(false);
    } else if (!open) {
      setFollowUps([]);
      setNewNote('');
      setFollowUpDate('');
      setEditingId(null);
      setIsEditingLead(false);
    }
  }, [open, lead?.id]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setIsEditingLead(false);
    }
    onOpenChange(isOpen);
  };

  const saveLeadEdit = async () => {
    if (!lead) return;
    if (!leadFormData.name.trim() || !leadFormData.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    setIsUpdating(true);
    const { error } = await supabase
      .from('leads')
      .update({
        name: leadFormData.name.trim(),
        phone: leadFormData.phone.trim(),
        email: leadFormData.email.trim() || null,
        source: leadFormData.source as any,
        interest: leadFormData.interest as any,
        fitness_goal: leadFormData.fitness_goal.trim() || null,
        preferred_call_time: leadFormData.preferred_call_time.trim() || null,
      })
      .eq('id', lead.id);

    if (error) {
      toast.error('Failed to update lead');
    } else {
      toast.success('Lead updated successfully');
      setIsEditingLead(false);
      onUpdate();
    }
    setIsUpdating(false);
  };

  const deleteLead = async () => {
    if (!lead) return;
    setIsUpdating(true);

    // First delete follow-ups
    await supabase.from('lead_follow_ups').delete().eq('lead_id', lead.id);
    
    // Then delete lead
    const { error } = await supabase.from('leads').delete().eq('id', lead.id);

    if (error) {
      toast.error('Failed to delete lead');
    } else {
      toast.success('Lead deleted successfully');
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onUpdate();
    }
    setIsUpdating(false);
  };

  const updateStatus = async (newStatus: string) => {
    if (!lead) return;
    setIsUpdating(true);

    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus as 'new' | 'contacted' | 'converted' | 'lost' })
      .eq('id', lead.id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Status updated to ${statusLabels[newStatus]}`);
      onUpdate();
    }
    setIsUpdating(false);
  };

  const saveFollowUp = async () => {
    if (!lead) return;
    if (!followUpDate) {
      toast.error('Please select a follow-up date');
      return;
    }

    setIsUpdating(true);

    const { error: leadError } = await supabase
      .from('leads')
      .update({ next_follow_up: followUpDate })
      .eq('id', lead.id);

    if (leadError) {
      toast.error('Failed to update follow-up date');
      setIsUpdating(false);
      return;
    }

    const { error: followUpError } = await supabase
      .from('lead_follow_ups')
      .insert({
        lead_id: lead.id,
        follow_up_date: followUpDate,
        note: newNote.trim() || null,
        status_at_time: lead.status,
      });

    if (followUpError) {
      toast.error('Failed to save follow-up entry');
      setIsUpdating(false);
      return;
    }

    toast.success('Follow-up saved');
    setNewNote('');
    fetchFollowUps(lead.id);
    onUpdate();
    setIsUpdating(false);
  };

  const startEdit = (followUp: LeadFollowUp) => {
    setEditingId(followUp.id);
    setEditNote(followUp.note || '');
    setEditDate(followUp.follow_up_date);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNote('');
    setEditDate('');
  };

  const saveEdit = async (followUpId: string) => {
    if (!editDate) {
      toast.error('Please select a date');
      return;
    }

    setIsUpdating(true);
    const { error } = await supabase
      .from('lead_follow_ups')
      .update({
        follow_up_date: editDate,
        note: editNote.trim() || null,
      })
      .eq('id', followUpId);

    if (error) {
      toast.error('Failed to update follow-up');
    } else {
      toast.success('Follow-up updated');
      if (lead) fetchFollowUps(lead.id);
    }
    setEditingId(null);
    setIsUpdating(false);
  };

  const deleteFollowUp = async (followUpId: string) => {
    if (!confirm('Are you sure you want to delete this follow-up entry?')) return;

    setIsUpdating(true);
    const { error } = await supabase
      .from('lead_follow_ups')
      .delete()
      .eq('id', followUpId);

    if (error) {
      toast.error('Failed to delete follow-up');
    } else {
      toast.success('Follow-up deleted');
      if (lead) fetchFollowUps(lead.id);
    }
    setIsUpdating(false);
  };

  if (!lead) return null;

  const nextStatuses = statusFlow[lead.status] || [];

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <DialogTitle className="text-2xl truncate">{lead.name}</DialogTitle>
                <Badge className={`${statusColors[lead.status]} text-sm shrink-0`}>
                  {statusLabels[lead.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsEditingLead(!isEditingLead)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-muted" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) hsl(var(--muted))' }}>
            <div className="space-y-6 pt-4">
              {/* Edit Lead Form */}
              {isEditingLead ? (
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <Label className="text-base font-semibold">Edit Lead Information</Label>
                    
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">Name *</Label>
                          <Input
                            id="edit-name"
                            value={leadFormData.name}
                            onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                            placeholder="Full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-phone">Phone *</Label>
                          <Input
                            id="edit-phone"
                            value={leadFormData.phone}
                            onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-email">Email</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={leadFormData.email}
                          onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                          placeholder="Email address"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Source</Label>
                          <Select
                            value={leadFormData.source}
                            onValueChange={(v) => setLeadFormData({ ...leadFormData, source: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {sources.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Interest</Label>
                          <Select
                            value={leadFormData.interest}
                            onValueChange={(v) => setLeadFormData({ ...leadFormData, interest: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {interests.map((i) => (
                                <SelectItem key={i.value} value={i.value}>
                                  {i.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-call-time">Preferred Call Time</Label>
                        <Input
                          id="edit-call-time"
                          value={leadFormData.preferred_call_time}
                          onChange={(e) => setLeadFormData({ ...leadFormData, preferred_call_time: e.target.value })}
                          placeholder="e.g., Morning, 10am-12pm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-goal">Fitness Goal</Label>
                        <Textarea
                          id="edit-goal"
                          value={leadFormData.fitness_goal}
                          onChange={(e) => setLeadFormData({ ...leadFormData, fitness_goal: e.target.value })}
                          placeholder="What are they looking to achieve?"
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditingLead(false);
                            // Reset form
                            setLeadFormData({
                              name: lead.name || '',
                              phone: lead.phone || '',
                              email: lead.email || '',
                              source: lead.source || 'walk_in',
                              interest: lead.interest || 'normal',
                              fitness_goal: lead.fitness_goal || '',
                              preferred_call_time: lead.preferred_call_time || '',
                            });
                          }}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                        <Button onClick={saveLeadEdit} disabled={isUpdating}>
                          <Save className="mr-2 h-4 w-4" />
                          {isUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Contact Info - View Mode */
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.phone}</span>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.email}</span>
                    </div>
                  )}
                  {lead.source && (
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{lead.source.replace('_', ' ')}</span>
                    </div>
                  )}
                  {lead.interest && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{lead.interest.replace('_', ' ')}</span>
                    </div>
                  )}
                  {lead.preferred_call_time && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Best time: {lead.preferred_call_time}</span>
                    </div>
                  )}
                  {lead.fitness_goal && (
                    <div className="col-span-2 flex items-start gap-2 text-sm">
                      <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{lead.fitness_goal}</span>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Status Workflow */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Update Status</Label>
                {nextStatuses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((status) => (
                      <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => updateStatus(status)}
                        className="border-2"
                      >
                        Move to {statusLabels[status]}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This lead is {lead.status}. No further status changes available.
                  </p>
                )}
              </div>

              <Separator />

            {/* Add Follow-up Entry */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <Label className="text-base font-semibold">Add Follow-up Entry</Label>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Next Follow-up Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Notes</Label>
                    <Textarea
                      placeholder="Add notes about this follow-up..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  <Button
                    onClick={saveFollowUp}
                    disabled={isUpdating || !followUpDate}
                    className="w-full"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Follow-up
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Follow-up History */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <History className="h-4 w-4" />
                Follow-up History
              </Label>
              
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading history...
                  </div>
                ) : followUps.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No follow-up entries yet.
                  </div>
                ) : (
                  followUps.map((followUp) => (
                    <div
                      key={followUp.id}
                      className="rounded-lg border bg-muted/50 p-3 space-y-2"
                    >
                      {editingId === followUp.id ? (
                        <div className="space-y-3">
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          <Textarea
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="Notes..."
                            className="min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(followUp.id)}
                              disabled={isUpdating}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">
                                {format(new Date(followUp.follow_up_date), 'PPP')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${statusColors[followUp.status_at_time] || 'bg-muted text-muted-foreground'} text-xs`}>
                                {statusLabels[followUp.status_at_time] || followUp.status_at_time}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => startEdit(followUp)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => deleteFollowUp(followUp.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {followUp.note && (
                            <p className="text-sm text-foreground">{followUp.note}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(followUp.created_at), 'PPp')}
                            {(followUp as any).staff?.name && ` • ${(followUp as any).staff.name}`}
                          </p>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Lead</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{lead.name}"? This will also delete all follow-up entries. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={deleteLead}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isUpdating ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}