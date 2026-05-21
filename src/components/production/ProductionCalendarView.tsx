/**
 * ProductionCalendarView Component
 * 
 * Provides a calendar-based view of production items using react-big-calendar.
 * Shows items on their scheduled production dates with color coding by priority.
 * 
 * Features:
 * - Month/week/day view switching
 * - Color-coded events by priority (critical=red, high=orange, normal=blue, low=gray)
 * - "Today" button to jump to current date
 * - Integration with existing filter system
 * - Click events to view item details
 */

import { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View, EventWrapperProps } from 'react-big-calendar';
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Package, User, Tag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ProductionQueueItem } from '@/types/production';
import { useToast } from '@/hooks/use-toast';
import { useRescheduleProduction } from '@/hooks/admin/useProductionActions';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './ProductionCalendarView.css';

// Create DnD Calendar with proper typing
const DnDCalendar = withDragAndDrop<CalendarEvent, object>(Calendar);

// Configure date-fns localizer for react-big-calendar
const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales,
});

interface ProductionCalendarViewProps {
  items: ProductionQueueItem[];
  isLoading?: boolean;
  onItemClick: (item: ProductionQueueItem) => void;
}

// Calendar event type
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ProductionQueueItem;
  priority: string;
}

// Priority color mapping
const PRIORITY_COLORS = {
  critical: {
    bg: '#ef4444',
    text: '#ffffff',
    border: '#dc2626',
  },
  high: {
    bg: '#f97316',
    text: '#ffffff',
    border: '#ea580c',
  },
  normal: {
    bg: '#3b82f6',
    text: '#ffffff',
    border: '#2563eb',
  },
  low: {
    bg: '#6b7280',
    text: '#ffffff',
    border: '#4b5563',
  },
};

