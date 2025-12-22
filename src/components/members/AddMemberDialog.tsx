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

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const memberSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z.string().trim().min(10, 'Valid phone required').max(15),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().max(500).optional(),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: z.string().max(15).optional(),
});

type MemberFormData = z.infer<typeof memberSchema>;

export default function AddMemberDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<MemberFormData>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = memberSchema.safeParse(formData);
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

    const { error } = await supabase.from('members').insert({
      name: result.data.name,
      phone: result.data.phone,
      email: result.data.email || null,
      date_of_birth: result.data.date_of_birth || null,
      gender: result.data.gender || null,
      address: result.data.address || null,
      emergency_contact_name: result.data.emergency_contact_name || null,
      emergency_contact_phone: result.data.emergency_contact_phone || null,
    });

    if (error) {
      toast.error('Failed to add member');
    } else {
      toast.success('Member added successfully');
      setFormData({});
      onOpenChange(false);
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
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

          <div className="grid grid-cols-2 gap-4">
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
                placeholder="Email"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={formData.date_of_birth || ''}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={formData.gender || ''}
                onValueChange={(v) => setFormData({ ...formData, gender: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full address"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_name">Emergency Contact</Label>
              <Input
                id="emergency_name"
                value={formData.emergency_contact_name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, emergency_contact_name: e.target.value })
                }
                placeholder="Contact name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_phone">Emergency Phone</Label>
              <Input
                id="emergency_phone"
                value={formData.emergency_contact_phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, emergency_contact_phone: e.target.value })
                }
                placeholder="Phone"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gradient-primary">
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
