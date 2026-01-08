import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { format, parseISO, isFuture, isToday, startOfDay } from 'date-fns';
import { Search, UserCheck, UserX, Calendar, Check, X, RefreshCw, Users, UsersRound } from 'lucide-react';

interface MemberWithMembership {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  membershipStartDate: string;
  membershipEndDate: string;
  attendanceStatus: 'present' | 'absent' | 'not_marked';
  attendanceId: string | null;
  notes: string | null;
}

interface StaffWithAttendance {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  joiningDate: string | null;
  attendanceStatus: 'present' | 'absent' | 'not_marked';
  attendanceId: string | null;
  notes: string | null;
}

export default function ManageAttendance() {
  const [activeTab, setActiveTab] = useState<'members' | 'staff'>('members');
  const [members, setMembers] = useState<MemberWithMembership[]>([]);
  const [staffList, setStaffList] = useState<StaffWithAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);

  useEffect(() => {
    if (activeTab === 'members') {
      fetchMembersWithAttendance();
    } else {
      fetchStaffWithAttendance();
    }
  }, [selectedDate, activeTab]);

  const fetchMembersWithAttendance = async () => {
    setIsLoading(true);
    try {
      // Fetch all active members with active memberships
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          id,
          name,
          phone,
          email,
          memberships!inner (
            start_date,
            end_date,
            status
          )
        `)
        .eq('is_active', true)
        .eq('memberships.status', 'active');

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        setIsLoading(false);
        return;
      }

      const memberIds = membersData.map((m) => m.id);

      // Fetch daily attendance for the selected date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('daily_attendance')
        .select('*')
        .in('member_id', memberIds)
        .eq('date', selectedDate);

      if (attendanceError) throw attendanceError;

      const mappedMembers: MemberWithMembership[] = membersData.map((member) => {
        const memberships = member.memberships as unknown as Array<{
          start_date: string;
          end_date: string;
          status: string;
        }>;
        const activeMembership = memberships[0];
        const attendance = attendanceData?.find((a) => a.member_id === member.id);

        const membershipStart = parseISO(activeMembership.start_date);
        const selectedDateObj = parseISO(selectedDate);
        const isDateBeforeMembership = selectedDateObj < startOfDay(membershipStart);

        // Use the status directly from the database, default to 'not_marked'
        let attendanceStatus: MemberWithMembership['attendanceStatus'] = 'not_marked';
        
        if (!isDateBeforeMembership && attendance) {
          attendanceStatus = attendance.status as 'present' | 'absent' | 'not_marked';
        }

        return {
          id: member.id,
          name: member.name,
          phone: member.phone,
          email: member.email,
          membershipStartDate: activeMembership.start_date,
          membershipEndDate: activeMembership.end_date,
          attendanceStatus,
          attendanceId: attendance?.id || null,
          notes: attendance?.notes || null,
        };
      });

      mappedMembers.sort((a, b) => a.name.localeCompare(b.name));
      setMembers(mappedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to fetch members');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaffWithAttendance = async () => {
    setIsLoading(true);
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, email, phone, role, joining_date')
        .eq('is_active', true)
        .order('name');

      if (staffError) throw staffError;

      if (!staffData || staffData.length === 0) {
        setStaffList([]);
        setIsLoading(false);
        return;
      }

      const staffIds = staffData.map((s) => s.id);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('staff_attendance')
        .select('*')
        .in('staff_id', staffIds)
        .eq('date', selectedDate);

      if (attendanceError) throw attendanceError;

      const mappedStaff: StaffWithAttendance[] = staffData.map((staff) => {
        const attendance = attendanceData?.find((a) => a.staff_id === staff.id);

        const joiningDate = staff.joining_date ? parseISO(staff.joining_date) : null;
        const selectedDateObj = parseISO(selectedDate);
        const isBeforeJoining = joiningDate ? selectedDateObj < startOfDay(joiningDate) : false;

        let attendanceStatus: StaffWithAttendance['attendanceStatus'] = 'not_marked';
        
        if (!isBeforeJoining && attendance) {
          if (attendance.notes?.includes('automatic system update') || attendance.notes?.includes('Marked absent')) {
            attendanceStatus = 'absent';
          } else if (attendance.in_time) {
            attendanceStatus = 'present';
          } else {
            attendanceStatus = 'absent';
          }
        }

        return {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          role: staff.role,
          joiningDate: staff.joining_date,
          attendanceStatus,
          attendanceId: attendance?.id || null,
          notes: attendance?.notes || null,
        };
      });

      setStaffList(mappedStaff);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to fetch staff');
    } finally {
      setIsLoading(false);
    }
  };

  const markMemberAttendance = async (memberId: string, status: 'present' | 'absent') => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const selectedDateObj = parseISO(selectedDate);
    if (isFuture(selectedDateObj) && !isToday(selectedDateObj)) {
      toast.error('Cannot mark attendance for future dates');
      return;
    }

    const membershipStart = parseISO(member.membershipStartDate);
    if (selectedDateObj < startOfDay(membershipStart)) {
      toast.error('Cannot mark attendance before membership start date');
      return;
    }

    setIsSaving(memberId);
    try {
      if (member.attendanceId) {
        // Update existing attendance record
        const { error } = await supabase
          .from('daily_attendance')
          .update({
            status,
            notes: `Marked ${status} by staff`,
          })
          .eq('id', member.attendanceId);

        if (error) throw error;
      } else {
        // Insert new attendance record
        const { error } = await supabase.from('daily_attendance').insert({
          member_id: memberId,
          date: selectedDate,
          status,
          notes: `Marked ${status} by staff`,
        });

        if (error) throw error;
      }

      toast.success(`Marked ${member.name} as ${status}`);
      fetchMembersWithAttendance();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    } finally {
      setIsSaving(null);
    }
  };

  const markStaffAttendance = async (staffId: string, status: 'present' | 'absent') => {
    const staff = staffList.find((s) => s.id === staffId);
    if (!staff) return;

    const selectedDateObj = parseISO(selectedDate);
    if (isFuture(selectedDateObj) && !isToday(selectedDateObj)) {
      toast.error('Cannot mark attendance for future dates');
      return;
    }

    if (staff.joiningDate) {
      const joiningDate = parseISO(staff.joiningDate);
      if (selectedDateObj < startOfDay(joiningDate)) {
        toast.error('Cannot mark attendance before joining date');
        return;
      }
    }

    setIsSaving(staffId);
    try {
      if (staff.attendanceId) {
        if (status === 'absent') {
          const { error } = await supabase
            .from('staff_attendance')
            .update({
              notes: 'Marked absent by admin',
              in_time: null,
              out_time: null,
              hours_worked: 0,
            })
            .eq('id', staff.attendanceId);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('staff_attendance')
            .update({
              notes: null,
              in_time: '09:00',
              out_time: null,
              hours_worked: null,
            })
            .eq('id', staff.attendanceId);

          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('staff_attendance').insert({
          staff_id: staffId,
          date: selectedDate,
          in_time: status === 'present' ? '09:00' : null,
          out_time: null,
          hours_worked: status === 'absent' ? 0 : null,
          notes: status === 'absent' ? 'Marked absent by admin' : null,
        });

        if (error) throw error;
      }

      toast.success(`Marked ${staff.name} as ${status}`);
      fetchStaffWithAttendance();
    } catch (error) {
      console.error('Error marking staff attendance:', error);
      toast.error('Failed to mark attendance');
    } finally {
      setIsSaving(null);
    }
  };

  const autoMarkAbsent = async () => {
    if (activeTab === 'members') {
      const unmarkedMembers = members.filter((m) => {
        if (m.attendanceStatus !== 'not_marked') return false;
        
        const selectedDateObj = parseISO(selectedDate);
        const membershipStart = parseISO(m.membershipStartDate);
        
        return selectedDateObj >= startOfDay(membershipStart) && !isFuture(selectedDateObj);
      });

      if (unmarkedMembers.length === 0) {
        toast.info('No unmarked attendance to update');
        return;
      }

      setIsAutoUpdating(true);
      try {
        const insertData = unmarkedMembers.map((m) => ({
          member_id: m.id,
          date: selectedDate,
          status: 'absent' as const,
          notes: 'Marked absent - automatic system update',
        }));

        const { error } = await supabase.from('daily_attendance').insert(insertData);

        if (error) throw error;

        toast.success(`Marked ${unmarkedMembers.length} member(s) as absent`);
        fetchMembersWithAttendance();
      } catch (error) {
        console.error('Error auto-marking absent:', error);
        toast.error('Failed to auto-mark absent');
      } finally {
        setIsAutoUpdating(false);
      }
    } else {
      const unmarkedStaff = staffList.filter((s) => {
        if (s.attendanceStatus !== 'not_marked') return false;
        
        const selectedDateObj = parseISO(selectedDate);
        if (s.joiningDate) {
          const joiningDate = parseISO(s.joiningDate);
          if (selectedDateObj < startOfDay(joiningDate)) return false;
        }
        
        return !isFuture(selectedDateObj);
      });

      if (unmarkedStaff.length === 0) {
        toast.info('No unmarked attendance to update');
        return;
      }

      setIsAutoUpdating(true);
      try {
        const insertData = unmarkedStaff.map((s) => ({
          staff_id: s.id,
          date: selectedDate,
          in_time: null,
          out_time: null,
          hours_worked: 0,
          notes: 'Marked absent - automatic system update',
        }));

        const { error } = await supabase.from('staff_attendance').insert(insertData);

        if (error) throw error;

        toast.success(`Marked ${unmarkedStaff.length} staff member(s) as absent`);
        fetchStaffWithAttendance();
      } catch (error) {
        console.error('Error auto-marking staff absent:', error);
        toast.error('Failed to auto-mark absent');
      } finally {
        setIsAutoUpdating(false);
      }
    }
  };

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone.includes(searchQuery)
  );

  const filteredStaff = staffList.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.phone && s.phone.includes(searchQuery))
  );

  const isFutureDate = isFuture(parseISO(selectedDate)) && !isToday(parseISO(selectedDate));
  
  const memberPresentCount = members.filter((m) => m.attendanceStatus === 'present').length;
  const memberAbsentCount = members.filter((m) => m.attendanceStatus === 'absent').length;
  const memberUnmarkedCount = members.filter((m) => m.attendanceStatus === 'not_marked').length;

  const staffPresentCount = staffList.filter((s) => s.attendanceStatus === 'present').length;
  const staffAbsentCount = staffList.filter((s) => s.attendanceStatus === 'absent').length;
  const staffUnmarkedCount = staffList.filter((s) => s.attendanceStatus === 'not_marked').length;

  const presentCount = activeTab === 'members' ? memberPresentCount : staffPresentCount;
  const absentCount = activeTab === 'members' ? memberAbsentCount : staffAbsentCount;
  const unmarkedCount = activeTab === 'members' ? memberUnmarkedCount : staffUnmarkedCount;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Manage Attendance
            </CardTitle>
            <CardDescription>
              Mark daily attendance for gym members and staff. Select a date to view and update attendance.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={autoMarkAbsent}
              disabled={isAutoUpdating || isFutureDate || unmarkedCount === 0}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isAutoUpdating ? 'animate-spin' : ''}`} />
              Auto-mark Absent ({unmarkedCount})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Filter Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'members' | 'staff')}>
          <TabsList className="mb-4">
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2">
              <UsersRound className="h-4 w-4" />
              Staff
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              {isFutureDate && (
                <p className="text-sm text-destructive">Cannot mark attendance for future dates</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={activeTab === 'members' ? 'Search by name or phone...' : 'Search by name, email, or phone...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Summary</Label>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="default" className="bg-green-500">
                  <UserCheck className="mr-1 h-3 w-3" />
                  Present: {presentCount}
                </Badge>
                <Badge variant="destructive">
                  <UserX className="mr-1 h-3 w-3" />
                  Absent: {absentCount}
                </Badge>
                <Badge variant="secondary">
                  Unmarked: {unmarkedCount}
                </Badge>
              </div>
            </div>
          </div>

          {/* Members Tab Content */}
          <TabsContent value="members" className="mt-0">
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Membership Period</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading members...
                      </TableCell>
                    </TableRow>
                  ) : filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No members with active memberships found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => {
                      const membershipStart = parseISO(member.membershipStartDate);
                      const selectedDateObj = parseISO(selectedDate);
                      const isBeforeMembership = selectedDateObj < startOfDay(membershipStart);
                      const canMarkAttendance = !isFutureDate && !isBeforeMembership;

                      return (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.email || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{member.phone}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{format(parseISO(member.membershipStartDate), 'dd MMM yyyy')}</p>
                              <p className="text-muted-foreground">
                                to {format(parseISO(member.membershipEndDate), 'dd MMM yyyy')}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {isBeforeMembership ? (
                              <Badge variant="outline" className="text-muted-foreground">
                                N/A
                              </Badge>
                            ) : member.attendanceStatus === 'present' ? (
                              <Badge className="bg-green-500">
                                <Check className="mr-1 h-3 w-3" />
                                Present
                              </Badge>
                            ) : member.attendanceStatus === 'absent' ? (
                              <Badge variant="destructive">
                                <X className="mr-1 h-3 w-3" />
                                Absent
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Not Marked</Badge>
                            )}
                            {member.notes && (
                              <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate" title={member.notes}>
                                {member.notes}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant={member.attendanceStatus === 'present' ? 'default' : 'outline'}
                                className={member.attendanceStatus === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}
                                disabled={!canMarkAttendance || isSaving === member.id}
                                onClick={() => markMemberAttendance(member.id, 'present')}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={member.attendanceStatus === 'absent' ? 'destructive' : 'outline'}
                                disabled={!canMarkAttendance || isSaving === member.id}
                                onClick={() => markMemberAttendance(member.id, 'absent')}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Staff Tab Content */}
          <TabsContent value="staff" className="mt-0">
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading staff...
                      </TableCell>
                    </TableRow>
                  ) : filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No active staff found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((staff) => {
                      const joiningDate = staff.joiningDate ? parseISO(staff.joiningDate) : null;
                      const selectedDateObj = parseISO(selectedDate);
                      const isBeforeJoining = joiningDate ? selectedDateObj < startOfDay(joiningDate) : false;
                      const canMarkAttendance = !isFutureDate && !isBeforeJoining;

                      return (
                        <TableRow key={staff.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{staff.name}</p>
                              <p className="text-sm text-muted-foreground">{staff.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{staff.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{staff.role}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {isBeforeJoining ? (
                              <Badge variant="outline" className="text-muted-foreground">
                                N/A
                              </Badge>
                            ) : staff.attendanceStatus === 'present' ? (
                              <Badge className="bg-green-500">
                                <Check className="mr-1 h-3 w-3" />
                                Present
                              </Badge>
                            ) : staff.attendanceStatus === 'absent' ? (
                              <Badge variant="destructive">
                                <X className="mr-1 h-3 w-3" />
                                Absent
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Not Marked</Badge>
                            )}
                            {staff.notes && (
                              <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate" title={staff.notes}>
                                {staff.notes}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant={staff.attendanceStatus === 'present' ? 'default' : 'outline'}
                                className={staff.attendanceStatus === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}
                                disabled={!canMarkAttendance || isSaving === staff.id}
                                onClick={() => markStaffAttendance(staff.id, 'present')}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={staff.attendanceStatus === 'absent' ? 'destructive' : 'outline'}
                                disabled={!canMarkAttendance || isSaving === staff.id}
                                onClick={() => markStaffAttendance(staff.id, 'absent')}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