export function ProductionCalendarView({
  items,
  isLoading = false,
  onItemClick,
}: ProductionCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const { toast } = useToast();
  const rescheduleProductionMutation = useRescheduleProduction();

  // Transform production items into calendar events
  const events = useMemo<CalendarEvent[]>(() => {
    return items
      .filter(item => item.scheduledProductionDate)
      .map(item => {
        const date = new Date(item.scheduledProductionDate!);
        
        return {
          id: item.id,
          title: `${item.customerName} - ${item.collectionName}`,
          start: date,
          end: date,
          resource: item,
          priority: item.priority,
        };
      });
  }, [items]);

  // Get items for selected date
  const itemsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return items.filter(item => {
      if (!item.scheduledProductionDate) return false;
      return isSameDay(new Date(item.scheduledProductionDate), selectedDate);
    });
  }, [items, selectedDate]);

  // Handle event click
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    onItemClick(event.resource);
  }, [onItemClick]);

  // Handle slot (day) click
  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    setSelectedDate(slotInfo.start);
    setIsDayModalOpen(true);
  }, []);

  // Handle event drop (drag and drop to reschedule)
  const handleEventDrop = useCallback(async (args: EventInteractionArgs<CalendarEvent>) => {
    const { event, start } = args;
    setIsRescheduling(true);
    
    try {
      // Update the scheduled production date
      await rescheduleProductionMutation.mutateAsync({
        itemId: event.id,
        date: format(start, 'yyyy-MM-dd'),
      });
      
      toast({
        title: 'Item reagendado',
        description: `${event.resource.customerName} foi reagendado para ${format(start, 'dd/MM/yyyy', { locale: ptBR })}`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao reagendar',
        description: error instanceof Error ? error.message : 'Não foi possível reagendar o item',
        variant: 'destructive',
      });
    } finally {
      setIsRescheduling(false);
    }
  }, [rescheduleProductionMutation, toast]);

  // Handle view change
  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  // Handle date navigation
  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };

  // Custom event style getter
  const eventStyleGetter = (event: CalendarEvent) => {
    const colors = PRIORITY_COLORS[event.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.normal;
    
    return {
      style: {
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderRadius: '4px',
        padding: '2px 4px',
        fontSize: '0.875rem',
        fontWeight: '500',
        cursor: isRescheduling ? 'wait' : 'pointer',
      },
    };
  };

  // Custom event wrapper for tooltips
  const EventWrapper = (props: EventWrapperProps<CalendarEvent>) => {
    const { event, children } = props as EventWrapperProps<CalendarEvent> & { children: React.ReactNode };
    const item = event.resource;
    
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div>{children}</div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="font-semibold">{item.customerName}</div>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  <span>{item.collectionName}</span>
                </div>
                {item.characterName && (
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span>{item.characterName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  <span className="capitalize">{item.currentStage.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <Badge variant={
                    item.priority === 'critical' ? 'destructive' :
                    item.priority === 'high' ? 'default' :
                    'secondary'
                  } className="text-xs">
                    {item.priority === 'critical' ? 'Crítico' :
                     item.priority === 'high' ? 'Alto' :
                     item.priority === 'normal' ? 'Normal' : 'Baixo'}
                  </Badge>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Custom toolbar component
  interface CalendarToolbarProps {
    date: Date;
    view: View;
    onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
    onView: (view: View) => void;
  }

  const CustomToolbar = (toolbar: CalendarToolbarProps) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToToday = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = toolbar.date;
      
      if (toolbar.view === 'month') {
        return format(date, 'MMMM yyyy', { locale: ptBR });
      } else if (toolbar.view === 'week') {
        const start = startOfWeek(date, { locale: ptBR });
        return `Semana de ${format(start, 'dd MMM yyyy', { locale: ptBR })}`;
      } else {
        return format(date, 'dd MMMM yyyy', { locale: ptBR });
      }
    };

    return (
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToBack}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
          >
            Próximo
          </Button>
        </div>

        {/* Current date label */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold capitalize">{label()}</h2>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-2">
          <Button
            variant={toolbar.view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toolbar.onView('month')}
          >
            Mês
          </Button>
          <Button
            variant={toolbar.view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toolbar.onView('week')}
          >
            Semana
          </Button>
          <Button
            variant={toolbar.view === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toolbar.onView('day')}
          >
            Dia
          </Button>
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">Carregando calendário...</div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-12">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum item agendado</h3>
            <p className="text-muted-foreground">
              Não há itens de produção com datas agendadas que correspondam aos filtros aplicados
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Legenda:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: PRIORITY_COLORS.critical.bg }} />
              <span className="text-sm">Crítico</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: PRIORITY_COLORS.high.bg }} />
              <span className="text-sm">Alto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: PRIORITY_COLORS.normal.bg }} />
              <span className="text-sm">Normal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: PRIORITY_COLORS.low.bg }} />
              <span className="text-sm">Baixo</span>
            </div>
            <div className="ml-auto">
              <Badge variant="secondary">
                {events.length} {events.length === 1 ? 'item agendado' : 'itens agendados'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="production-calendar-container">
            <DnDCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 700 }}
              date={currentDate}
              view={currentView}
              onNavigate={handleNavigate}
              onView={handleViewChange}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onEventDrop={handleEventDrop}
              eventPropGetter={eventStyleGetter}
              selectable
              draggableAccessor={() => !isRescheduling}
              components={{
                toolbar: CustomToolbar,
                eventWrapper: EventWrapper,
              }}
              messages={{
                today: 'Hoje',
                previous: 'Anterior',
                next: 'Próximo',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia',
                agenda: 'Agenda',
                date: 'Data',
                time: 'Hora',
                event: 'Evento',
                noEventsInRange: 'Não há eventos neste período',
                showMore: (total) => `+${total} mais`,
              }}
              culture="pt-BR"
            />
          </div>
        </CardContent>
      </Card>

      {/* Day Items Modal */}
      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="day-items-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Itens agendados para {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription id="day-items-description">
              Visualize e gerencie todos os itens de produção agendados para este dia
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {itemsForSelectedDate.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum item agendado para este dia</p>
              </div>
            ) : (
              itemsForSelectedDate.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => {
                    setIsDayModalOpen(false);
                    onItemClick(item);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{item.customerName}</h4>
                          <Badge
                            variant={
                              item.priority === 'critical' ? 'destructive' :
                              item.priority === 'high' ? 'default' :
                              'secondary'
                            }
                          >
                            {item.priority === 'critical' ? 'Crítico' :
                             item.priority === 'high' ? 'Alto' :
                             item.priority === 'normal' ? 'Normal' : 'Baixo'}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span>{item.collectionName}</span>
                          </div>
                          
                          {item.characterName && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{item.characterName}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            <span className="capitalize">
                              {item.currentStage.replace('_', ' ')}
                            </span>
                          </div>
                          
                          {item.assignedToName && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Atribuído a: {item.assignedToName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDayModalOpen(false);
                          onItemClick(item);
                        }}
                      >
                        Ver detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
