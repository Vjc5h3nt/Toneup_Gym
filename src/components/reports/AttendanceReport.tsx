import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays, eachDayOfInterval, isWeekend } from 'date-fns';
import {
  Search,
  Download,
  FileText,
  FileSpreadsheet,
  Users,
  UsersRound,
  Clock,
  Calendar,
  TrendingUp,
  ClipboardCheck,
} from 'lucide-react';
import ManageAttendance from './ManageAttendance';

interface StaffAttendanceData {
  id: string;
  name: string;
  email: string;
  role: string;
  totalDays: number;
  presentDays: number;
  totalHours: number;
  averageHours: number;
  attendance: Array<{
    date: string;
    in_time: string | null;
    out_time: string | null;
    hours_worked: number | null;
  }>;
}

interface MemberAttendanceData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  totalVisits: number;
  totalHours: number;
  averageSessionTime: number;
  attendance: Array<{
    date: string;
    check_in_time: string;
    check_out_time: string | null;
    duration: number | null;
  }>;
}

export default function AttendanceReport() {
  const [activeTab, setActiveTab] = useState('staff');
  const [staffData, setStaffData] = useState<StaffAttendanceData[]>([]);
  const [memberData, setMemberData] = useState<MemberAttendanceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return format(d, 'yyyy-MM-dd');
  });
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [memberList, setMemberList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchStaffList();
    fetchMemberList();
  }, []);

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffAttendance();
    } else {
      fetchMemberAttendance();
    }
  }, [activeTab, dateFrom, dateTo, selectedStaff, selectedMember]);

  const fetchStaffList = async () => {
    const { data } = await supabase
      .from('staff')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (data) setStaffList(data);
  };

  const fetchMemberList = async () => {
    const { data } = await supabase
      .from('members')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (data) setMemberList(data);
  };

  const fetchStaffAttendance = async () => {
    setIsLoading(true);
    try {
      let staffQuery = supabase.from('staff').select('id, name, email, role').eq('is_active', true);
      if (selectedStaff !== 'all') {
        staffQuery = staffQuery.eq('id', selectedStaff);
      }
      const { data: staffMembers } = await staffQuery;

      if (!staffMembers) {
        setStaffData([]);
        return;
      }

      const attendancePromises = staffMembers.map(async (s) => {
        const { data: attendance } = await supabase
          .from('staff_attendance')
          .select('*')
          .eq('staff_id', s.id)
          .gte('date', dateFrom)
          .lte('date', dateTo)
          .order('date', { ascending: false });

        const totalHours = (attendance || []).reduce((sum, a) => sum + (a.hours_worked || 0), 0);
        const presentDays = (attendance || []).filter((a) => a.in_time).length;
        const totalDays = differenceInDays(parseISO(dateTo), parseISO(dateFrom)) + 1;

        return {
          id: s.id,
          name: s.name,
          email: s.email,
          role: s.role,
          totalDays,
          presentDays,
          totalHours: Math.round(totalHours * 100) / 100,
          averageHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 100) / 100 : 0,
          attendance: (attendance || []).map((a) => ({
            date: a.date,
            in_time: a.in_time,
            out_time: a.out_time,
            hours_worked: a.hours_worked,
          })),
        };
      });

      const results = await Promise.all(attendancePromises);
      setStaffData(results);
    } catch (error) {
      console.error('Error fetching staff attendance:', error);
      toast.error('Failed to fetch staff attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMemberAttendance = async () => {
    setIsLoading(true);
    try {
      let memberQuery = supabase.from('members').select('id, name, phone, email').eq('is_active', true);
      if (selectedMember !== 'all') {
        memberQuery = memberQuery.eq('id', selectedMember);
      }
      const { data: members } = await memberQuery;

      if (!members) {
        setMemberData([]);
        return;
      }

      const attendancePromises = members.map(async (m) => {
        const { data: attendance } = await supabase
          .from('member_attendance')
          .select('*')
          .eq('member_id', m.id)
          .gte('check_in_time', `${dateFrom}T00:00:00`)
          .lte('check_in_time', `${dateTo}T23:59:59`)
          .order('check_in_time', { ascending: false });

        let totalMinutes = 0;
        const visits = (attendance || []).map((a) => {
          let duration = null;
          if (a.check_out_time) {
            const checkIn = new Date(a.check_in_time);
            const checkOut = new Date(a.check_out_time);
            duration = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);
            totalMinutes += duration;
          }
          return {
            date: format(parseISO(a.check_in_time), 'yyyy-MM-dd'),
            check_in_time: a.check_in_time,
            check_out_time: a.check_out_time,
            duration,
          };
        });

        return {
          id: m.id,
          name: m.name,
          phone: m.phone,
          email: m.email,
          totalVisits: visits.length,
          totalHours: Math.round((totalMinutes / 60) * 100) / 100,
          averageSessionTime: visits.length > 0 ? Math.round(totalMinutes / visits.length) : 0,
          attendance: visits,
        };
      });

      const results = await Promise.all(attendancePromises);
      setMemberData(results.filter((m) => m.totalVisits > 0 || selectedMember !== 'all'));
    } catch (error) {
      console.error('Error fetching member attendance:', error);
      toast.error('Failed to fetch member attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStaffData = staffData.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMemberData = memberData.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone.includes(searchQuery)
  );

  const exportToCSV = (type: 'staff' | 'member') => {
    const data = type === 'staff' ? filteredStaffData : filteredMemberData;
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Header
    csvContent += 'Toneup Gym - Attendance Report\n';
    csvContent += `Report Type: ${type === 'staff' ? 'Staff' : 'Member'} Attendance\n`;
    csvContent += `Duration: ${format(parseISO(dateFrom), 'PPP')} to ${format(parseISO(dateTo), 'PPP')}\n`;
    csvContent += `Generated: ${format(new Date(), 'PPpp')}\n\n`;

    if (type === 'staff') {
      csvContent += 'Name,Email,Role,Working Days,Present Days,Total Hours,Average Hours/Day\n';
      (data as StaffAttendanceData[]).forEach((s) => {
        csvContent += `${s.name},${s.email},${s.role},${s.totalDays},${s.presentDays},${s.totalHours},${s.averageHours}\n`;
      });
    } else {
      csvContent += 'Name,Phone,Email,Total Visits,Total Hours,Average Session (min)\n';
      (data as MemberAttendanceData[]).forEach((m) => {
        csvContent += `${m.name},${m.phone},${m.email || '-'},${m.totalVisits},${m.totalHours},${m.averageSessionTime}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `toneup-${type}-attendance-${dateFrom}-to-${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully');
  };

  const exportToPDF = (type: 'staff' | 'member') => {
    const data = type === 'staff' ? filteredStaffData : filteredMemberData;
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export PDF');
      return;
    }

    let tableRows = '';
    if (type === 'staff') {
      tableRows = `
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Name</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Email</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Role</th>
          <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Working Days</th>
          <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Present Days</th>
          <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Total Hours</th>
          <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Avg Hours/Day</th>
        </tr>
      `;
      (data as StaffAttendanceData[]).forEach((s) => {
        tableRows += `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>${s.name}</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${s.email}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-transform: capitalize;">${s.role}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${s.totalDays}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${s.presentDays}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${s.totalHours}h</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${s.averageHours}h</td>
          </tr>
        `;
      });
    } else {
      tableRows = `
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Name</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Phone</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Email</th>
          <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Total Visits</th>
          <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Total Hours</th>
          <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Avg Session</th>
        </tr>
      `;
      (data as MemberAttendanceData[]).forEach((m) => {
        tableRows += `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>${m.name}</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${m.phone}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${m.email || '-'}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${m.totalVisits}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${m.totalHours}h</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${m.averageSessionTime}min</td>
          </tr>
        `;
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Toneup Gym - Attendance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            h1 { color: #1a1a2e; margin-bottom: 5px; }
            h2 { color: #666; font-weight: normal; margin-top: 0; }
            .meta { margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <h1>Toneup Gym</h1>
          <h2>${type === 'staff' ? 'Staff' : 'Member'} Attendance Report</h2>
          <div class="meta">
            <p><strong>Duration:</strong> ${format(parseISO(dateFrom), 'PPP')} to ${format(parseISO(dateTo), 'PPP')}</p>
            <p><strong>Generated:</strong> ${format(new Date(), 'PPpp')}</p>
            <p><strong>Total Records:</strong> ${data.length}</p>
          </div>
          <table>${tableRows}</table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    toast.success('PDF opened for printing');
  };

  const totalStaffHours = filteredStaffData.reduce((sum, s) => sum + s.totalHours, 0);
  const totalStaffPresent = filteredStaffData.reduce((sum, s) => sum + s.presentDays, 0);
  const totalMemberVisits = filteredMemberData.reduce((sum, m) => sum + m.totalVisits, 0);
  const totalMemberHours = filteredMemberData.reduce((sum, m) => sum + m.totalHours, 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{activeTab === 'staff' ? 'Staff Member' : 'Member'}</Label>
              {activeTab === 'staff' ? (
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {memberList.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {activeTab === 'staff' ? (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <UsersRound className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Staff Members</p>
                    <p className="text-2xl font-bold">{filteredStaffData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Present Days</p>
                    <p className="text-2xl font-bold">{totalStaffPresent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold">{Math.round(totalStaffHours)}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Hours/Person</p>
                    <p className="text-2xl font-bold">
                      {filteredStaffData.length > 0
                        ? Math.round(totalStaffHours / filteredStaffData.length)
                        : 0}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Members</p>
                    <p className="text-2xl font-bold">{filteredMemberData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Visits</p>
                    <p className="text-2xl font-bold">{totalMemberVisits}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold">{Math.round(totalMemberHours)}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Visits/Member</p>
                    <p className="text-2xl font-bold">
                      {filteredMemberData.length > 0
                        ? Math.round(totalMemberVisits / filteredMemberData.length)
                        : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabs and Data */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Attendance Details</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(activeTab as 'staff' | 'member')}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToPDF(activeTab as 'staff' | 'member')}
            >
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="staff" className="gap-2">
                <UsersRound className="h-4 w-4" />
                Staff Attendance
              </TabsTrigger>
              <TabsTrigger value="member" className="gap-2">
                <Users className="h-4 w-4" />
                Member Attendance
              </TabsTrigger>
              <TabsTrigger value="manage" className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Manage Attendance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="staff">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-center">Working Days</TableHead>
                      <TableHead className="text-center">Present Days</TableHead>
                      <TableHead className="text-center">Total Hours</TableHead>
                      <TableHead className="text-center">Avg Hours/Day</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredStaffData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No attendance data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStaffData.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground">{s.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{s.role}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{s.totalDays}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={s.presentDays > 0 ? 'default' : 'secondary'}>
                              {s.presentDays}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">{s.totalHours}h</TableCell>
                          <TableCell className="text-center">{s.averageHours}h</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="member">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Total Visits</TableHead>
                      <TableHead className="text-center">Total Hours</TableHead>
                      <TableHead className="text-center">Avg Session</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredMemberData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No attendance data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMemberData.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell className="text-muted-foreground">{m.phone}</TableCell>
                          <TableCell className="text-muted-foreground">{m.email || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default">{m.totalVisits}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">{m.totalHours}h</TableCell>
                          <TableCell className="text-center">{m.averageSessionTime}min</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="manage">
              <ManageAttendance />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export const getAttendanceExportData = () => async () => {
  // This function is used by the main Reports page export
  return [];
};
