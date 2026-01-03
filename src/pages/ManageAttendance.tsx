import ManageAttendanceComponent from '@/components/reports/ManageAttendance';

export default function ManageAttendance() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Manage Attendance</h1>
        <p className="text-muted-foreground">Mark daily attendance for gym members</p>
      </div>
      <ManageAttendanceComponent />
    </div>
  );
}
