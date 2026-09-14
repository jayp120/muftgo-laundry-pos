import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRevenueSummary } from '@/hooks/useRevenue';
import { useStore } from '@/contexts/StoreContext';
import { CalendarIcon, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { enIN as localeEnIN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SectionLoading } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';

type DateRangePreset = 'today' | '7days' | '1month' | '6months' | 'custom';

const dateRangePresets = [
  { value: 'today' as DateRangePreset, label: 'Today' },
  { value: '7days' as DateRangePreset, label: '7 days' },
  { value: '1month' as DateRangePreset, label: '1 month' },
  { value: '6months' as DateRangePreset, label: '6 months' },
  { value: 'custom' as DateRangePreset, label: 'Select dates' },
];

const categoryLabels: Record<string, string> = {
  detergent: 'Detergent',
  gas: 'Gas',
  electricity: 'Electricity',
  promo: 'Promo',
  maintenance: 'Maintenance',
  other: 'Others',
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  qris: 'UPI',
  transfer: 'Transfer',
};

const getDateRange = (preset: DateRangePreset, customStart?: Date, customEnd?: Date) => {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return {
        start: startOfDay(now).toISOString(),
        end: endOfDay(now).toISOString(),
      };
    case '7days':
      return {
        start: startOfDay(subDays(now, 6)).toISOString(),
        end: endOfDay(now).toISOString(),
      };
    case '1month':
      return {
        start: startOfDay(subDays(now, 29)).toISOString(),
        end: endOfDay(now).toISOString(),
      };
    case '6months':
      return {
        start: startOfDay(subDays(now, 179)).toISOString(),
        end: endOfDay(now).toISOString(),
      };
    case 'custom':
      if (customStart && customEnd) {
        return {
          start: startOfDay(customStart).toISOString(),
          end: endOfDay(customEnd).toISOString(),
        };
      }
      return {
        start: startOfDay(now).toISOString(),
        end: endOfDay(now).toISOString(),
      };
    default:
      return {
        start: startOfDay(now).toISOString(),
        end: endOfDay(now).toISOString(),
      };
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const RevenueReportPage = () => {
  usePageTitle('Revenue Report');

  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('today');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const dateRange = getDateRange(selectedPreset, customStartDate, customEndDate);
  const { data: revenueSummary, isLoading } = useRevenueSummary(dateRange.start, dateRange.end);
  const { currentStore } = useStore();
  const [isExporting, setIsExporting] = useState(false);

  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);
    }
  };

  // Quote every cell (₹ amounts contain commas) and prefix a BOM so Excel
  // renders ₹ correctly instead of "â‚¹".
  const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

  const buildRevenueCsv = () => {
    if (!revenueSummary) return '';
    const period = `${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: localeEnIN })} - ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: localeEnIN })}`;
    const rows: (string | number)[][] = [
      ['MuftGo Laundry POS - Revenue Report'],
      ['Store', currentStore?.store_name || '-'],
      ['Period', period],
      ['Generated on', format(new Date(), 'dd/MM/yyyy hh:mm a', { locale: localeEnIN })],
      ['All amounts in INR (₹)'],
      [],
      ['Summary', 'Amount (₹)'],
      ['Gross Revenue', Math.round(revenueSummary.grossProfit)],
      [],
      ['Payments by Method', 'Amount (₹)'],
      ...Object.entries(paymentMethodLabels).map(([key, label]) => [
        `${label} Payments`,
        Math.round((revenueSummary.paymentMethods as any)?.[key] || 0),
      ]),
      [],
      ['Deductions (Expenses)', 'Amount (₹)'],
      ...Object.entries(categoryLabels).map(([key, label]) => [
        label,
        Math.round((revenueSummary.deductions as any)?.[key] || 0),
      ]),
      [],
      ['Net Revenue', Math.round(revenueSummary.netProfit)],
    ];
    return '\ufeff' + rows.map((row) => row.map(csvCell).join(',')).join('\n');
  };

  const handleExportCSV = async () => {
    if (!revenueSummary || isExporting) return;
    setIsExporting(true);
    try {
      const csv = buildRevenueCsv();
      const fileName = `revenue-report-${currentStore?.store_name?.replace(/[^\w]+/g, '-').toLowerCase() || 'store'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      const file = new File([csv], fileName, { type: 'text/csv;charset=utf-8' });

      // Native/APK path: system share sheet (WhatsApp, Gmail, Drive...).
      // Anchor downloads silently fail inside the Capacitor WebView, which is
      // why "export was not working" in the APK.
      const nav: any = navigator;
      if (nav?.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: 'Revenue Report',
          text: `${currentStore?.store_name || 'Store'} revenue report`,
        });
        toast.success('Report shared');
        return;
      }

      // Desktop web path: direct download.
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success('Report downloaded');
    } catch (error: any) {
      // User dismissing the share sheet throws AbortError - not a failure.
      if (error?.name !== 'AbortError') {
        console.error('Error exporting report:', error);
        toast.error('Could not export report. Please try again.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const displayDateRange = () => {
    if (selectedPreset === 'custom' && customStartDate && customEndDate) {
      return `${format(customStartDate, 'dd/MM/yyyy', { locale: localeEnIN })} - ${format(customEndDate, 'dd/MM/yyyy', { locale: localeEnIN })}`;
    }
    return `${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: localeEnIN })} - ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: localeEnIN })}`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Revenue</h1>
          <p className="text-gray-500 mt-1">Summary of business income and deductions.</p>
        </div>

        {/* Date Range Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {dateRangePresets.map((preset) => (
            <Button
              key={preset.value}
              variant={selectedPreset === preset.value ? 'default' : 'outline'}
              onClick={() => handlePresetChange(preset.value)}
              className={cn(
                'rounded-full',
                selectedPreset === preset.value
                  ? 'bg-green-500 hover:bg-green-600 text-white border-green-500'
                  : 'bg-white hover:bg-gray-50'
              )}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        {selectedPreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3">
            <Popover open={showStartDatePicker} onOpenChange={setShowStartDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'justify-start text-left font-normal',
                    !customStartDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customStartDate ? format(customStartDate, 'dd/MM/yyyy', { locale: localeEnIN }) : 'Select start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={(date) => {
                    setCustomStartDate(date);
                    setShowStartDatePicker(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-gray-500">-</span>

            <Popover open={showEndDatePicker} onOpenChange={setShowEndDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'justify-start text-left font-normal',
                    !customEndDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customEndDate ? format(customEndDate, 'dd/MM/yyyy', { locale: localeEnIN }) : 'Select end date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={(date) => {
                    setCustomEndDate(date);
                    setShowEndDatePicker(false);
                  }}
                  disabled={(date) => customStartDate ? date < customStartDate : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Date Range Display */}
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">Monday - Monday</p>
          <p className="text-lg font-medium text-gray-700">{displayDateRange()}</p>
        </div>
      </div>

      {isLoading ? (
        <SectionLoading text="Loading data..." />
      ) : (
        <>
          {/* Gross Profit Section */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-green-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                Gross Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Object.entries(revenueSummary?.paymentMethods || {}).map(([method, amount]) => (
                  <div key={method} className="flex justify-between items-center">
                    <span className="text-gray-600">{paymentMethodLabels[method]} Payments</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Deductions Section */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-red-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                Deductions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Object.entries(revenueSummary?.deductions || {}).map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-gray-600">{categoryLabels[category]}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Net Profit Section */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">Net Revenue</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(revenueSummary?.netProfit || 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleExportCSV}
              disabled={isExporting || !revenueSummary}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isExporting ? (
                <>Exporting...</>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
