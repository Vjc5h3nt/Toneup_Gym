import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, BarChart3, Users, Target, ClipboardList } from 'lucide-react';
import { RevenueChart, getRevenueExportData } from '@/components/reports/RevenueChart';
import { MemberStatistics, getMemberExportData } from '@/components/reports/MemberStatistics';
import { LeadConversionReport, getLeadExportData } from '@/components/reports/LeadConversionReport';
import AttendanceReport from '@/components/reports/AttendanceReport';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { toast } from 'sonner';

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'revenue');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (tabParam && ['revenue', 'members', 'leads', 'attendance'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (activeTab === 'attendance') {
      // Attendance report has its own export functionality
      toast.info('Use the export buttons in the Attendance tab');
      return;
    }

    setIsExporting(true);
    try {
      let data: Record<string, unknown>[] = [];
      let filename = '';
      let title = '';

      switch (activeTab) {
        case 'revenue':
          data = await getRevenueExportData()();
          filename = `revenue-report-${new Date().toISOString().split('T')[0]}`;
          title = 'Revenue Report';
          break;
        case 'members':
          data = await getMemberExportData()();
          filename = `member-statistics-${new Date().toISOString().split('T')[0]}`;
          title = 'Member Statistics Report';
          break;
        case 'leads':
          data = await getLeadExportData()();
          filename = `lead-conversion-${new Date().toISOString().split('T')[0]}`;
          title = 'Lead Conversion Report';
          break;
      }

      if (data.length === 0) {
        toast.error('No data available to export');
        return;
      }

      if (format === 'csv') {
        exportToCSV(data, filename);
        toast.success('CSV downloaded successfully');
      } else {
        exportToPDF(data, filename, title);
        toast.success('PDF opened for printing');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View detailed analytics and download reports</p>
        </div>
        {activeTab !== 'attendance' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                Download as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Revenue</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Leads</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Attendance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <RevenueChart />
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <MemberStatistics />
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <LeadConversionReport />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
