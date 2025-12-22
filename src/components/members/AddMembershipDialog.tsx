import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';

interface AddMembershipDialogProps {
  memberId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const membershipTypes = [
  { value: 'normal', label: 'Regular Gym', price: 1500 },
  { value: 'personal_training', label: 'Personal Training', price: 5000 },
  { value: 'yoga', label: 'Yoga', price: 2000 },
  { value: 'crossfit', label: 'CrossFit', price: 3000 },
  { value: 'other', label: 'Other', price: 0 },
];

const durations = [
  { value: 1, label: '1 Month' },
  { value: 3, label: '3 Months' },
  { value: 6, label: '6 Months' },
  { value: 12, label: '1 Year' },
];

export default function AddMembershipDialog({
  memberId,
  open,
  onOpenChange,
  onSuccess,
}: AddMembershipDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'normal',
    duration: 1,
    price: 1500,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const handleTypeChange = (type: string) => {
    const selected = membershipTypes.find((t) => t.value === type);
    setFormData({
      ...formData,
      type,
      price: (selected?.price || 0) * formData.duration,
    });
  };

  const handleDurationChange = (duration: number) => {
    const selected = membershipTypes.find((t) => t.value === formData.type);
    setFormData({
      ...formData,
      duration,
      price: (selected?.price || 0) * duration,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const startDate = new Date(formData.start_date);
    const endDate = addMonths(startDate, formData.duration);

    const { error } = await supabase.from('memberships').insert({
      member_id: memberId,
      type: formData.type as any,
      start_date: formData.start_date,
      end_date: format(endDate, 'yyyy-MM-dd'),
      price: formData.price,
      status: 'active',
      notes: formData.notes || null,
    });

    if (error) {
      toast.error('Failed to add membership');
    } else {
      toast.success('Membership added');
      setFormData({
        type: 'normal',
        duration: 1,
        price: 1500,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
      onOpenChange(false);
      onSuccess();
    }
    setIsSubmitting(false);
  };

  const endDate = addMonths(new Date(formData.start_date), formData.duration);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Membership</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Membership Type</Label>
            <Select value={formData.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {membershipTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label} (₹{t.price}/mo)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <Select
              value={String(formData.duration)}
              onValueChange={(v) => handleDurationChange(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durations.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={format(endDate, 'yyyy-MM-dd')}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Total Price (₹)</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: Number(e.target.value) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gradient-primary">
              {isSubmitting ? 'Adding...' : 'Add Membership'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
