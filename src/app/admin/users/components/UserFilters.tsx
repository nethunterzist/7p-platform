'use client';

import { useState, useEffect } from 'react';
import { FilterState } from '../page';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  ChevronDown,
  UserCheck,
  Users,
  Crown,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface UserFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  totalUsers: number;
}

export default function UserFilters({ 
  filters, 
  onFilterChange, 
  totalUsers 
}: UserFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [search, setSearch] = useState(filters.search);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: filters.dateRange.start ? new Date(filters.dateRange.start) : undefined,
    to: filters.dateRange.end ? new Date(filters.dateRange.end) : undefined,
  });
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ ...filters, search });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [search]);
  
  
  const handleStatusChange = (value: string) => {
    onFilterChange({ 
      ...filters, 
      status: value as FilterState['status'] 
    });
  };
  
  const handleSubscriptionChange = (value: string) => {
    onFilterChange({ 
      ...filters, 
      subscription: value as FilterState['subscription'] 
    });
  };

  const handlePackageChange = (value: string) => {
    onFilterChange({ 
      ...filters, 
      package: value === 'all' ? undefined : value as 'ppc' | 'full-mentorluk' | 'urun-arastirma'
    });
  };
  
  const handleDateFieldChange = (value: string) => {
    onFilterChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        field: value as 'created_at' | 'last_login'
      }
    });
  };
  
  const handleDateRangeSelect = () => {
    if (dateRange.from && dateRange.to) {
      onFilterChange({
        ...filters,
        dateRange: {
          ...filters.dateRange,
          start: dateRange.from.toISOString(),
          end: dateRange.to.toISOString()
        }
      });
    }
  };
  
  const clearDateRange = () => {
    setDateRange({ from: undefined, to: undefined });
    onFilterChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        start: '',
        end: ''
      }
    });
  };
  
  const clearAllFilters = () => {
    setSearch('');
    setDateRange({ from: undefined, to: undefined });
    onFilterChange({
      search: '',
      status: 'all',
      subscription: 'all',
      package: undefined,
      dateRange: {
        start: '',
        end: '',
        field: 'created_at'
      }
    });
  };
  
  const activeFiltersCount = [
    filters.search,
    filters.status !== 'all',
    filters.subscription !== 'all',
    filters.package,
    filters.dateRange.start && filters.dateRange.end
  ].filter(Boolean).length;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 space-y-4">
      {/* Primary Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="İsim, email veya kullanıcı adı ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="sm:w-auto"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtreler
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 bg-blue-100 text-blue-700">
              {activeFiltersCount}
            </Badge>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 ml-2 transition-transform",
            isExpanded && "rotate-180"
          )} />
        </Button>
        
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
          >
            <X className="h-4 w-4 mr-2" />
            Temizle
          </Button>
        )}
      </div>
      
      {/* Expanded Filters */}
      {isExpanded && (
        <div className="pt-4 border-t space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center">
                <UserCheck className="h-4 w-4 mr-2" />
                Durum
              </Label>
              <Select value={filters.status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Subscription Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center">
                <Crown className="h-4 w-4 mr-2" />
                Abonelik
              </Label>
              <Select value={filters.subscription} onValueChange={handleSubscriptionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Abonelik tipi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="free">Kayıtlı Üye</SelectItem>
                  <SelectItem value="premium">Premium Üye</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Package Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Satın Alınan Paket
              </Label>
              <Select value={filters.package || 'all'} onValueChange={handlePackageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Paket seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="ppc">Amazon PPC</SelectItem>
                  <SelectItem value="full-mentorluk">Amazon Full Mentorluk</SelectItem>
                  <SelectItem value="urun-arastirma">Amazon Ürün Araştırma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Date Range Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Tarih Aralığı
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal flex-1",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      format(dateRange.from, "dd MMMM yyyy", { locale: tr })
                    ) : (
                      "Kayıt başlangıç tarihi"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                    locale={tr}
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal flex-1",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? (
                      format(dateRange.to, "dd MMMM yyyy", { locale: tr })
                    ) : (
                      "Satın Alma Tarihi"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                    locale={tr}
                    disabled={(date) => dateRange.from ? date < dateRange.from : false}
                  />
                </PopoverContent>
              </Popover>
              
              {dateRange.from && dateRange.to && (
                <Button onClick={handleDateRangeSelect} className="sm:w-auto">
                  Uygula
                </Button>
              )}
              
              {(dateRange.from || dateRange.to) && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={clearDateRange}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Results Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {totalUsers === 0 ? (
          <span>Sonuç bulunamadı</span>
        ) : (
          <span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {totalUsers}
            </span> kullanıcı bulundu
          </span>
        )}
      </div>
    </div>
  );
}