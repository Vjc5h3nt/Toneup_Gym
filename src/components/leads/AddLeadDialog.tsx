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

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z.string().trim().min(10, 'Valid phone required').max(15),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  source: z.enum(['website', 'instagram', 'qr', 'referral', 'walk_in', 'other']),
  interest: z.enum(['normal', 'personal_training', 'yoga', 'crossfit', 'other']),
  fitness_goal: z.string().max(500).optional(),
  preferred_call_time: z.string().max(100).optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

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

export default function AddLeadDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddLeadDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<LeadFormData>>({
    source: 'walk_in',
    interest: 'normal',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = leadSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('leads').insert({
      name: result.data.name,
      phone: result.data.phone,
      email: result.data.email || null,
      source: result.data.source,
      interest: result.data.interest,
      fitness_goal: result.data.fitness_goal || null,
      preferred_call_time: result.data.preferred_call_time || null,
    });

    if (error) {
      toast.error('Failed to add lead');
    } else {
      toast.success('Lead added successfully');
      setFormData({ source: 'walk_in', interest: 'normal' });
      onOpenChange(false);
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Full name"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone number"
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email address"
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={formData.source}
                onValueChange={(v) => setFormData({ ...formData, source: v as any })}
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
                value={formData.interest}
                onValueChange={(v) => setFormData({ ...formData, interest: v as any })}
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
            <Label htmlFor="preferred_call_time">Preferred Call Time</Label>
            <Input
              id="preferred_call_time"
              value={formData.preferred_call_time || ''}
              onChange={(e) =>
                setFormData({ ...formData, preferred_call_time: e.target.value })
              }
              placeholder="e.g., Morning, 10am-12pm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fitness_goal">Fitness Goal</Label>
            <Textarea
              id="fitness_goal"
              value={formData.fitness_goal || ''}
              onChange={(e) => setFormData({ ...formData, fitness_goal: e.target.value })}
              placeholder="What are they looking to achieve?"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gradient-primary">
              {isSubmitting ? 'Adding...' : 'Add Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
