import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Member } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, User, Users, UserCheck, UserX, Filter } from 'lucide-react';
import { toast } from 'sonner';
import MemberProfileSheet from '@/components/members/MemberProfileSheet';
import AddMemberDialog from '@/components/members/AddMemberDialog';
import { MembersEmptyState, SearchEmptyState, FilterEmptyState } from '@/components/common/EmptyState';
import { MemberCardSkeleton, GridSkeleton } from '@/components/common/LoadingSkeleton';
import { PageTransition } from '@/components/common/PageTransition';
import { Pagination, InfiniteScrollLoader, InfiniteScrollSentinel } from '@/components/common/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { usePagination } from '@/hooks/usePagination';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { fuzzySearch } from '@/lib/fuzzySearch';
import { useIsMobile } from '@/hooks/use-mobile';

interface MemberWithMembership extends Member {
  memberships?: { status: string; type: string; end_date: string }[];
}

export default function Members() {
  const [members, setMembers] = useState<MemberWithMembership[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const isMobile = useIsMobile();
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*, memberships(status, type, end_date)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch members');
    } else {
      setMembers(data as MemberWithMembership[]);
    }
    setIsLoading(false);
  };

  const getMemberStatus = (member: MemberWithMembership) => {
    const activeMembership = member.memberships?.find((m) => m.status === 'active');
    if (activeMembership) return 'active';
    const expiredMembership = member.memberships?.find((m) => m.status === 'expired');
    if (expiredMembership) return 'expired';
    return 'no_membership';
  };

  // Filter and search with fuzzy matching
  const filteredMembers = useMemo(() => {
    let result = members;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((member) => getMemberStatus(member) === statusFilter);
    }

    // Fuzzy search
    if (debouncedSearch.trim()) {
      result = fuzzySearch(result, debouncedSearch, (member) => [
        member.name,
        member.phone,
        member.email || '',
      ]);
    }

    return result;
  }, [members, statusFilter, debouncedSearch]);

  // Pagination for desktop
  const pagination = usePagination<MemberWithMembership>({
    totalItems: filteredMembers.length,
    initialPageSize: 12,
  });

  // Infinite scroll for mobile
  const infiniteScroll = useInfiniteScroll(filteredMembers, {
    initialItemsPerPage: 12,
    enabled: isMobile,
  });

  // Get items to display based on device
  const displayedMembers = isMobile
    ? infiniteScroll.displayedItems
    : pagination.paginateData(filteredMembers);

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setProfileOpen(true);
  };

  const stats = {
    total: members.length,
    active: members.filter((m) => getMemberStatus(m) === 'active').length,
    expired: members.filter((m) => getMemberStatus(m) === 'expired').length,
    noMembership: members.filter((m) => getMemberStatus(m) === 'no_membership').length,
  };

  // Reset pagination when filters change
  useEffect(() => {
    pagination.setPage(1);
    infiniteScroll.reset();
  }, [debouncedSearch, statusFilter]);

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground">Manage gym members and memberships</p>
        </div>
        <Button className="gradient-primary" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('all')}>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('active')}>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/10">
              <UserCheck className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="text-2xl font-bold text-success">{stats.active}</div>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('expired')}>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <UserX className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
              <p className="text-sm text-muted-foreground">Expired</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('no_membership')}>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.noMembership}</div>
              <p className="text-sm text-muted-foreground">No Plan</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="no_membership">No Plan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {debouncedSearch && (
          <p className="text-sm text-muted-foreground">
            Found {filteredMembers.length} result{filteredMembers.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {isLoading ? (
        <GridSkeleton count={6} SkeletonComponent={MemberCardSkeleton} />
      ) : members.length === 0 ? (
        <MembersEmptyState onAdd={() => setAddOpen(true)} />
      ) : filteredMembers.length === 0 ? (
        search ? (
          <SearchEmptyState searchTerm={search} />
        ) : (
          <FilterEmptyState onClear={() => setStatusFilter('all')} />
        )
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedMembers.map((member) => {
              const status = getMemberStatus(member);
              const activeMembership = member.memberships?.find((m) => m.status === 'active');

              return (
                <Card
                  key={member.id}
                  className="transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                  onClick={() => handleMemberClick(member)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{member.name}</h3>
                        <p className="text-sm text-muted-foreground">{member.phone}</p>
                      </div>
                      <Badge
                        className={
                          status === 'active'
                            ? 'bg-success text-success-foreground'
                            : status === 'expired'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {status === 'active'
                          ? 'Active'
                          : status === 'expired'
                          ? 'Expired'
                          : 'No Plan'}
                      </Badge>
                    </div>
                    {activeMembership && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        {activeMembership.type.replace('_', ' ')} membership
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Infinite scroll for mobile */}
          {isMobile && (
            <>
              <InfiniteScrollSentinel
                sentinelRef={infiniteScroll.sentinelRef}
                hasMore={infiniteScroll.hasMore}
              />
              <InfiniteScrollLoader isLoading={infiniteScroll.isLoading} />
            </>
          )}

          {/* Pagination for desktop */}
          {!isMobile && filteredMembers.length > 12 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={filteredMembers.length}
              hasPreviousPage={pagination.hasPreviousPage}
              hasNextPage={pagination.hasNextPage}
              pageRange={pagination.pageRange}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          )}
        </>
      )}

      <MemberProfileSheet
        member={selectedMember}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onUpdate={fetchMembers}
      />

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchMembers} />
    </PageTransition>
  );
}